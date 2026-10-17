"""
Command-line interface for the GitHub ticket automation tool.

This module wires argparse subcommands to the underlying modules and converts
results into exit codes:

    0 — success
    1 — validation, planning, or approval failure
    2 — command-line usage error (handled by argparse)

Implemented commands: ``validate`` (Task 01) and ``plan`` (Task 03). ``apply``
is added by a later task.
"""
from __future__ import annotations

import argparse
import sys
from typing import List, Optional

from scripts.github_tickets import manifest as manifest_module
from scripts.github_tickets import executor as executor_module
from scripts.github_tickets import planner as planner_module
from scripts.github_tickets import report as report_module
from scripts.github_tickets.executor import ExecutionError
from scripts.github_tickets.planner import PlannerError
from scripts.github_tickets.report import ReportError
from scripts.github_tickets.github import (
    GitHubAuthenticationError,
    GitHubClient,
    GitHubError,
    RepoError,
    discover_issues,
)
from scripts.github_tickets.manifest import ManifestLoadError


def build_parser() -> argparse.ArgumentParser:
    """
    Build and return the top-level argument parser.

    Returns:
        An :class:`argparse.ArgumentParser` with ``validate`` and ``plan``
        registered and wired via ``set_defaults``.
    """
    parser = argparse.ArgumentParser(
        prog="github_tickets",
        description="Validate, plan, and apply GitHub ticket packages.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser(
        "validate", help="Validate a ticket package locally (no GitHub access)."
    )
    validate_parser.add_argument(
        "--manifest", required=True, help="Path to the package manifest.json."
    )
    _add_report_dir(validate_parser)
    validate_parser.set_defaults(func=_run_validate)

    plan_parser = subparsers.add_parser(
        "plan",
        help="Reconcile tickets with GitHub (read-only) and emit a plan hash.",
    )
    plan_parser.add_argument(
        "--manifest", required=True, help="Path to the package manifest.json."
    )
    plan_parser.add_argument(
        "--repo", required=False, help="Target repository as owner/repo."
    )
    plan_parser.add_argument(
        "--approve",
        required=False,
        metavar="HASH",
        help="Verify approval against the exact plan SHA-256 hash.",
    )
    plan_parser.add_argument(
        "--output",
        required=False,
        metavar="PATH",
        help="Write the deterministic plan artifact (plan.json).",
    )
    _add_report_dir(plan_parser)
    plan_parser.set_defaults(func=_run_plan)

    apply_parser = subparsers.add_parser(
        "apply",
        help="Execute an approved plan (mutating) after hash verification.",
    )
    apply_parser.add_argument(
        "--manifest", required=True, help="Path to the package manifest.json."
    )
    apply_parser.add_argument(
        "--approve",
        required=True,
        metavar="HASH",
        help="Exact approved plan SHA-256 hash.",
    )
    apply_parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Verify the plan without performing any mutations.",
    )
    _add_report_dir(apply_parser)
    apply_parser.set_defaults(func=_run_apply)

    return parser


def _add_report_dir(parser: argparse.ArgumentParser) -> None:
    """Add a ``--report-dir`` argument to a subcommand parser.

    Args:
        parser: The subcommand parser to extend.
    """
    parser.add_argument(
        "--report-dir",
        required=False,
        metavar="DIR",
        help="Write JSON and Markdown reports into this directory "
             "(recommended: tickets/.generated).",
    )


def _write_reports(directory: str, prefix: str, json_data, markdown: str) -> bool:
    """Write JSON and Markdown reports into ``directory``.

    Args:
        directory: Output directory.
        prefix: File-name prefix (e.g. ``validate``).
        json_data: JSON-serializable report data.
        markdown: Markdown report text.

    Returns:
        ``True`` on success, ``False`` on failure.

    Side effects:
        Creates the output directory if needed and writes two files.
    """
    from pathlib import Path as _Path
    try:
        _Path(directory).mkdir(parents=True, exist_ok=True)
        report_module.write_json_report(
            str(_Path(directory) / f"{prefix}-report.json"), json_data
        )
        report_module.write_markdown_report(
            str(_Path(directory) / f"{prefix}-report.md"), markdown
        )
        return True
    except ReportError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return False


def _write_failure_report(
    directory: str, prefix: str, kind: str, error: str, repo=None, plan_hash=None, secrets=None
) -> None:
    """
    Write a failure report for an aborted command, if requested.

    Args:
        directory: Output directory, or ``None`` to skip.
        prefix: File-name prefix.
        kind: Report kind.
        error: Error message.
        repo: Optional target repository.
        plan_hash: Optional plan hash.
        secrets: Optional list of secret strings to redact.
    """
    if not directory:
        return
    data, markdown = report_module.render_failure_report(
        kind, error, repo=repo, plan_hash=plan_hash, secrets=secrets
    )
    _write_reports(directory, prefix, data, markdown)


