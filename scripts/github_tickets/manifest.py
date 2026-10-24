"""
Manifest loading and local validation for GitHub ticket packages.

Validation is intentionally offline: it never opens a network connection and
does not require credentials. It reads Markdown bodies only to verify the
required template headings and never rewrites them.

Public functions:
    load_manifest(path) -> Manifest
    validate_manifest(manifest) -> (errors, warnings)

Malformed user input is handled defensively. Structurally invalid documents
raise :class:`ManifestLoadError`; field-level problems are reported as
human-readable strings by :func:`validate_manifest` so callers can report every
issue in one pass without an uncaught traceback.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from scripts.github_tickets.model import Manifest, Ticket, TICKET_TYPES, TYPE_LABELS

# ``owner/repo`` with the characters GitHub allows in each segment.
REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")

# Stable IDs allow letters, digits, '.', '_', '/', and '-', and must not start
# with a non-alphanumeric character. They are package-scoped, not global.
ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]*$")

SUPPORTED_SCHEMA_VERSION = 1

# Required Markdown headings per ticket type, sourced from the repository
# issue templates in .github/ISSUE_TEMPLATE/:
#   Epic  -> feature_request.md
#   Story -> story.md
#   Task  -> task.md
REQUIRED_HEADINGS: Dict[str, Tuple[str, ...]] = {
    "epic": (
        "Feature Description",
        "Problem Statement",
        "Proposed Solution",
        "Alternative Solutions",
        "Impact",
        "Acceptance Criteria",
        "Additional Context",
        "Related Issues / PRs",
    ),
    "story": (
        "Story Description",
        "Problem Statement",
        "Proposed Solution",
        "Alternative Solutions",
        "Impact",
        "Acceptance Criteria",
        "Additional Context",
        "Related Issues / PRs",
    ),
    "task": (
        "Description",
        "Task List",
        "Technical Details",
        "DOD",
        "Dependencies",
        "Additional Context",
        "Related Issues / PRs",
    ),
}


class ManifestLoadError(Exception):
    """Raised when a manifest file is missing, unreadable, or structurally invalid."""


def load_manifest(path: str) -> Manifest:
    """
    Read and parse a ``manifest.json`` file into a :class:`Manifest`.

    Parsing is defensive: field values are preserved as read (including wrong
    types) so :func:`validate_manifest` can report them, while malformed
    top-level structure is rejected immediately.

    Args:
        path: Filesystem path to the manifest file. May be relative or
            absolute; the returned manifest's ``root`` is the file's parent.

    Returns:
        A populated :class:`Manifest` with ``root`` set to the manifest's
        parent directory. Field-level parsing is permissive; semantic problems
        are reported later by :func:`validate_manifest`.

    Raises:
        ManifestLoadError: If the file does not exist or cannot be read, is not
            valid UTF-8, is not valid JSON, the JSON root is not an object,
            ``tickets`` is not a list, or a ticket entry is not an object.
    """
    manifest_path = Path(path)
    if not manifest_path.is_file():
        raise ManifestLoadError(f"Manifest file not found: {manifest_path}")
    try:
        text = manifest_path.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise ManifestLoadError(
            f"Manifest file is not valid UTF-8: {manifest_path}"
        ) from exc
    except OSError as exc:
        raise ManifestLoadError(
            f"Cannot read manifest file {manifest_path}: {exc}"
        ) from exc
    try:
        raw = json.loads(text)
    except json.JSONDecodeError as exc:
        raise ManifestLoadError(f"Invalid JSON in {manifest_path}: {exc}") from exc
    if not isinstance(raw, dict):
        raise ManifestLoadError(f"Manifest root must be a JSON object: {manifest_path}")

    raw_tickets = raw.get("tickets")
    if not isinstance(raw_tickets, list):
        raise ManifestLoadError(
            f"Manifest 'tickets' must be a list, got {type(raw_tickets).__name__}"
        )

    tickets = []
    for index, item in enumerate(raw_tickets):
        if not isinstance(item, dict):
            raise ManifestLoadError(
                f"Manifest ticket entry at index {index} must be a JSON object, "
                f"got {type(item).__name__}"
            )
        tickets.append(
            Ticket(
                id=item.get("id"),
                type=item.get("type"),
                title=item.get("title"),
                body=item.get("body"),
                parent=item.get("parent"),
                # Preserve raw values so validate_manifest can report type
                # errors instead of this parser crashing while coercing them.
                labels=item.get("labels"),
                depends_on=item.get("depends_on"),
                related=item.get("related"),
                issue_number=item.get("issue_number"),
            )
        )

    return Manifest(
        schema_version=raw.get("schema_version"),
        repo=raw.get("repo"),
        package=raw.get("package"),
        tickets=tickets,
        root=manifest_path.parent,
    )


def validate_manifest(manifest: Manifest) -> Tuple[List[str], List[str]]:
    """
    Validate a :class:`Manifest` and return ``(errors, warnings)``.

    Validation is cumulative and defensive: it never assumes a field has its
    declared type and therefore cannot crash on malformed JSON values.

    Args:
        manifest: The manifest returned by :func:`load_manifest`.

    Returns:
        A tuple ``(errors, warnings)``. Errors make the package unusable and
        should cause a nonzero exit code; warnings should be reviewed but do
        not block execution.

    Side effects:
        Reads the Markdown body files referenced by the manifest to check
        required headings. The files are opened read-only and never modified.
    """
    errors: List[str] = []
    warnings: List[str] = []
    ids: Dict[str, Ticket] = {}
    seen_numbers: Dict[int, str] = {}

    _validate_header(manifest, errors, warnings)

    for ticket in manifest.tickets:
        _validate_ticket_fields(ticket, errors, warnings)

    # Build the id index while checking uniqueness. Non-string ids are skipped
    # here (already reported) because they cannot safely be dictionary keys.
    for ticket in manifest.tickets:
        if not isinstance(ticket.id, str):
            continue
        if ticket.id in ids:
            errors.append(f"Duplicate ticket id: {ticket.id!r}")
            continue
        ids[ticket.id] = ticket

        # Only index integer issue numbers; non-integers are reported in
        # _validate_ticket_fields and must not reach this dictionary.
        if isinstance(ticket.issue_number, int) and not isinstance(ticket.issue_number, bool):
            if ticket.issue_number in seen_numbers:
                errors.append(
                    f"Conflicting issue_number {ticket.issue_number}: used by both "
                    f"{seen_numbers[ticket.issue_number]!r} and {ticket.id!r}"
                )
            else:
                seen_numbers[ticket.issue_number] = ticket.id

    if not ids:
        errors.append("Manifest contains no valid tickets")
        return errors, warnings

    _validate_references(manifest, ids, errors)
    _validate_hierarchy(manifest, ids, errors)
    _validate_cycles(manifest, ids, errors)
    _validate_body_files(manifest, errors, warnings)
    return errors, warnings


def _validate_header(manifest: Manifest, errors: List[str], warnings: List[str]) -> None:
    """
    Validate manifest-level fields: schema, repo, package, and ticket list.

    Args:
        manifest: The manifest to validate.
        errors: List of error messages, appended to in place.
        warnings: List of warning messages. Unused by this function but kept
            for a uniform helper signature.

    Returns:
        ``None``; problems are appended to ``errors``.

    Side effects:
        Appends error messages to ``errors``. Does not read the filesystem.
    """
    if manifest.schema_version != SUPPORTED_SCHEMA_VERSION:
        errors.append(
            f"Unsupported schema_version {manifest.schema_version!r}; expected "
            f"{SUPPORTED_SCHEMA_VERSION}"
        )
    if not isinstance(manifest.repo, str) or not REPO_RE.match(manifest.repo):
        errors.append(
            f"Invalid repo {manifest.repo!r}; expected 'owner/repo' format"
        )
    if not isinstance(manifest.package, str) or not manifest.package.strip():
        errors.append("Package name is required and must be a non-empty string")
    if not isinstance(manifest.tickets, list) or not manifest.tickets:
        errors.append("Manifest must contain at least one ticket")


def _validate_ticket_fields(ticket: Ticket, errors: List[str], warnings: List[str]) -> None:
    """Validate the scalar and list fields of a single ticket.

    Args:
        ticket: The ticket entry to validate.
        errors: List of error messages, appended to in place.
        warnings: List of warning messages, appended to in place.

    Returns:
        ``None``; problems are appended to ``errors`` or ``warnings``.

    Side effects:
        Appends to ``errors`` for field violations and to ``warnings`` when the
        canonical type label (e.g. ``EPIC``) is missing.
    """
    label = f"ticket {ticket.id!r}" if isinstance(ticket.id, str) else "ticket"

    if not isinstance(ticket.id, str) or not ID_RE.match(ticket.id):
        errors.append(f"{label}: invalid or missing id (allowed: letters, digits, '.', '_', '/', '-')")
    if ticket.type not in TICKET_TYPES:
        errors.append(
            f"{label}: invalid type {ticket.type!r}; expected one of {TICKET_TYPES}"
        )
    if not isinstance(ticket.title, str) or not ticket.title.strip():
        errors.append(f"{label}: title is required and must be a non-empty string")
    if not isinstance(ticket.body, str) or not ticket.body.strip():
        errors.append(f"{label}: body path is required and must be a non-empty string")
    if ticket.parent is not None and (not isinstance(ticket.parent, str) or not ticket.parent.strip()):
        errors.append(f"{label}: parent must be null or a non-empty string id")

    if not isinstance(ticket.labels, list) or not ticket.labels:
        errors.append(f"{label}: labels must be a non-empty list")
    elif any(not isinstance(value, str) or not value.strip() for value in ticket.labels):
        errors.append(f"{label}: labels must contain only non-empty strings")

    if not isinstance(ticket.depends_on, list):
        errors.append(f"{label}: depends_on must be a list")
    if not isinstance(ticket.related, list):
        errors.append(f"{label}: related must be a list")

    if ticket.issue_number is not None:
        # ``bool`` is a subclass of ``int``; reject it explicitly so ``True``
        # is never accepted as a GitHub issue number.
        if isinstance(ticket.issue_number, bool) or not isinstance(ticket.issue_number, int):
            errors.append(f"{label}: issue_number must be an integer or null")
        elif ticket.issue_number <= 0:
            errors.append(f"{label}: issue_number must be a positive integer")

    if isinstance(ticket.type, str):
        expected_label = TYPE_LABELS.get(ticket.type)
        if expected_label and isinstance(ticket.labels, list) and expected_label not in ticket.labels:
            warnings.append(f"{label}: missing canonical label {expected_label!r}")


def _validate_references(manifest: Manifest, ids: Dict[str, Ticket], errors: List[str]) -> None:
    """
    Validate that parent, dependency, and related references resolve.

    Args:
        manifest: The manifest whose tickets reference each other.
        ids: Mapping from ticket id to :class:`Ticket` for all unique string ids.
        errors: List of error messages, appended to in place.

    Returns:
        ``None``; problems are appended to ``errors``.

    Side effects:
        Appends error messages for self-references, unknown references, and
        non-string reference elements.
    """
    for ticket in manifest.tickets:
        if not isinstance(ticket.id, str):
            continue

        if isinstance(ticket.depends_on, list):
            for ref in ticket.depends_on:
                if not isinstance(ref, str):
                    errors.append(
                        f"Ticket {ticket.id!r}: depends_on entries must be strings, "
                        f"got {type(ref).__name__}"
                    )
                elif ref == ticket.id:
                    errors.append(f"Ticket {ticket.id!r} lists itself in depends_on")
                elif ref not in ids:
                    errors.append(f"Ticket {ticket.id!r} references unknown dependency {ref!r}")

        if isinstance(ticket.related, list):
            for ref in ticket.related:
                if not isinstance(ref, str):
                    errors.append(
                        f"Ticket {ticket.id!r}: related entries must be strings, "
                        f"got {type(ref).__name__}"
                    )
                elif ref == ticket.id:
                    errors.append(f"Ticket {ticket.id!r} lists itself in related")
                elif ref not in ids:
                    errors.append(f"Ticket {ticket.id!r} references unknown related ticket {ref!r}")

        parent = ticket.parent
        if isinstance(parent, str):
            if parent == ticket.id:
                errors.append(f"Ticket {ticket.id!r} cannot be its own parent")
            elif parent not in ids:
                errors.append(f"Ticket {ticket.id!r} references unknown parent {parent!r}")


def _validate_hierarchy(manifest: Manifest, ids: Dict[str, Ticket], errors: List[str]) -> None:
    """
    Enforce the allowed parent types for Epic, Story, and Task tickets.

    Supported structures are: standalone Epic, standalone Story, standalone
    Task, Epic -> Story, Epic -> Task, and Epic -> Story -> Task. A Story's
    parent, when present, must be an Epic; a Task's parent, when present, must
    be an Epic or a Story. Epics may not have a parent.

    Tickets whose type is not ``epic``, ``story``, or ``task`` are skipped
    here because the invalid type is already reported by field validation.

    Args:
        manifest: The manifest whose tickets define the hierarchy.
        ids: Mapping from ticket id to :class:`Ticket` for all unique string ids.
        errors: List of error messages, appended to in place.

    Returns:
        ``None``; problems are appended to ``errors``.

    Side effects:
        Appends hierarchy violations to ``errors``.
    """
    for ticket in manifest.tickets:
        if not isinstance(ticket.id, str):
            continue

        if ticket.type == "epic":
            if ticket.parent is not None:
                errors.append(f"Epic {ticket.id!r} cannot have a parent")
            continue

        # Only Story and Task may carry an optional parent; any other type is
        # already reported by _validate_ticket_fields and must not reach the
        # string formatting below (a non-string type has no .capitalize()).
        if ticket.type not in ("story", "task"):
            continue

        type_name = ticket.type.capitalize()
        parent_id = ticket.parent
        if parent_id is None:
            # Standalone Story and standalone Task are valid.
            continue
        if not isinstance(parent_id, str):
            errors.append(
                f"{type_name} {ticket.id!r} parent must be a string id, "
                f"got {type(parent_id).__name__}"
            )
            continue

        parent = ids.get(parent_id)
        if parent is None:
            continue  # unknown parent already reported in reference validation

        if ticket.type == "story" and parent.type != "epic":
            errors.append(
                f"Story {ticket.id!r} must have an Epic parent, got {parent_id!r} "
                f"({parent.type})"
            )
        if ticket.type == "task" and parent.type not in ("epic", "story"):
            errors.append(
                f"Task {ticket.id!r} must have an Epic or Story parent, got {parent_id!r} "
                f"({parent.type})"
            )


def _validate_cycles(manifest: Manifest, ids: Dict[str, Ticket], errors: List[str]) -> None:
    """
    Detect directed cycles in the combined parent + dependency graph.

    Args:
        manifest: The manifest whose parent and dependency edges are checked.
        ids: Mapping from ticket id to :class:`Ticket` for all unique string ids.
        errors: List of error messages, appended to in place.

    Returns:
        ``None``; at most one cycle is appended to ``errors``.

    Side effects:
        Appends a ``Dependency cycle detected`` message when a cycle exists.
    """
    # Edges point from a prerequisite to the ticket that requires it, so a
    # cycle means two tickets can never be scheduled in a valid order. A
    # depth-first search with three colors (white/grey/black) reports the
    # first cycle found.
    graph: Dict[str, List[str]] = {ticket_id: [] for ticket_id in ids}
    for ticket in manifest.tickets:
        if not isinstance(ticket.id, str):
            continue
        if isinstance(ticket.parent, str) and ticket.parent in ids:
            graph[ticket.parent].append(ticket.id)
        if isinstance(ticket.depends_on, list):
            for dep in ticket.depends_on:
                if isinstance(dep, str) and dep in ids:
                    graph[dep].append(ticket.id)

    WHITE, GREY, BLACK = 0, 1, 2
    color: Dict[str, int] = {ticket_id: WHITE for ticket_id in ids}
    stack: List[str] = []

    def visit(node: str) -> Optional[List[str]]:
        """
        Traverse from ``node`` and return the first cycle path found.

        Args:
            node: Ticket id currently being visited.

        Returns:
            A list of ticket ids forming a cycle (first and last equal), or
            ``None`` when no cycle is reachable from ``node``.
        """
        color[node] = GREY
        stack.append(node)
        for child in graph.get(node, []):
            if color.get(child, WHITE) == GREY:
                return stack[stack.index(child):] + [child]
            if color.get(child, WHITE) == WHITE:
                found = visit(child)
                if found:
                    return found
        stack.pop()
        color[node] = BLACK
        return None

    for ticket_id in ids:
        if color[ticket_id] == WHITE:
            cycle = visit(ticket_id)
            if cycle:
                errors.append("Dependency cycle detected: " + " -> ".join(cycle))
                return


def _validate_body_files(manifest: Manifest, errors: List[str], warnings: List[str]) -> None:
    """
    Check that each body path is safe and resolves to an existing file.

    Args:
        manifest: The manifest whose body files are checked.
        errors: List of error messages, appended to in place.
        warnings: List of warning messages. Unused by this function but kept
            for a uniform helper signature.

    Returns:
        ``None``; problems are appended to ``errors``.

    Side effects:
        Reads body files read-only through :func:`_validate_template_headings`.
    """
    for ticket in manifest.tickets:
        if not isinstance(ticket.body, str) or not ticket.body.strip():
            continue
        safe, resolved = _safe_body_path(manifest.root, ticket.body)
        if not safe:
            errors.append(
                f"Ticket {ticket.id!r}: unsafe body path {ticket.body!r} (absolute paths, "
                f"'..' traversal, and symlinks are not allowed)"
            )
            continue
        if not resolved.is_file():
            errors.append(f"Ticket {ticket.id!r}: body file not found: {resolved}")
            continue
        _validate_template_headings(ticket, resolved, errors, warnings)


def _safe_body_path(root: Path, body: str) -> Tuple[bool, Optional[Path]]:
    """
    Return whether ``body`` is safe and, if so, its resolved path.

    Args:
        root: Package root directory; relative paths resolve against it.
        body: Relative path string from the manifest.

    Returns:
        A tuple ``(safe, resolved)``. ``safe`` is ``True`` only when the path
        is relative, contains no ``..`` component, contains no symlink in any
        component, and resolves inside ``root``. When ``safe`` is ``True``,
        ``resolved`` is the absolute resolved :class:`Path`; otherwise it is
        ``None``.

    Side effects:
        None. May touch the filesystem to inspect path components.
    """
    raw = Path(body)
    if raw.is_absolute() or ".." in raw.parts:
        return False, None

    # Walk each component before resolving so a symlink cannot redirect the
    # eventual read outside the package root.
    current = root
    if current.is_symlink():
        return False, None
    for part in raw.parts:
        current = current / part
        if current.is_symlink():
            return False, None

    try:
        resolved = current.resolve()
    except OSError:
        return False, None
    try:
        resolved.relative_to(root.resolve())
    except ValueError:
        return False, None
    return True, resolved


def _validate_template_headings(
    ticket: Ticket, body_file: Path, errors: List[str], warnings: List[str]
) -> None:
    """
    Verify that a body file contains the required template headings.

    Args:
        ticket: The ticket whose body file is checked; its type selects the
            required heading set.
        body_file: Resolved path to the Markdown body file.
        errors: List of error messages, appended to in place.
        warnings: List of warning messages. Unused by this function but kept
            for a uniform helper signature.

    Returns:
        ``None``; missing headings and unreadable/invalid-UTF-8 body files are
        appended to ``errors``.

    Side effects:
        Reads ``body_file`` with UTF-8 encoding. The file is never modified.
    """
    try:
        text = body_file.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        errors.append(
            f"Ticket {ticket.id!r}: body file is not valid UTF-8: {body_file}"
        )
        return
    except OSError as exc:
        errors.append(f"Ticket {ticket.id!r}: cannot read body file {body_file}: {exc}")
        return
    required = REQUIRED_HEADINGS.get(ticket.type, ()) if isinstance(ticket.type, str) else ()
    stripped_lines = [line.strip() for line in text.splitlines()]
    for heading in required:
        if f"### {heading}" not in stripped_lines:
            errors.append(
                f"Ticket {ticket.id!r}: body is missing required heading '### {heading}'"
            )
