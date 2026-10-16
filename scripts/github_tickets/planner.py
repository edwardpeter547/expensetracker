"""Deterministic read-only planning, plan artifacts, and approval.

This module builds a synchronization plan from a validated manifest and the
Task 02 discovery result, fingerprints each ticket's Markdown body, computes a
stable SHA-256 plan hash, writes a deterministic ``plan.json`` artifact, and
verifies explicit hash-bound approval. It performs no GitHub mutations.

A missing ``issue_number`` never proves an issue is missing, so unmatched
tickets are always classified ``REVIEW_REQUIRED``. Creation is never inferred
from the absence of identity evidence.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from scripts.github_tickets.github import (
    AmbiguousMatch,
    DiscoveryResult,
    Issue,
    IssueConflict,
    PullRequestReference,
    RepositoryMismatch,
    TitleMismatch,
)
from scripts.github_tickets.model import Manifest, Ticket

ACTION_EXISTS = "EXISTS"
ACTION_CREATE = "CREATE"
ACTION_REVIEW_REQUIRED = "REVIEW_REQUIRED"
ACTION_BLOCKED = "BLOCKED"

RELATIONSHIP_ACTION = "LINK"
RELATIONSHIP_PROPOSED = "PROPOSED"

ARTIFACT_SCHEMA_VERSION = 1


class PlannerError(Exception):
    """Raised when a plan cannot be built or an artifact cannot be written."""


@dataclass
class PlanAction:
    """A single ticket's proposed action.

    Attributes:
        ticket_id: Manifest ticket identifier.
        action: One of the action classification constants.
        reason: Human-readable justification for the classification.
        issue_number: Verified issue number for ``EXISTS`` actions, else ``None``.
        expected_title: Manifest title for this ticket.
        match_basis: ``issue_number`` or ``marker`` when matched, else ``None``.
    """

    ticket_id: str
    action: str
    reason: str
    issue_number: Optional[int]
    expected_title: str
    match_basis: Optional[str] = None


@dataclass
class RelationshipAction:
    """A proposed parent-child link between two verified issues.

    Attributes:
        parent_id: Parent manifest ticket identifier.
        child_id: Child manifest ticket identifier.
        action: Always ``LINK``.
        status: Always ``PROPOSED``; execution verification is Task 04.
        parent_issue_number: Verified parent issue number.
        child_issue_number: Verified child issue number.
    """

    parent_id: str
    child_id: str
    action: str
    status: str
    parent_issue_number: int
    child_issue_number: int


@dataclass
class TitleCandidate:
    """A title-based suggestion, never a verified identity.

    Attributes:
        ticket_id: Manifest ticket identifier.
        issue_number: Suggested issue number.
        issue_title: Existing issue title.
        match_basis: Always ``title``.
    """

    ticket_id: str
    issue_number: int
    issue_title: str
    match_basis: str = "title"


@dataclass
class Plan:
    """A deterministic read-only synchronization plan.

    Attributes:
        repo: Target repository in ``owner/repo`` form.
        package: Manifest package name.
        tickets: Canonical ticket definitions including body fingerprints.
        actions: One :class:`PlanAction` per manifest ticket, sorted by id.
        relationships: Proposed parent-child link actions, sorted.
        conflicts: Identity conflicts from discovery.
        ambiguities: Ambiguous marker matches from discovery.
        title_mismatches: Title mismatches from discovery.
        pull_request_references: Pull-request references from discovery.
        repository_mismatches: Wrong-repo issues from discovery.
        invalid_issue_numbers: Ticket ids with invalid issue numbers.
        verified_issues: Verified existing issue identities included in the hash.
        title_candidates: Title-based suggestions, excluded from the hash.
    """

    repo: str
    package: str
    tickets: List[Dict[str, Any]] = field(default_factory=list)
    actions: List[PlanAction] = field(default_factory=list)
    relationships: List[RelationshipAction] = field(default_factory=list)
    conflicts: List[IssueConflict] = field(default_factory=list)
    ambiguities: List[AmbiguousMatch] = field(default_factory=list)
    title_mismatches: List[TitleMismatch] = field(default_factory=list)
    pull_request_references: List[PullRequestReference] = field(default_factory=list)
    repository_mismatches: List[RepositoryMismatch] = field(default_factory=list)
    invalid_issue_numbers: List[str] = field(default_factory=list)
    verified_issues: List[Dict[str, Any]] = field(default_factory=list)
    title_candidates: List[TitleCandidate] = field(default_factory=list)


@dataclass
class ApprovalResult:
    """Outcome of verifying an approval against a plan hash.

    Attributes:
        approved: Whether approval is granted for this exact plan.
        reason: Human-readable explanation for the outcome.
        plan_hash: The plan's computed SHA-256 hash.
        expected_hash: The hash supplied for approval.
    """

    approved: bool
    reason: str
    plan_hash: str
    expected_hash: str


@dataclass
class ArtifactVerification:
    """Result of verifying a plan.json artifact's integrity.

    Attributes:
        valid: Whether the stored hash matches the recomputed hash.
        reason: Human-readable explanation.
        stored_hash: The hash stored inside the artifact.
        computed_hash: The hash recomputed from the artifact payload.
    """

    valid: bool
    reason: str
    stored_hash: str
    computed_hash: str


def _body_sha256(manifest: Manifest, ticket: Ticket) -> str:
    """Return the SHA-256 fingerprint of a ticket's Markdown body.

    Args:
        manifest: The validated manifest whose root contains the body file.
        ticket: The ticket whose body is fingerprinted.

    Returns:
        The lowercase hexadecimal SHA-256 digest of the body file contents.

    Raises:
        PlannerError: If the body path is unsafe, missing, or unreadable.
    """
    raw = Path(ticket.body)
    if raw.is_absolute() or ".." in raw.parts:
        raise PlannerError(f"Ticket {ticket.id!r} has an unsafe body path: {ticket.body!r}")
    body_file = manifest.root / raw
    try:
        data = body_file.read_bytes()
    except OSError as exc:
        raise PlannerError(f"Ticket {ticket.id!r} body file is unreadable: {body_file}") from exc
    return hashlib.sha256(data).hexdigest()


def _canonical_tickets(manifest: Manifest) -> List[Dict[str, Any]]:
    """Return canonical ticket definitions including body fingerprints.

    Args:
        manifest: The validated :class:`Manifest`.

    Returns:
        A sorted list of dictionaries with stable key and collection ordering.
        The relative body path is retained (never an absolute path) alongside
        the body contents fingerprint.

    Raises:
        PlannerError: If a ticket body cannot be read.
    """
    tickets = []
    for ticket in manifest.tickets:
        if not isinstance(ticket.id, str):
            continue
        tickets.append(
            {
                "id": ticket.id,
                "type": ticket.type,
                "title": ticket.title,
                "body": ticket.body,
                "body_sha256": _body_sha256(manifest, ticket),
                "parent": ticket.parent,
                "labels": sorted(ticket.labels or []),
                "depends_on": sorted(ticket.depends_on or []),
                "related": sorted(ticket.related or []),
                "issue_number": ticket.issue_number,
            }
        )
    tickets.sort(key=lambda item: item["id"])
    return tickets


def build_plan(
    manifest: Manifest,
    discovery: DiscoveryResult,
    repo: str,
    issues: Optional[List[Issue]] = None,
) -> Plan:
    """Build a deterministic plan from a manifest and discovery result.

    Classification:
      - Confirmed match with a matching title -> ``EXISTS``.
      - Confirmed match with a title mismatch -> ``REVIEW_REQUIRED``.
      - Unmatched or ambiguous -> ``REVIEW_REQUIRED``.
      - Conflicts, pull-request references, repository mismatches, and invalid
        issue numbers -> ``BLOCKED``.
      - ``CREATE`` is never inferred from a missing number or marker.

    Args:
        manifest: The validated :class:`Manifest`.
        discovery: The :class:`DiscoveryResult` from Task 02.
        repo: Target repository in ``owner/repo`` form.
        issues: Existing issues used only for title-based candidate
            suggestions; suggestions never establish identity and are excluded
            from the plan hash.

    Returns:
        A populated, deterministic :class:`Plan`.

    Raises:
        PlannerError: If a ticket body cannot be fingerprinted.
    """
    title_mismatch_ids = {item.ticket_id for item in discovery.title_mismatches}
    conflict_ids: set = set()
    for conflict in discovery.conflicts:
        conflict_ids.update(conflict.ticket_ids)
    pr_ids = {item.ticket_id for item in discovery.pull_request_references}
    repo_mismatch_ids = {item.ticket_id for item in discovery.repository_mismatches}
    invalid_ids = set(discovery.invalid_issue_numbers)
    ambiguous_ids = {item.ticket_id for item in discovery.ambiguous}
    matched_by_id = {item.ticket_id: item for item in discovery.matched}

    actions: List[PlanAction] = []
    for ticket in manifest.tickets:
        if not isinstance(ticket.id, str):
            continue
        if ticket.id in conflict_ids:
            actions.append(
                PlanAction(
                    ticket_id=ticket.id,
                    action=ACTION_BLOCKED,
                    reason="identity conflict: multiple tickets or markers claim one issue",
                    issue_number=None,
                    expected_title=ticket.title or "",
                )
            )
        elif ticket.id in pr_ids:
            actions.append(
                PlanAction(
                    ticket_id=ticket.id,
                    action=ACTION_BLOCKED,
                    reason="explicit issue_number references a pull request",
                    issue_number=ticket.issue_number,
                    expected_title=ticket.title or "",
                )
            )
        elif ticket.id in repo_mismatch_ids:
            actions.append(
                PlanAction(
                    ticket_id=ticket.id,
                    action=ACTION_BLOCKED,
                    reason="existing issue belongs to a different repository",
                    issue_number=ticket.issue_number,
                    expected_title=ticket.title or "",
                )
            )
        elif ticket.id in invalid_ids:
            actions.append(
                PlanAction(
                    ticket_id=ticket.id,
                    action=ACTION_BLOCKED,
                    reason="manifest issue_number is not a positive integer",
                    issue_number=None,
                    expected_title=ticket.title or "",
                )
            )
        elif ticket.id in ambiguous_ids:
            actions.append(
                PlanAction(
                    ticket_id=ticket.id,
                    action=ACTION_REVIEW_REQUIRED,
                    reason="marker matches multiple issues; identity is ambiguous",
                    issue_number=None,
                    expected_title=ticket.title or "",
                )
            )
        elif ticket.id in matched_by_id:
            match = matched_by_id[ticket.id]
            if ticket.id in title_mismatch_ids:
                actions.append(
                    PlanAction(
                        ticket_id=ticket.id,
                        action=ACTION_REVIEW_REQUIRED,
                        reason=(
                            f"matched issue #{match.issue_number} but its title differs "
                            f"from the manifest"
                        ),
                        issue_number=match.issue_number,
                        expected_title=ticket.title or "",
                        match_basis=match.match_source,
                    )
                )
            else:
                actions.append(
                    PlanAction(
                        ticket_id=ticket.id,
                        action=ACTION_EXISTS,
                        reason=f"verified existing issue #{match.issue_number}",
                        issue_number=match.issue_number,
                        expected_title=ticket.title or "",
                        match_basis=match.match_source,
                    )
                )
        else:
            actions.append(
                PlanAction(
                    ticket_id=ticket.id,
                    action=ACTION_REVIEW_REQUIRED,
                    reason="no verified identity; manual reconciliation required",
                    issue_number=None,
                    expected_title=ticket.title or "",
                )
            )

    actions.sort(key=lambda action: action.ticket_id)
    relationships = _build_relationships(manifest, actions)
    tickets_canonical = _canonical_tickets(manifest)

    verified_issues = sorted(
        [
            {
                "ticket_id": match.ticket_id,
                "issue_number": match.issue_number,
                "title": match.title,
                "state": match.state,
                "url": match.url,
            }
            for match in discovery.matched
        ],
        key=lambda item: item["ticket_id"],
    )

    title_candidates = _title_candidates(manifest, actions, issues)

    return Plan(
        repo=repo,
        package=manifest.package,
        tickets=tickets_canonical,
        actions=actions,
        relationships=relationships,
        verified_issues=verified_issues,
        conflicts=sorted(discovery.conflicts, key=lambda c: (c.issue_number, c.ticket_ids)),
        ambiguities=sorted(discovery.ambiguous, key=lambda a: (a.ticket_id, a.issue_numbers)),
        title_mismatches=sorted(
            discovery.title_mismatches,
            key=lambda t: (t.ticket_id, t.issue_number),
        ),
        pull_request_references=sorted(
            discovery.pull_request_references,
            key=lambda p: (p.ticket_id, p.issue_number),
        ),
        repository_mismatches=sorted(
            discovery.repository_mismatches,
            key=lambda r: (r.ticket_id, r.issue_number),
        ),
        invalid_issue_numbers=sorted(set(discovery.invalid_issue_numbers)),
        title_candidates=title_candidates,
    )


def _title_candidates(
    manifest: Manifest, actions: List[PlanAction], issues: Optional[List[Issue]]
) -> List[TitleCandidate]:
    """Suggest title-based candidates for unresolved tickets.

    Candidates are informational only and never establish identity.

    Args:
        manifest: The validated :class:`Manifest`.
        actions: The classified plan actions.
        issues: Existing issues to search.

    Returns:
        A sorted list of :class:`TitleCandidate` suggestions.
    """
    if not issues:
        return []
    unresolved = {
        action.ticket_id: action.expected_title
        for action in actions
        if action.action == ACTION_REVIEW_REQUIRED
    }
    candidates: List[TitleCandidate] = []
    for ticket in manifest.tickets:
        if not isinstance(ticket.id, str) or ticket.id not in unresolved:
            continue
        expected = " ".join((ticket.title or "").split()).lower()
        if not expected:
            continue
        for issue in issues:
            actual = " ".join((issue.title or "").split()).lower()
            if actual == expected:
                candidates.append(
                    TitleCandidate(
                        ticket_id=ticket.id,
                        issue_number=issue.number,
                        issue_title=issue.title,
                    )
                )
    candidates.sort(key=lambda c: (c.ticket_id, c.issue_number))
    return candidates


def _build_relationships(
    manifest: Manifest, actions: List[PlanAction]
) -> List[RelationshipAction]:
    """Propose parent-child link actions for verified tickets.

    A relationship is proposed only when both the parent and child are
    ``EXISTS`` actions with verified issue numbers.

    Args:
        manifest: The validated :class:`Manifest`.
        actions: The classified plan actions.

    Returns:
        A sorted list of :class:`RelationshipAction` proposals.
    """
    issue_by_ticket = {
        action.ticket_id: action.issue_number
        for action in actions
        if action.action == ACTION_EXISTS and action.issue_number is not None
    }
    relationships: List[RelationshipAction] = []
    for ticket in manifest.tickets:
        if not isinstance(ticket.id, str) or not isinstance(ticket.parent, str):
            continue
        parent_number = issue_by_ticket.get(ticket.parent)
        child_number = issue_by_ticket.get(ticket.id)
        if parent_number is None or child_number is None:
            continue
        relationships.append(
            RelationshipAction(
                parent_id=ticket.parent,
                child_id=ticket.id,
                action=RELATIONSHIP_ACTION,
                status=RELATIONSHIP_PROPOSED,
                parent_issue_number=parent_number,
                child_issue_number=child_number,
            )
        )
    relationships.sort(key=lambda r: (r.parent_id, r.child_id))
    return relationships


def _canonical_dict(plan: Plan) -> Dict[str, Any]:
    """Return the canonical, hash-relevant representation of a plan.

    Args:
        plan: The plan to canonicalize.

    Returns:
        A dictionary with stable key and collection ordering, containing only
        safety-relevant fields. Tokens, absolute paths, timestamps, display
        formatting, and informational title candidates are excluded.
    """
    return {
        "repo": plan.repo,
        "package": plan.package,
        "tickets": plan.tickets,
        "actions": [
            {
                "ticket_id": action.ticket_id,
                "action": action.action,
                "issue_number": action.issue_number,
                "expected_title": action.expected_title,
                "match_basis": action.match_basis,
            }
            for action in plan.actions
        ],
        "relationships": [
            {
                "parent_id": rel.parent_id,
                "child_id": rel.child_id,
                "action": rel.action,
                "status": rel.status,
                "parent_issue_number": rel.parent_issue_number,
                "child_issue_number": rel.child_issue_number,
            }
            for rel in plan.relationships
        ],
        "verified_issues": plan.verified_issues,
        "conflicts": [
            {"issue_number": c.issue_number, "ticket_ids": c.ticket_ids}
            for c in plan.conflicts
        ],
        "ambiguities": [
            {"ticket_id": a.ticket_id, "issue_numbers": a.issue_numbers}
            for a in plan.ambiguities
        ],
        "title_mismatches": [
            {
                "ticket_id": t.ticket_id,
                "issue_number": t.issue_number,
                "expected_title": t.expected_title,
                "actual_title": t.actual_title,
            }
            for t in plan.title_mismatches
        ],
        "pull_request_references": [
            {"ticket_id": p.ticket_id, "issue_number": p.issue_number}
            for p in plan.pull_request_references
        ],
        "repository_mismatches": [
            {"ticket_id": r.ticket_id, "issue_number": r.issue_number}
            for r in plan.repository_mismatches
        ],
        "invalid_issue_numbers": plan.invalid_issue_numbers,
    }


def _canonical_json(plan: Plan) -> str:
    """Return the canonical JSON payload used for hashing and artifacts.

    Args:
        plan: The plan to serialize.

    Returns:
        A compact, key-sorted JSON string.
    """
    return json.dumps(_canonical_dict(plan), sort_keys=True, separators=(",", ":"))


def compute_plan_hash(plan: Plan) -> str:
    """Compute the deterministic SHA-256 hash of a plan.

    Args:
        plan: The plan to hash.

    Returns:
        The lowercase hexadecimal SHA-256 digest of the canonical plan JSON.
    """
    return hashlib.sha256(_canonical_json(plan).encode("utf-8")).hexdigest()


def plan_artifact_dict(plan: Plan) -> Dict[str, Any]:
    """Return the deterministic ``plan.json`` artifact dictionary.

    Args:
        plan: The plan to serialize.

    Returns:
        A dictionary containing the schema version, the canonical plan payload,
        and the computed plan hash.
    """
    return {
        "schema_version": ARTIFACT_SCHEMA_VERSION,
        "plan_hash": compute_plan_hash(plan),
        "plan": _canonical_dict(plan),
    }


def write_plan_artifact(plan: Plan, path: str) -> None:
    """Write a deterministic ``plan.json`` artifact without overwriting.

    Args:
        plan: The plan to serialize.
        path: Destination filesystem path.

    Raises:
        PlannerError: If the destination already exists or cannot be written.
    """
    destination = Path(path)
    payload = json.dumps(plan_artifact_dict(plan), sort_keys=True, indent=2) + "\n"
    try:
        # Exclusive creation: "x" mode fails atomically if the file already
        # exists, so a concurrent writer cannot be silently overwritten.
        with destination.open("x", encoding="utf-8") as handle:
            handle.write(payload)
    except FileExistsError as exc:
        raise PlannerError(f"Refusing to overwrite existing file: {destination}") from exc
    except OSError as exc:
        raise PlannerError(f"Cannot write plan artifact {destination}: {exc}") from exc


def verify_plan_artifact(artifact: Dict[str, Any]) -> ArtifactVerification:
    """Verify a ``plan.json`` artifact's stored hash against its payload.

    The stored hash is never trusted; it is recomputed from the artifact's
    canonical plan payload.

    This check detects accidental or unaccompanied payload changes. It does
    not authenticate the artifact and does not authorize execution. Task 04
    must regenerate the plan from current inputs and GitHub state and compare
    its digest against a separately supplied approved hash.

    Args:
        artifact: The decoded ``plan.json`` artifact dictionary.

    Returns:
        An :class:`ArtifactVerification` describing the outcome.
    """
    stored_hash = artifact.get("plan_hash")
    payload = artifact.get("plan")
    if not isinstance(stored_hash, str) or not isinstance(payload, dict):
        return ArtifactVerification(
            valid=False,
            reason="artifact is missing plan_hash or plan payload",
            stored_hash=str(stored_hash),
            computed_hash="",
        )
    payload_json = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    computed_hash = hashlib.sha256(payload_json.encode("utf-8")).hexdigest()
    if computed_hash != stored_hash:
        return ArtifactVerification(
            valid=False,
            reason="artifact hash does not match its payload",
            stored_hash=stored_hash,
            computed_hash=computed_hash,
        )
    return ArtifactVerification(
        valid=True,
        reason="artifact hash matches its payload",
        stored_hash=stored_hash,
        computed_hash=computed_hash,
    )


def approve_plan(plan: Plan, expected_hash: str) -> ApprovalResult:
    """Verify explicit approval against the exact plan hash.

    Approval is rejected when the hash does not match or when the plan still
    contains blocking or unresolved identity concerns.

    Args:
        plan: The plan being approved.
        expected_hash: The full expected SHA-256 plan hash.

    Returns:
        An :class:`ApprovalResult` describing the outcome.
    """
    if not isinstance(expected_hash, str) or re.fullmatch(r"[0-9a-f]{64}", expected_hash) is None:
        return ApprovalResult(
            approved=False,
            reason="approval hash must be exactly 64 lowercase hexadecimal characters",
            plan_hash=compute_plan_hash(plan),
            expected_hash=str(expected_hash),
        )

    plan_hash = compute_plan_hash(plan)
    if plan_hash != expected_hash:
        return ApprovalResult(
            approved=False,
            reason="plan hash does not match the approved hash",
            plan_hash=plan_hash,
            expected_hash=expected_hash,
        )

    unsafe = [
        action
        for action in plan.actions
        if action.action in (ACTION_BLOCKED, ACTION_REVIEW_REQUIRED)
    ]
    if unsafe:
        ticket_ids = ", ".join(action.ticket_id for action in unsafe)
        return ApprovalResult(
            approved=False,
            reason=(
                f"plan contains unresolved actions that must be reviewed first: "
                f"{ticket_ids}"
            ),
            plan_hash=plan_hash,
            expected_hash=expected_hash,
        )

    return ApprovalResult(
        approved=True,
        reason="plan hash matches and no blocking actions remain",
        plan_hash=plan_hash,
        expected_hash=expected_hash,
    )
