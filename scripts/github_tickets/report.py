"""
Deterministic JSON and Markdown reports for the ticket automation CLI.

Reports are generated from confirmed results only: operations are never marked
successful without an API-confirmed response or verified reconciliation.
Report files are written atomically (temp file + hard-link publication) and
never overwrite an existing file. The recommended report directory is the
Git-ignored ``tickets/.generated/``.
"""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from scripts.github_tickets.executor import ExecutionReport
from scripts.github_tickets.planner import Plan, ApprovalResult


class ReportError(Exception):
    """Raised when a report cannot be written."""


def redact(text: str, secrets: Optional[List[str]] = None) -> str:
    """
    Redact any supplied secrets from ``text``.

    Args:
        text: Text to redact.
        secrets: Optional list of secret strings.

    Returns:
        The redacted text.
    """
    return _redact(text, secrets)


def issue_url(repo: str, number: int) -> str:
    """
    Return the canonical GitHub issue URL for a repository and number.

    Args:
        repo: Repository in ``owner/repo`` form.
        number: Issue number.

    Returns:
        The canonical issue URL.
    """
    return f"https://github.com/{repo}/issues/{number}"


def _redact(text: str, secrets: Optional[List[str]]) -> str:
    """
    Replace any supplied secrets with ``***`` in ``text``.

    Args:
        text: Text to redact.
        secrets: Optional list of secret strings.

    Returns:
        The redacted text.
    """
    for secret in secrets or []:
        if secret:
            text = text.replace(secret, "***")
    return text


def _atomic_publish(path: str, text: str) -> None:
    """
    Atomically publish ``text`` to ``path`` without overwriting.

    Writes a temporary file in the destination directory, then hard-links it
    to the final path (which fails if the path already exists) and removes the
    temporary file.

    Args:
        path: Destination path.
        text: File contents.

    Raises:
        ReportError: If the destination exists or publication fails.
    """
    destination = Path(path)
    directory = destination.parent
    try:
        directory.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise ReportError(f"Cannot create report directory {directory}: {exc}") from exc

    temp_path = None
    try:
        fd, temp_name = tempfile.mkstemp(dir=str(directory), suffix=".tmp")
        temp_path = Path(temp_name)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
        try:
            os.link(temp_name, str(destination))
        except FileExistsError as exc:
            raise ReportError(f"Refusing to overwrite existing report: {destination}") from exc
        except OSError as exc:
            raise ReportError(f"Cannot publish report {destination}: {exc}") from exc
    finally:
        if temp_path is not None:
            try:
                temp_path.unlink()
            except OSError:
                pass


def write_json_report(path: str, data: Dict[str, Any]) -> None:
    """
    Write a JSON report atomically without overwriting.

    Args:
        path: Destination path.
        data: JSON-serializable report dictionary.

    Raises:
        ReportError: If the destination exists or cannot be written.
    """
    _atomic_publish(path, json.dumps(data, sort_keys=True, indent=2) + "\n")


def write_markdown_report(path: str, text: str) -> None:
    """
    Write a Markdown report atomically without overwriting.

    Args:
        path: Destination path.
        text: Markdown report text.

    Raises:
        ReportError: If the destination exists or cannot be written.
    """
    _atomic_publish(path, text)


def render_validation_report(
    manifest: str, errors: List[str], warnings: List[str], secrets: Optional[List[str]] = None
) -> tuple:
    """
    Render a manifest-validation report.

    Args:
        manifest: The manifest path supplied by the user.
        errors: Validation error messages.
        warnings: Validation warning messages.
        secrets: Optional list of secret strings to redact.

    Returns:
        A tuple ``(json_data, markdown)`` describing the validation outcome.
    """
    status = "VALID" if not errors else "INVALID"
    data = {
        "kind": "validation",
        "manifest": manifest,
        "status": status,
        "errors": [_redact(error, secrets) for error in errors],
        "warnings": [_redact(warning, secrets) for warning in warnings],
    }
    lines = [
        f"# Validation Report: {manifest}",
        "",
        f"Status: {status}",
        "",
        f"Errors: {len(errors)}",
    ]
    for error in data["errors"]:
        lines.append(f"- {error}")
    lines.append("")
    lines.append(f"Warnings: {len(warnings)}")
    for warning in data["warnings"]:
        lines.append(f"- {warning}")
    return data, "\n".join(lines) + "\n"


def render_failure_report(
    kind: str,
    error: str,
    repo: Optional[str] = None,
    plan_hash: Optional[str] = None,
    secrets: Optional[List[str]] = None,
) -> tuple:
    """
    Render a failure report for an aborted command.

    Args:
        kind: Report kind (e.g. ``plan``, ``apply``).
        error: Error message.
        repo: Optional target repository.
        plan_hash: Optional approved plan hash.
        secrets: Optional list of secret strings to redact.

    Returns:
        A tuple ``(json_data, markdown)``.
    """
    error = _redact(error, secrets)
    data: Dict[str, Any] = {"kind": kind, "status": "ERROR", "error": error}
    if repo:
        data["repo"] = repo
    if plan_hash:
        data["plan_hash"] = plan_hash
    markdown = f"# {kind.title()} Report\n\nStatus: ERROR\n\nError: {error}\n"
    return data, markdown


