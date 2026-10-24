"""
Tests for manifest loading and local validation.

All tests are offline and use temporary directories; no GitHub interaction is
performed. The suite covers valid manifests plus duplicate ids, broken
references, invalid hierarchy, cycles, unsafe paths, symlinks, missing files,
missing headings, and CLI exit codes.
"""
from __future__ import annotations

import contextlib
import io
import json
import os
import pathlib
import shutil
import tempfile
import unittest

from scripts.github_tickets import manifest as manifest_module
from scripts.github_tickets.cli import main as cli_main
from scripts.github_tickets.manifest import ManifestLoadError

EPIC_HEADINGS = [
    "Feature Description",
    "Problem Statement",
    "Proposed Solution",
    "Alternative Solutions",
    "Impact",
    "Acceptance Criteria",
    "Additional Context",
    "Related Issues / PRs",
]
STORY_HEADINGS = [
    "Story Description",
    "Problem Statement",
    "Proposed Solution",
    "Alternative Solutions",
    "Impact",
    "Acceptance Criteria",
    "Additional Context",
    "Related Issues / PRs",
]
TASK_HEADINGS = [
    "Description",
    "Task List",
    "Technical Details",
    "DOD",
    "Dependencies",
    "Additional Context",
    "Related Issues / PRs",
]


def _real_manifest_path() -> pathlib.Path:
    """
    Locate the committed GitHub Automation package manifest.

    The search walks upward from this test file and also checks the current
    working directory, so the test works from any directory the runner is
    invoked from as long as ``tickets/packages/github-automation/manifest.json``
    exists under the repository root.

    Returns:
        The resolved manifest path.

    Raises:
        FileNotFoundError: If the fixture is not present under any repository
            root candidate (e.g. an incomplete review ZIP).
    """
    relative = pathlib.Path("tickets") / "packages" / "github-automation" / "manifest.json"
    candidates = []
    seen = set()
    current = pathlib.Path(__file__).resolve().parent
    while True:
        candidate = current / relative
        if candidate not in seen:
            candidates.append(candidate)
            seen.add(candidate)
        if current.parent == current:
            break
        current = current.parent
    cwd_candidate = pathlib.Path.cwd() / relative
    if cwd_candidate not in seen:
        candidates.append(cwd_candidate)

    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(
        "real package manifest not found under any repository root candidate; "
        "include the complete ticket fixture in the expected directory"
    )


def _infrastructure_manifest_path() -> pathlib.Path:
    """
    Locate the committed Infrastructure Roadmap Alignment package manifest.

    The search walks upward from this test file and also checks the current
    working directory, matching the behavior of :func:`_real_manifest_path`.

    Returns:
        The resolved manifest path.

    Raises:
        FileNotFoundError: If the fixture is not present under any repository
            root candidate.
    """
    relative = (
        pathlib.Path("tickets")
        / "packages"
        / "infrastructure-roadmap-alignment"
        / "manifest.json"
    )
    candidates = []
    seen = set()
    current = pathlib.Path(__file__).resolve().parent
    while True:
        candidate = current / relative
        if candidate not in seen:
            candidates.append(candidate)
            seen.add(candidate)
        if current.parent == current:
            break
        current = current.parent
    cwd_candidate = pathlib.Path.cwd() / relative
    if cwd_candidate not in seen:
        candidates.append(cwd_candidate)

    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise FileNotFoundError(
        "infrastructure-roadmap-alignment manifest not found under any "
        "repository root candidate"
    )


def body(*headings: str) -> str:
    """
    Build a Markdown body containing exactly the supplied headings.

    Args:
        headings: Heading names, each emitted as ``### <name>`` followed by a
            placeholder content line.

    Returns:
        The assembled Markdown body string.
    """
    return "\n\n".join(f"### {h}\n\ncontent\n" for h in headings)


def write_ticket(root: pathlib.Path, rel_path: str, text: str) -> pathlib.Path:
    """
    Write a ticket body file, creating parent directories as needed.

    Args:
        root: Package root under which the file is written.
        rel_path: Relative path of the file.
        text: File content.

    Returns:
        The written file's :class:`pathlib.Path`.
    """
    path = root / rel_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