def _run_validate(args: argparse.Namespace) -> int:
    """
    Run the ``validate`` subcommand.

    Args:
        args: Parsed arguments; must expose ``args.manifest`` as a string
            path to the manifest file.

    Returns:
        0 when the manifest is valid, 1 when it is invalid or cannot be
        loaded. Errors are printed to stderr so scripts can separate
        diagnostics from the success message on stdout.
    """
    try:
        manifest = manifest_module.load_manifest(args.manifest)
    except ManifestLoadError as exc:
        print(f"error: {exc}", file=sys.stderr)
        _write_failure_report(
            getattr(args, "report_dir", None), "validate", "validate", str(exc)
        )
        return 1

    errors, warnings = manifest_module.validate_manifest(manifest)

    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    for error in errors:
        print(f"error: {error}", file=sys.stderr)

    if getattr(args, "report_dir", None):
        data, markdown = report_module.render_validation_report(
            args.manifest, errors, warnings
        )
        if not _write_reports(args.report_dir, "validate", data, markdown):
            return 1

    if errors:
        print(
            f"Validation failed: {len(errors)} error(s), {len(warnings)} warning(s).",
            file=sys.stderr,
        )
        return 1

    print(
        f"Validation OK: {len(manifest.tickets)} ticket(s), "
        f"{len(warnings)} warning(s)."
    )
    return 0


