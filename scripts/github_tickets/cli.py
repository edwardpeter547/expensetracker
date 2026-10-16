"""Command-line interface for the GitHub ticket automation tool.

This module wires argparse subcommands to the underlying modules and converts
validation results into exit codes:

    0 — success
    1 — validation/load failure
    2 — command-line usage error (handled by argparse)

Only the ``validate`` subcommand is implemented in Task 01. ``plan`` and
``apply`` are added by later tasks.
"""
from __future__ import annotations

import argparse
import sys
from typing import List, Optional

from scripts.github_tickets import manifest as manifest_module
from scripts.github_tickets.manifest import ManifestLoadError


def build_parser() -> argparse.ArgumentParser:
    """Build and return the top-level argument parser.

    Returns:
        An :class:`argparse.ArgumentParser` with the ``validate`` subcommand
        registered and wired to :func:`_run_validate` via ``set_defaults``.
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

    return parser


def _run_validate(args: argparse.Namespace) -> int:
    """Run the ``validate`` subcommand.

    Args:
        args: Parsed arguments; must expose ``args.manifest`` as a string
            path to the manifest file.

    Returns:
        ``0`` when the manifest is valid, ``1`` when it is invalid or cannot
        be loaded.

    Side effects:
        Prints a success summary to stdout, or warnings/errors to stderr.
        Makes no network calls.
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