class PackageBuilder:
    """Build a minimal valid package or a package with one mutation applied."""

    def __init__(self, base: str) -> None:
        """Create a builder rooted under ``base``.

        Args:
            base: Temporary directory path under which ``pkg/`` is created.
        """
        self.base = pathlib.Path(base)
        self.pkg = self.base / "pkg"
        self.pkg.mkdir(parents=True, exist_ok=True)

    def write(self, manifest: dict) -> pathlib.Path:
        """
        Write ``manifest.json`` and one body file per ticket.

        Args:
            manifest: The manifest dictionary to persist.

        Returns:
            Path to the written ``manifest.json``.
        """
        write_ticket(self.pkg, "manifest.json", json.dumps(manifest, indent=2))
        for ticket in manifest["tickets"]:
            headings = {
                "epic": EPIC_HEADINGS,
                "story": STORY_HEADINGS,
                "task": TASK_HEADINGS,
            }.get(ticket["type"], EPIC_HEADINGS)
            write_ticket(self.pkg, ticket["body"], body(*headings))
        return self.pkg / "manifest.json"

    def valid_manifest(self) -> dict:
        """
        Return a minimal, structurally valid manifest dictionary.

        Returns:
            A manifest with one Epic, one Story (mapped to issue 42), and one
            Task in a valid hierarchy.
        """
        return {
            "schema_version": 1,
            "repo": "owner/repo",
            "package": "test-package",
            "tickets": [
                {
                    "id": "EPIC-1",
                    "type": "epic",
                    "title": "Epic One",
                    "body": "epics/epic-one.md",
                    "parent": None,
                    "labels": ["EPIC"],
                    "depends_on": [],
                    "related": [],
                    "issue_number": None,
                },
                {
                    "id": "STORY-1",
                    "type": "story",
                    "title": "Story One",
                    "body": "stories/story-one.md",
                    "parent": "EPIC-1",
                    "labels": ["STORY"],
                    "depends_on": [],
                    "related": [],
                    "issue_number": 42,
                },
                {
                    "id": "TASK-1",
                    "type": "task",
                    "title": "Task One",
                    "body": "tasks/task-one.md",
                    "parent": "STORY-1",
                    "labels": ["TASK"],
                    "depends_on": ["STORY-1"],
                    "related": ["EPIC-1"],
                    "issue_number": None,
                },
            ],
        }