def _run_plan(args: argparse.Namespace) -> int:
    """
    Run the read-only ``plan`` subcommand.

    Args:
        args: Parsed arguments; must expose ``args.manifest``, ``args.repo``,
            and ``args.approve``.

    Returns:
        0 when a plan is generated successfully (and, when ``--approve`` is
        given, the hash verifies). 1 for invalid configuration, load,
        validation, authentication, discovery, or approval failures.

    Side effects:
        Prints the plan to stdout and diagnostics to stderr. Performs no
        GitHub mutations.
    """
    try:
        manifest = manifest_module.load_manifest(args.manifest)
    except ManifestLoadError as exc:
        print(f"error: {exc}", file=sys.stderr)
        _write_failure_report(
            getattr(args, "report_dir", None), "plan", "plan", str(exc)
        )
        return 1

    errors, warnings = manifest_module.validate_manifest(manifest)
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    for error in errors:
        print(f"error: {error}", file=sys.stderr)
    if errors:
        _write_failure_report(
            getattr(args, "report_dir", None), "plan", "plan", "manifest validation failed"
        )
        return 1

    repo = args.repo if args.repo else manifest.repo
    if args.repo and args.repo != manifest.repo:
        message = f"--repo {args.repo!r} does not match manifest.repo {manifest.repo!r}"
        print(f"error: {message}", file=sys.stderr)
        _write_failure_report(
            getattr(args, "report_dir", None), "plan", "plan", message, repo=repo
        )
        return 1

    try:
        client = GitHubClient(repo)
    except (RepoError, GitHubAuthenticationError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        _write_failure_report(
            getattr(args, "report_dir", None), "plan", "plan", str(exc), repo=repo
        )
        return 1

    try:
        issues = client.list_issues()
        discovery = discover_issues(client, manifest.tickets, issues=issues)
    except GitHubError as exc:
        print(f"error: {exc}", file=sys.stderr)
        _write_failure_report(
            getattr(args, "report_dir", None), "plan", "plan", str(exc),
            repo=repo, secrets=[getattr(client, "token", None)],
        )
        return 1

    plan = planner_module.build_plan(manifest, discovery, repo, issues=issues)
    plan_hash = planner_module.compute_plan_hash(plan)

    if args.output:
        try:
            planner_module.write_plan_artifact(plan, args.output)
            print(f"Plan artifact written: {args.output}")
        except PlannerError as exc:
            print(f"error: {exc}", file=sys.stderr)
            _write_failure_report(
                getattr(args, "report_dir", None), "plan", "plan", str(exc),
                repo=repo, secrets=[getattr(client, "token", None)],
            )
            return 1

    print(f"Target repository: {plan.repo}")
    print(f"Package: {plan.package}")
    print(f"Plan hash (SHA-256): {plan_hash}")
    print()
    print("Actions:")
    for action in plan.actions:
        marker = f"#{action.issue_number}" if action.issue_number is not None else "-"
        basis = action.match_basis or "-"
        print(
            f"  [{action.action:15}] {action.ticket_id:20} "
            f"issue={marker:>8} basis={basis:12} title={action.expected_title!r}"
        )
        print(f"      reason: {action.reason}")
    print()
    if plan.relationships:
        print("Proposed relationships:")
        for rel in plan.relationships:
            print(
                f"  LINK parent={rel.parent_id} (#{rel.parent_issue_number}) "
                f"-> child={rel.child_id} (#{rel.child_issue_number})"
            )
    else:
        print("Proposed relationships: none")
    print()

    blockers = [
        action for action in plan.actions
        if action.action in (planner_module.ACTION_BLOCKED, planner_module.ACTION_REVIEW_REQUIRED)
    ]
    if blockers:
        print(f"Review required / blockers ({len(blockers)}):")
        for action in blockers:
            print(f"  - {action.ticket_id}: {action.reason}")
    else:
        print("Review required / blockers: none")

    if plan.title_candidates:
        print()
        print("Title-based candidates (suggestions only, not verified identity):")
        for candidate in plan.title_candidates:
            print(
                f"  - {candidate.ticket_id}: maybe issue #{candidate.issue_number} "
                f"({candidate.issue_title!r})"
            )

    approval_result = None
    if args.approve:
        approval_result = planner_module.approve_plan(plan, args.approve)
        print()
        print(f"Approval: {'APPROVED' if approval_result.approved else 'REJECTED'}")
        print(f"  reason: {approval_result.reason}")

    if getattr(args, "report_dir", None):
        data, markdown = report_module.render_plan_report(
            plan, plan_hash, approval=approval_result, secrets=[getattr(client, "token", None)]
        )
        if not _write_reports(args.report_dir, "plan", data, markdown):
            return 1

    if approval_result is not None:
        return 0 if approval_result.approved else 1
    return 0


def _run_apply(args: argparse.Namespace) -> int:
    """
    Run the mutating ``apply`` subcommand.

    Args:
        args: Parsed arguments; must expose ``args.manifest``, ``args.approve``,
            and ``args.dry_run``.

    Returns:
        0 on completed (or dry-run verified) execution; 1 for invalid input,
        stale/unsafe plans, conflicts, or partial/failed execution.

    Side effects:
        Performs GitHub mutations only when ``--dry-run`` is not set.
    """
    try:
        manifest = manifest_module.load_manifest(args.manifest)
    except ManifestLoadError as exc:
        print(f"error: {exc}", file=sys.stderr)
        _write_failure_report(
            getattr(args, "report_dir", None), "apply", "apply", str(exc)
        )
        return 1

    errors, warnings = manifest_module.validate_manifest(manifest)
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    for error in errors:
        print(f"error: {error}", file=sys.stderr)
    if errors:
        _write_failure_report(
            getattr(args, "report_dir", None), "apply", "apply", "manifest validation failed"
        )
        return 1

    try:
        client = GitHubClient(manifest.repo)
    except (RepoError, GitHubAuthenticationError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        _write_failure_report(
            getattr(args, "report_dir", None), "apply", "apply", str(exc),
            repo=manifest.repo,
        )
        return 1

    try:
        if args.dry_run:
            plan = executor_module.verify_approved_plan(client, manifest, args.approve)
            print("Dry-run verified. No mutations performed.")
            print(f"Plan hash (SHA-256): {planner_module.compute_plan_hash(plan)}")
            print("Actions:")
            for action in plan.actions:
                print(f"  [{action.action}] {action.ticket_id} -> {action.reason}")
            print("Relationships:")
            for rel in plan.relationships:
                print(
                    f"  LINK {rel.parent_id} (#{rel.parent_issue_number}) "
                    f"-> {rel.child_id} (#{rel.child_issue_number})"
                )
            if getattr(args, "report_dir", None):
                data, markdown = report_module.render_plan_report(
                    plan, planner_module.compute_plan_hash(plan)
                )
                if not _write_reports(args.report_dir, "apply-dry-run", data, markdown):
                    return 1
            return 0

        report = executor_module.execute_plan(client, manifest, args.approve)
    except ExecutionError as exc:
        print(f"error: {report_module.redact(str(exc), [getattr(client, 'token', None)])}", file=sys.stderr)
        _write_failure_report(
            getattr(args, "report_dir", None), "apply", "apply", str(exc),
            repo=manifest.repo, plan_hash=args.approve, secrets=[getattr(client, "token", None)],
        )
        return 1

    print(f"Execution status: {report.status}")
    secrets = [getattr(client, "token", None)]
    for operation in report.operations:
        marker = f"#{operation.issue_number}" if operation.issue_number is not None else "-"
        target = report_module.redact(operation.target, secrets)
        message = report_module.redact(operation.message, secrets)
        print(f"  [{operation.op:8}] {target:24} issue={marker:>8} {message}")
    for error in report.errors:
        print(f"  error: {report_module.redact(error, secrets)}", file=sys.stderr)

    if getattr(args, "report_dir", None):
        data, markdown = report_module.render_execution_report(
            report, manifest.repo, plan_hash=args.approve, secrets=[getattr(client, "token", None)]
        )
        if not _write_reports(args.report_dir, "apply", data, markdown):
            return 1

    return 0 if report.status == executor_module.STATUS_COMPLETED else 1


def main(argv: Optional[List[str]] = None) -> int:
    """
    Parse ``argv`` (or ``sys.argv`` when ``None``) and run the selected command.

    Args:
        argv: Optional explicit argument list. When ``None``, ``sys.argv`` is
            used, which enables direct CLI invocation.

    Returns:
        The selected command's exit code, suitable for ``raise SystemExit``.
    """
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
