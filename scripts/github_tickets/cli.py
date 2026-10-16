"""Command-line interface for the GitHub ticket automation tool.

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
from scripts.github_tickets import planner as planner_module
from scripts.github_tickets.planner import PlannerError
from scripts.github_tickets.github import (
    GitHubAuthenticationError,
    GitHubClient,
    GitHubError,
    RepoError,
    discover_issues,
)
from scripts.github_tickets.manifest import ManifestLoadError


def build_parser() -> argparse.ArgumentParser:
    """Build and return the top-level argument parser.

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
    plan_parser.set_defaults(func=_run_plan)

    return parser


def _run_validate(args: argparse.Namespace) -> int:
    """Run the ``validate`` subcommand.

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
        return 1

    errors, warnings = manifest_module.validate_manifest(manifest)

    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    for error in errors:
        print(f"error: {error}", file=sys.stderr)

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
    """Run the read-only ``plan`` subcommand.

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
        return 1

    errors, warnings = manifest_module.validate_manifest(manifest)
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    for error in errors:
        print(f"error: {error}", file=sys.stderr)
    if errors:
        return 1

    repo = args.repo if args.repo else manifest.repo
    if args.repo and args.repo != manifest.repo:
        print(
            f"error: --repo {args.repo!r} does not match manifest.repo "
            f"{manifest.repo!r}",
            file=sys.stderr,
        )
        return 1

    try:
        client = GitHubClient(repo)
    except (RepoError, GitHubAuthenticationError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    try:
        issues = client.list_issues()
        discovery = discover_issues(client, manifest.tickets, issues=issues)
    except GitHubError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    plan = planner_module.build_plan(manifest, discovery, repo, issues=issues)
    plan_hash = planner_module.compute_plan_hash(plan)

    if args.output:
        try:
            planner_module.write_plan_artifact(plan, args.output)
            print(f"Plan artifact written: {args.output}")
        except PlannerError as exc:
            print(f"error: {exc}", file=sys.stderr)
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

    if args.approve:
        result = planner_module.approve_plan(plan, args.approve)
        print()
        print(f"Approval: {'APPROVED' if result.approved else 'REJECTED'}")
        print(f"  reason: {result.reason}")
        return 0 if result.approved else 1

    return 0


def main(argv: Optional[List[str]] = None) -> int:
    """Parse ``argv`` (or ``sys.argv`` when ``None``) and run the selected command.

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
