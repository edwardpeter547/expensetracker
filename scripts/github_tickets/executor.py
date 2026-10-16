"""
Safe, idempotent execution of an approved, hash-verified plan.

This module consumes a validated manifest and a separately supplied approved
plan hash, refreshes GitHub state, regenerates the plan, and only then performs
the smallest set of mutations required: attaching native sub-issue
relationships. Existing issues are never modified, and duplicate or
conflicting links are never silently repaired.

Creation of new issues is intentionally conservative: Task 03 never generates
``CREATE`` actions automatically, so the end-to-end creation workflow is not
operational until a separately reviewed safe creation policy is implemented.
The client-side creation methods and executor safeguards remain in place for
that future policy.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from scripts.github_tickets import planner as planner_module
from scripts.github_tickets.github import (
    GitHubAmbiguousParentError,
    GitHubClient,
    GitHubError,
    Issue,
    discover_issues,
)
from scripts.github_tickets.model import Manifest
from scripts.github_tickets.planner import (
    ACTION_BLOCKED,
    ACTION_CREATE,
    ACTION_EXISTS,
    ACTION_REVIEW_REQUIRED,
    Plan,
    compute_plan_hash,
)

# Ticket creation order: parents before children.
_TYPE_ORDER = {"epic": 0, "story": 1, "task": 2}

STATUS_COMPLETED = "COMPLETED"
STATUS_PARTIAL = "PARTIAL"
STATUS_FAILED = "FAILED"

OP_SKIP = "SKIP"
OP_CREATE = "CREATE"
OP_LINK = "LINK"
OP_CONFLICT = "CONFLICT"
OP_ERROR = "ERROR"


class ExecutionError(Exception):
    """Raised when a plan cannot be safely executed (stale, unapproved, unsafe)."""


@dataclass
class Operation:
    """
    A single execution operation outcome.

    Attributes:
        op: One of ``SKIP``, ``CREATE``, ``LINK``, ``CONFLICT``, or ``ERROR``.
        target: Human-readable target (ticket id or ``parent -> child``).
        message: Description of the outcome.
        issue_number: Related issue number when applicable.
    """

    op: str
    target: str
    message: str
    issue_number: Optional[int] = None


@dataclass
class ExecutionReport:
    """
    Result of an execution attempt.

    Attributes:
        status: ``COMPLETED``, ``PARTIAL``, or ``FAILED``.
        operations: Ordered operation outcomes.
        created_issues: Ticket ids whose issues were created.
        linked: ``parent -> child`` strings for links established.
        errors: Error messages encountered.
    """

    status: str = STATUS_COMPLETED
    operations: List[Operation] = field(default_factory=list)
    created_issues: List[str] = field(default_factory=list)
    linked: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


def verify_approved_plan(
    client: GitHubClient, manifest: Manifest, approved_hash: str
) -> Plan:
    """Refresh GitHub state and verify the regenerated plan hash.

    The stored or supplied hash is never trusted as sufficient authorization;
    the plan is regenerated from the current manifest and GitHub state and its
    digest is compared against ``approved_hash``.

    Args:
        client: A read-only-capable :class:`GitHubClient` for the target repo.
        manifest: The validated :class:`Manifest`.
        approved_hash: The exact approved SHA-256 plan hash.

    Returns:
        The freshly generated :class:`Plan`.

    Raises:
        ExecutionError: If the regenerated hash differs, or the plan contains
            ``BLOCKED`` or ``REVIEW_REQUIRED`` actions.
    """
    try:
        issues = client.list_issues()
        discovery = discover_issues(client, manifest.tickets, issues=issues)
    except GitHubError as exc:
        raise ExecutionError(f"GitHub state refresh failed: {exc}") from exc

    plan = planner_module.build_plan(
        manifest, discovery, str(client.repo), issues=issues
    )
    current_hash = compute_plan_hash(plan)
    if current_hash != approved_hash:
        raise ExecutionError(
            f"plan hash {current_hash} does not match approved hash {approved_hash}"
        )

    unsafe = [
        action
        for action in plan.actions
        if action.action in (ACTION_BLOCKED, ACTION_REVIEW_REQUIRED)
    ]
    if unsafe:
        raise ExecutionError(
            "plan contains unresolved actions: "
            + ", ".join(action.ticket_id for action in unsafe)
        )

    return plan


def execute_plan(
    client: GitHubClient, manifest: Manifest, approved_hash: str
) -> ExecutionReport:
    """
    Execute an approved plan safely and idempotently.

    Args:
        client: A :class:`GitHubClient` for the target repository.
        manifest: The validated :class:`Manifest`.
        approved_hash: The exact approved SHA-256 plan hash.

    Returns:
        An :class:`ExecutionReport` describing every operation and the final
        status.

    Raises:
        ExecutionError: For stale plans, unresolved actions, or state-refresh
            failures.
    """
    plan = verify_approved_plan(client, manifest, approved_hash)
    report = ExecutionReport()

    verified_by_ticket = {
        item["ticket_id"]: item for item in plan.verified_issues
    }
    by_id = {ticket.id: ticket for ticket in manifest.tickets if isinstance(ticket.id, str)}
    ticket_issues: Dict[str, Issue] = {}
    create_actions = [a for a in plan.actions if a.action == ACTION_CREATE]
    exists_actions = [a for a in plan.actions if a.action == ACTION_EXISTS]
    create_actions.sort(key=lambda a: (_TYPE_ORDER.get(by_id[a.ticket_id].type, 99), a.ticket_id))

    for action in exists_actions:
        try:
            issue = client.get_issue(action.issue_number)
        except GitHubError as exc:
            raise ExecutionError(f"{action.ticket_id}: {exc}") from exc

        verified = verified_by_ticket.get(action.ticket_id, {})
        if (
            verified.get("issue_number") != issue.number
            or verified.get("title") != issue.title
            or verified.get("state") != issue.state
            or verified.get("url") != issue.html_url
        ):
            raise ExecutionError(
                f"{action.ticket_id}: existing issue identity changed from the "
                f"approved plan (approved #{verified.get('issue_number')}, "
                f"fetched #{issue.number})"
            )

        ticket_issues[action.ticket_id] = issue
        report.operations.append(
            Operation(
                OP_SKIP,
                action.ticket_id,
                f"existing issue #{issue.number} preserved",
                issue.number,
            )
        )

    for action in create_actions:
        ticket = by_id[action.ticket_id]
        body = _body_with_marker(manifest, ticket)
        try:
            issue = client.create_issue(
                ticket.title,
                body,
                labels=list(ticket.labels or []),
            )
        except GitHubError as exc:
            report.errors.append(f"{action.ticket_id}: {exc}")
            report.operations.append(Operation(OP_ERROR, action.ticket_id, str(exc)))
            report.status = STATUS_PARTIAL
            return report
        ticket_issues[action.ticket_id] = issue
        report.created_issues.append(action.ticket_id)
        report.operations.append(
            Operation(OP_CREATE, action.ticket_id, f"created issue #{issue.number}", issue.number)
        )

    for rel in plan.relationships:
        parent = ticket_issues.get(rel.parent_id)
        child = ticket_issues.get(rel.child_id)
        label = f"{rel.parent_id} -> {rel.child_id}"
        if parent is None or child is None:
            report.errors.append(f"{label}: missing verified issue")
            report.operations.append(Operation(OP_ERROR, label, "missing verified issue"))
            report.status = STATUS_PARTIAL
            return report

        try:
            existing_children = client.list_sub_issues(parent.number)
        except GitHubError as exc:
            report.errors.append(f"{label}: {exc}")
            report.operations.append(Operation(OP_ERROR, label, str(exc)))
            report.status = STATUS_PARTIAL
            return report

        if any(child_issue.number == child.number for child_issue in existing_children):
            report.operations.append(
                Operation(OP_SKIP, label, "child already linked to parent", child.number)
            )
            continue

        try:
            current_parent = client.get_parent_issue(child.number)
        except GitHubAmbiguousParentError as exc:
            report.errors.append(f"{label}: {exc}")
            report.operations.append(
                Operation(OP_ERROR, label, "parentless state cannot be confirmed", child.number)
            )
            report.status = STATUS_PARTIAL
            return report
        except GitHubError as exc:
            report.errors.append(f"{label}: {exc}")
            report.operations.append(Operation(OP_ERROR, label, str(exc)))
            report.status = STATUS_PARTIAL
            return report

        if current_parent is not None:
            if current_parent.number == parent.number:
                report.operations.append(
                    Operation(OP_SKIP, label, "child already linked to parent", child.number)
                )
                continue
            report.errors.append(
                f"{label}: child #{child.number} is already linked to parent "
                f"#{current_parent.number}; refusing to reparent"
            )
            report.operations.append(
                Operation(
                    OP_CONFLICT,
                    label,
                    f"child already linked to parent #{current_parent.number}",
                    child.number,
                )
            )
            report.status = STATUS_FAILED
            return report

        # Parentless is now safely confirmed: GraphQL returned parent:null
        # (see GitHubClient.get_parent_issue).
        if child.id is None:
            report.errors.append(f"{label}: child issue #{child.number} has no id")
            report.operations.append(
                Operation(OP_ERROR, label, "child issue has no id", child.number)
            )
            report.status = STATUS_FAILED
            return report

        try:
            client.add_sub_issue(parent.number, child.id)
        except GitHubError as exc:
            report.errors.append(f"{label}: {exc}")
            report.operations.append(Operation(OP_ERROR, label, str(exc)))
            report.status = STATUS_PARTIAL
            return report

        report.linked.append(label)
        report.operations.append(
            Operation(OP_LINK, label, f"linked child #{child.number} to parent #{parent.number}", child.number)
        )

    if report.errors and report.status == STATUS_COMPLETED:
        report.status = STATUS_PARTIAL
    return report


def _body_with_marker(manifest: Manifest, ticket) -> str:
    """
    Return the ticket body with its stable marker prepended.

    Args:
        manifest: The validated manifest.
        ticket: The manifest ticket whose body is read.

    Returns:
        The marker line followed by the body file contents.

    Raises:
        ExecutionError: If the body file cannot be read.
    """
    from scripts.github_tickets.github import ticket_id_marker

    marker = ticket_id_marker(ticket.id)
    try:
        body_text = (manifest.root / ticket.body).read_text(encoding="utf-8")
    except OSError as exc:
        raise ExecutionError(f"Ticket {ticket.id!r} body is unreadable: {exc}") from exc
    if marker not in body_text:
        return f"{marker}\n\n{body_text}"
    return body_text