def render_plan_report(
    plan: Plan,
    plan_hash: str,
    approval: Optional[ApprovalResult] = None,
    secrets: Optional[List[str]] = None,
    notes: Optional[List[str]] = None,
) -> tuple:
    """
    Render a read-only planning report.

    Args:
        plan: The generated plan.
        plan_hash: The plan's SHA-256 hash.
        approval: Optional approval result when ``--approve`` was supplied.
        secrets: Optional list of secret strings to redact.
        notes: Optional list of human-readable notes (e.g. dry-run limits).

    Returns:
        A tuple ``(json_data, markdown)`` describing the plan.
    """
    actions = [
        {
            "ticket_id": action.ticket_id,
            "action": action.action,
            "issue_number": action.issue_number,
            "title": _redact(action.expected_title, secrets),
            "reason": _redact(action.reason, secrets),
            "match_basis": action.match_basis,
        }
        for action in plan.actions
    ]
    review = [
        action.ticket_id
        for action in plan.actions
        if action.action in ("REVIEW_REQUIRED", "BLOCKED")
    ]
    data: Dict[str, Any] = {
        "kind": "plan",
        "repo": plan.repo,
        "package": plan.package,
        "plan_hash": plan_hash,
        "allow_create": plan.allow_create,
        "actions": actions,
        "relationships": [
            {
                "parent_id": rel.parent_id,
                "child_id": rel.child_id,
                "parent_issue_number": rel.parent_issue_number,
                "child_issue_number": rel.child_issue_number,
            }
            for rel in plan.relationships
        ],
        "review_required": review,
        "title_candidates": [
            {
                "ticket_id": candidate.ticket_id,
                "issue_number": candidate.issue_number,
                "issue_title": _redact(candidate.issue_title, secrets),
            }
            for candidate in plan.title_candidates
        ],
    }
    if notes:
        data["notes"] = [_redact(note, secrets) for note in notes]
    if approval is not None:
        data["approval"] = {
            "approved": approval.approved,
            "reason": _redact(approval.reason, secrets),
            "plan_hash": approval.plan_hash,
        }

    lines = [
        f"# Plan Report: {plan.repo} ({plan.package})",
        "",
        f"Plan hash: `{plan_hash}`",
        "",
        f"Creation authorized: {'yes' if plan.allow_create else 'no'}",
        "",
        "## Actions",
    ]
    for action in plan.actions:
        marker = f"#{action.issue_number}" if action.issue_number is not None else "-"
        title = _redact(action.expected_title, secrets)
        reason = _redact(action.reason, secrets)
        lines.append(
            f"- `{action.action}` {action.ticket_id} issue={marker} title={title!r}"
        )
        lines.append(f"  - {reason}")
    lines.append("")
    lines.append("## Review required")
    if review:
        for ticket_id in review:
            lines.append(f"- {ticket_id}")
    else:
        lines.append("- none")
    if approval is not None:
        lines.append("")
        lines.append("## Approval")
        lines.append(f"- approved: {approval.approved}")
        lines.append(f"- reason: {approval.reason}")
    if notes:
        lines.append("")
        lines.append("## Notes")
        for note in data["notes"]:
            lines.append(f"- {note}")
    return data, "\n".join(lines) + "\n"


def render_execution_report(
    report: ExecutionReport,
    repo: str,
    plan_hash: Optional[str] = None,
    secrets: Optional[List[str]] = None,
) -> tuple:
    """
    Render an execution report from confirmed operations.

    Args:
        report: The execution report.
        repo: Target repository in ``owner/repo`` form.
        plan_hash: Optional approved plan hash for context.
        secrets: Optional list of secret strings to redact.

    Returns:
        A tuple ``(json_data, markdown)`` describing the execution.
    """
    operations = []
    summary = {"CREATE": 0, "SKIP": 0, "LINK": 0, "CONFLICT": 0, "ERROR": 0}
    for operation in report.operations:
        if operation.op in summary:
            summary[operation.op] += 1
        operations.append(
            {
                "op": operation.op,
                "target": _redact(operation.target, secrets),
                "message": _redact(operation.message, secrets),
                "issue_number": operation.issue_number,
                "url": (
                    issue_url(repo, operation.issue_number)
                    if operation.issue_number is not None
                    else None
                ),
            }
        )
    data: Dict[str, Any] = {
        "kind": "execution",
        "repo": repo,
        "status": report.status,
        "plan_hash": plan_hash,
        "operations": operations,
        "summary": summary,
        "created_issues": [
            {
                "ticket_id": ticket_id,
                "issue_number": (
                    next(
                        (
                            op.issue_number
                            for op in report.operations
                            if op.op == "CREATE" and op.target == ticket_id
                        ),
                        None,
                    )
                ),
            }
            for ticket_id in report.created_issues
        ],
        "linked": list(report.linked),
        "errors": [_redact(error, secrets) for error in report.errors],
    }

    lines = [f"# Execution Report: {repo}", ""]
    if plan_hash:
        lines.append(f"Plan hash: `{plan_hash}`")
        lines.append("")
    lines.append(f"Status: {report.status}")
    lines.append("")
    lines.append("## Summary")
    for label in ("CREATE", "SKIP", "LINK", "CONFLICT", "ERROR"):
        lines.append(f"- {label}: {summary[label]}")
    lines.append("")
    lines.append("## Operations")
    for operation in operations:
        marker = f"#{operation['issue_number']}" if operation["issue_number"] is not None else "-"
        url = operation["url"] or ""
        lines.append(
            f"- `{operation['op']}` {operation['target']} issue={marker} {operation['message']}"
        )
        if url:
            lines.append(f"  - {url}")
    if report.errors:
        lines.append("")
        lines.append("## Errors")
        for error in data["errors"]:
            lines.append(f"- {error}")
    return data, "\n".join(lines) + "\n"