class ManifestTestCase(unittest.TestCase):
    """Validation-focused tests that never touch the network."""

    def setUp(self) -> None:
        """
        Create a fresh temporary directory for each test.

        Side effects:
            Stores a :class:`tempfile.TemporaryDirectory` on ``self.tmp`` and
            registers its cleanup so it is removed after the test.
        """
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def load(self, manifest: dict):
        """
        Write ``manifest`` to disk and load it.

        Args:
            manifest: The manifest dictionary.

        Returns:
            The loaded :class:`scripts.github_tickets.model.Manifest`.
        """
        path = PackageBuilder(self.tmp.name).write(manifest)
        return manifest_module.load_manifest(str(path))

    def rewrite_manifest(self, data: dict) -> str:
        """
        Write a valid package, overwrite its manifest, and reload it.

        Args:
            data: Manifest dictionary to persist in place of the valid one.

        Returns:
            Path to the rewritten manifest.
        """
        path = PackageBuilder(self.tmp.name).write(PackageBuilder(self.tmp.name).valid_manifest())
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        return str(path)

    def test_valid_manifest_validates_without_errors(self) -> None:
        """A valid three-ticket manifest produces no errors."""
        builder = PackageBuilder(self.tmp.name)
        path = builder.write(builder.valid_manifest())
        manifest = manifest_module.load_manifest(str(path))
        errors, warnings = manifest_module.validate_manifest(manifest)
        self.assertEqual(errors, [], errors)
        self.assertEqual(len(manifest.tickets), 3)

    def test_real_package_validates(self) -> None:
        """The committed GitHub Automation package validates with 8 tickets."""
        path = _real_manifest_path()
        manifest = manifest_module.load_manifest(str(path))
        errors, warnings = manifest_module.validate_manifest(manifest)
        self.assertEqual(errors, [], errors)
        self.assertEqual(len(manifest.tickets), 8)

    def test_infrastructure_manifest_epic_direct_task_parent_validates(self) -> None:
        """INFRA-DOC-01 validates with INFRA-EPIC-29 as its direct parent."""
        path = _infrastructure_manifest_path()
        manifest = manifest_module.load_manifest(str(path))
        errors, warnings = manifest_module.validate_manifest(manifest)
        self.assertEqual(errors, [], errors)
        by_id = {ticket.id: ticket for ticket in manifest.tickets}
        self.assertIn("INFRA-DOC-01", by_id)
        self.assertIn("INFRA-EPIC-29", by_id)
        self.assertEqual(by_id["INFRA-DOC-01"].parent, "INFRA-EPIC-29")
        self.assertEqual(by_id["INFRA-DOC-01"].type, "task")
        self.assertEqual(by_id["INFRA-EPIC-29"].type, "epic")

    def test_duplicate_ids_are_rejected(self) -> None:
        """Two tickets with the same id are rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][1]["id"] = "EPIC-1"
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("Duplicate ticket id" in e for e in errors), errors)

    def test_missing_parent_reference_is_rejected(self) -> None:
        """A parent id that does not exist is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][1]["parent"] = "MISSING"
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("unknown parent" in e for e in errors), errors)

    def test_invalid_hierarchy_is_rejected(self) -> None:
        """A Task with a Task parent violates the hierarchy rules."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"].append(
            {
                "id": "TASK-2",
                "type": "task",
                "title": "Task Two",
                "body": "tasks/task-two.md",
                "parent": "TASK-1",
                "labels": ["TASK"],
                "depends_on": [],
                "related": [],
                "issue_number": None,
            }
        )
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(
            any("must have an Epic or Story parent" in e for e in errors), errors
        )

    def test_task_with_epic_parent_is_allowed(self) -> None:
        """A Task whose direct parent is an Epic validates successfully."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][2]["parent"] = "EPIC-1"
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertEqual(errors, [], errors)

    def test_story_with_task_parent_is_rejected(self) -> None:
        """A Story with a Task parent violates the hierarchy rules."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][1]["parent"] = "TASK-1"
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("must have an Epic parent" in e for e in errors), errors)

    def test_epic_with_parent_is_rejected(self) -> None:
        """An Epic with any parent is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][0]["parent"] = "STORY-1"
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("cannot have a parent" in e for e in errors), errors)

    def test_dependency_cycle_is_detected(self) -> None:
        """A dependency cycle across parent and depends_on edges is detected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][0]["depends_on"] = ["TASK-1"]
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("Dependency cycle" in e for e in errors), errors)

    def test_unknown_dependency_is_rejected(self) -> None:
        """A depends_on reference to a missing id is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][2]["depends_on"] = ["NOPE"]
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("unknown dependency" in e for e in errors), errors)

    def test_unsafe_path_traversal_is_rejected(self) -> None:
        """A body path containing ``..`` is rejected."""
        builder = PackageBuilder(self.tmp.name)
        path = builder.write(builder.valid_manifest())
        manifest = manifest_module.load_manifest(str(path))
        manifest.tickets[0].body = "../outside.md"
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("unsafe body path" in e for e in errors), errors)

    def test_absolute_path_is_rejected(self) -> None:
        """An absolute body path is rejected."""
        builder = PackageBuilder(self.tmp.name)
        path = builder.write(builder.valid_manifest())
        manifest = manifest_module.load_manifest(str(path))
        manifest.tickets[0].body = "/etc/passwd"
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("unsafe body path" in e for e in errors), errors)

    def test_invalid_body_path_type_is_rejected(self) -> None:
        """A non-string body path is rejected."""
        builder = PackageBuilder(self.tmp.name)
        path = builder.write(builder.valid_manifest())
        manifest = manifest_module.load_manifest(str(path))
        manifest.tickets[0].body = 123  # type: ignore[assignment]
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("body path is required" in e for e in errors), errors)

    @unittest.skipIf(os.name == "nt", "symlinks require Unix-like filesystem")
    def test_symlink_body_path_is_rejected(self) -> None:
        """A body path that is a symlink pointing outside is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        manifest_path = builder.write(data)
        manifest = manifest_module.load_manifest(str(manifest_path))
        outside = pathlib.Path(self.tmp.name) / "outside.md"
        outside.write_text("outside", encoding="utf-8")
        link = manifest.root / "epics" / "linked.md"
        link.symlink_to(outside)
        manifest.tickets[0].body = "epics/linked.md"
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("unsafe body path" in e for e in errors), errors)

    @unittest.skipIf(os.name == "nt", "symlinks require Unix-like filesystem")
    def test_intermediate_directory_symlink_is_rejected(self) -> None:
        """A directory symlink inside the body path is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        manifest_path = builder.write(data)
        manifest = manifest_module.load_manifest(str(manifest_path))
        outside_dir = pathlib.Path(self.tmp.name) / "outside"
        outside_dir.mkdir()
        (outside_dir / "body.md").write_text("outside", encoding="utf-8")
        # Replace the real "epics" directory with a symlink to outside.
        epics = manifest.root / "epics"
        shutil.rmtree(epics)
        epics.symlink_to(outside_dir, target_is_directory=True)
        manifest.tickets[0].body = "epics/body.md"
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("unsafe body path" in e for e in errors), errors)

    def test_missing_body_file_is_rejected(self) -> None:
        """A body path that resolves to no file is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        manifest_path = builder.write(data)
        manifest = manifest_module.load_manifest(str(manifest_path))
        missing = manifest.root / manifest.tickets[0].body
        missing.unlink()
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("body file not found" in e for e in errors), errors)

    def test_missing_required_heading_is_rejected(self) -> None:
        """A body missing a required template heading is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        manifest = self.load(data)
        epic = manifest.tickets[0]
        write_ticket(
            pathlib.Path(manifest.root),
            epic.body,
            body(*[h for h in EPIC_HEADINGS if h != "Acceptance Criteria"]),
        )
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(
            any("missing required heading '### Acceptance Criteria'" in e for e in errors),
            errors,
        )

    def test_invalid_type_is_rejected(self) -> None:
        """An unsupported ticket type is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][0]["type"] = "milestone"
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("invalid type" in e for e in errors), errors)

    def test_unsupported_schema_version_is_rejected(self) -> None:
        """An unsupported schema version is rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["schema_version"] = 99
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("Unsupported schema_version" in e for e in errors), errors)

    def test_duplicate_issue_number_is_rejected(self) -> None:
        """Two tickets mapping to the same issue number are rejected."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][2]["issue_number"] = 42
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("Conflicting issue_number 42" in e for e in errors), errors)

    def test_missing_manifest_file_raises(self) -> None:
        """Loading a nonexistent manifest raises ManifestLoadError."""
        with self.assertRaises(ManifestLoadError):
            manifest_module.load_manifest(str(self.tmp.name + "/nope.json"))


    def test_tickets_non_list_is_rejected(self) -> None:
        """A non-list ``tickets`` value raises ManifestLoadError."""
        path = self.pkg_path = pathlib.Path(self.tmp.name) / "bad.json"
        path.write_text(json.dumps({"tickets": "abc"}), encoding="utf-8")
        with self.assertRaises(ManifestLoadError):
            manifest_module.load_manifest(str(path))

    def test_null_ticket_entry_is_rejected(self) -> None:
        """A null entry inside ``tickets`` raises ManifestLoadError."""
        path = pathlib.Path(self.tmp.name) / "bad.json"
        path.write_text(json.dumps({"tickets": [None]}), encoding="utf-8")
        with self.assertRaises(ManifestLoadError):
            manifest_module.load_manifest(str(path))

    def test_non_object_ticket_entry_is_rejected(self) -> None:
        """A scalar entry inside ``tickets`` raises ManifestLoadError."""
        path = pathlib.Path(self.tmp.name) / "bad.json"
        path.write_text(json.dumps({"tickets": [7]}), encoding="utf-8")
        with self.assertRaises(ManifestLoadError):
            manifest_module.load_manifest(str(path))

    def test_labels_non_list_produces_error(self) -> None:
        """A non-list ``labels`` value is reported as a validation error."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][0]["labels"] = 17
        path = self.rewrite_manifest(data)
        manifest = manifest_module.load_manifest(path)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("labels must be a non-empty list" in e for e in errors), errors)

    def test_depends_on_non_list_produces_error(self) -> None:
        """A non-list ``depends_on`` value is reported as a validation error."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][2]["depends_on"] = 4
        path = self.rewrite_manifest(data)
        manifest = manifest_module.load_manifest(path)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("depends_on must be a list" in e for e in errors), errors)

    def test_related_non_list_produces_error(self) -> None:
        """A non-list ``related`` value is reported as a validation error."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][2]["related"] = 4
        path = self.rewrite_manifest(data)
        manifest = manifest_module.load_manifest(path)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("related must be a list" in e for e in errors), errors)

    def test_reference_non_string_element_produces_error(self) -> None:
        """A non-string dependency element is reported as a validation error."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][2]["depends_on"] = [7]
        path = self.rewrite_manifest(data)
        manifest = manifest_module.load_manifest(path)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("depends_on entries must be strings" in e for e in errors), errors)

    def test_story_without_parent_is_allowed(self) -> None:
        """A standalone Story with no parent validates successfully."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][1]["parent"] = None
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertEqual(errors, [], errors)

    def test_task_without_parent_is_allowed(self) -> None:
        """A standalone Task with no parent validates successfully."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][2]["parent"] = None
        manifest = self.load(data)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertEqual(errors, [], errors)

    def test_invalid_type_values_are_rejected_without_exception(self) -> None:
        """Invalid ``type`` values (array/object/number/bool/null) error safely."""
        builder = PackageBuilder(self.tmp.name)
        for bad_type in ([], {}, 7, True, None):
            data = builder.valid_manifest()
            data["tickets"][0]["type"] = bad_type
            path = self.rewrite_manifest(data)
            manifest = manifest_module.load_manifest(path)
            errors, _ = manifest_module.validate_manifest(manifest)
            self.assertTrue(any("invalid type" in e for e in errors), (bad_type, errors))

    def test_invalid_utf8_manifest_raises_manifest_load_error(self) -> None:
        """A manifest with invalid UTF-8 bytes raises a controlled error."""
        path = pathlib.Path(self.tmp.name) / "bad-utf8.json"
        path.write_bytes(b"\xff\xfe\x00")
        with self.assertRaises(ManifestLoadError) as ctx:
            manifest_module.load_manifest(str(path))
        self.assertIn("not valid UTF-8", str(ctx.exception))

    def test_invalid_utf8_body_produces_error(self) -> None:
        """A body file with invalid UTF-8 bytes is reported as an error."""
        builder = PackageBuilder(self.tmp.name)
        path = builder.write(builder.valid_manifest())
        manifest = manifest_module.load_manifest(str(path))
        body_path = manifest.root / manifest.tickets[0].body
        body_path.write_bytes(b"\xff\xfe\x00")
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("body file is not valid UTF-8" in e for e in errors), errors)

    @unittest.skipIf(os.name == "nt", "permission semantics differ on Windows")
    def test_unreadable_manifest_raises_manifest_load_error(self) -> None:
        """An unreadable manifest file raises a controlled ManifestLoadError."""
        if hasattr(os, "geteuid") and os.geteuid() == 0:
            self.skipTest("running as root; file permissions are not enforced")
        path = pathlib.Path(self.tmp.name) / "unreadable.json"
        path.write_text('{"tickets": []}', encoding="utf-8")
        os.chmod(path, 0)
        try:
            with self.assertRaises(ManifestLoadError):
                manifest_module.load_manifest(str(path))
        finally:
            os.chmod(path, 0o600)

    def test_parent_wrong_type_is_rejected(self) -> None:
        """A non-string parent is reported as a hierarchy error."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][1]["parent"] = 17
        path = self.rewrite_manifest(data)
        manifest = manifest_module.load_manifest(path)
        errors, _ = manifest_module.validate_manifest(manifest)
        self.assertTrue(any("Story 'STORY-1' parent must be a string id" in e for e in errors), errors)


class CliTestCase(unittest.TestCase):
    """Exit-code and output tests for the ``validate`` subcommand."""

    def setUp(self) -> None:
        """
        Create a fresh temporary directory for each test.

        Side effects:
            Stores a :class:`tempfile.TemporaryDirectory` on ``self.tmp`` and
            registers its cleanup so it is removed after the test.
        """
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def test_validate_success_returns_zero(self) -> None:
        """A valid manifest exits with code 0."""
        builder = PackageBuilder(self.tmp.name)
        path = builder.write(builder.valid_manifest())
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = cli_main(["validate", "--manifest", str(path)])
        self.assertEqual(code, 0)

    def test_validate_failure_returns_nonzero(self) -> None:
        """An invalid manifest exits with a nonzero code."""
        builder = PackageBuilder(self.tmp.name)
        data = builder.valid_manifest()
        data["tickets"][1]["id"] = "EPIC-1"
        path = builder.write(data)
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = cli_main(["validate", "--manifest", str(path)])
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
