"""Typed models for the GitHub ticket package manifest.

This module defines the input contract consumed by the ticket automation tool.
It contains plain dataclasses and shared constants only; all semantic
validation lives in :mod:`scripts.github_tickets.manifest`.

Compatibility: Python 3.9+, standard library only.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional

# Supported ticket types, ordered from the most general to the most specific.
TICKET_TYPES = ("epic", "story", "task")

# Canonical GitHub label applied to each ticket type. The manifest should
# carry this label; validation reports a warning when it is missing.
TYPE_LABELS = {"epic": "EPIC", "story": "STORY", "task": "TASK"}


@dataclass
class Ticket:
    """A single ticket entry read from ``manifest.json``.

    Attributes:
        id: Stable, package-unique ticket identifier.
        type: One of ``epic``, ``story``, or ``task``.
        title: GitHub issue title.
        body: Repo-relative path to the Markdown body file.
        parent: Parent ticket identifier, or ``None`` for an Epic.
        labels: GitHub labels to apply on creation.
        depends_on: Ticket identifiers that must exist before this one.
        related: Loosely related ticket identifiers.
        issue_number: Optional existing GitHub issue number mapping. ``None``
            means the issue has not been created yet.

    Invariants:
        ``id`` is unique within a package and matches the package identifier
        rule; ``type`` is one of ``TICKET_TYPES``; ``labels`` is non-empty.
        These are enforced by ``validate_manifest``, not by this dataclass.

    Note:
        Between ``load_manifest`` and ``validate_manifest``, fields may hold
        unvalidated raw JSON values (including wrong types). Consumers must
        not assume declared types until validation has passed.
    """

    id: str
    type: str
    title: str
    body: str
    parent: Optional[str]
    labels: List[str] = field(default_factory=list)
    depends_on: List[str] = field(default_factory=list)
    related: List[str] = field(default_factory=list)
    issue_number: Optional[int] = None


@dataclass
class Manifest:
    """A parsed ticket package manifest.

    Attributes:
        schema_version: Manifest schema version (must equal the supported version).
        repo: Target repository in ``owner/repo`` form.
        package: Human-readable package name.
        tickets: Parsed ticket entries in manifest order.
        root: Filesystem directory containing ``manifest.json``. Relative body
            paths are resolved against this directory.

    Invariants:
        ``schema_version`` equals the supported version and ``tickets`` is
        non-empty; both are checked by ``validate_manifest``.
    """

    schema_version: int
    repo: str
    package: str
    tickets: List[Ticket]
    root: Path
