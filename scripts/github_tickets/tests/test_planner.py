"""
Tests for deterministic read-only planning, artifacts, and approval.

All tests are offline and use temporary filesystem fixtures plus mocked GitHub
clients; no live GitHub API calls are performed.
"""
from __future__ import annotations

import contextlib
import io
import json as json_module
import pathlib
import tempfile
import unittest
from types import SimpleNamespace
from unittest import mock

from scripts.github_tickets import cli as cli_module
from scripts.github_tickets import planner as planner_module
from scripts.github_tickets.github import (
    AmbiguousMatch,
    DiscoveryResult,
    Issue,
    IssueConflict,
    PullRequestReference,
    Repo,
    RepositoryMismatch,
    TicketMatch,
    TitleMismatch,
    discover_issues,
)
from scripts.github_tickets.model import Manifest, Ticket
from scripts.github_tickets.planner import (
    ACTION_BLOCKED,
    ACTION_EXISTS,
    ACTION_REVIEW_REQUIRED,
    ApprovalResult,
    ArtifactVerification,
    PlannerError,
    Plan,
    approve_plan,
    build_plan,
    compute_plan_hash,
    plan_artifact_dict,
    verify_plan_artifact,
    write_plan_artifact,
)

REPO = "acme/repo"


def make_ticket(
    ticket_id: str,
    ticket_type: str = "task",
    title: str = "Ticket",
    parent=None,
    issue_number=None,
    body: str = "body.md",
) -> Ticket:
    """
    Build a manifest Ticket for planning tests.

    Args:
        ticket_id: Ticket identifier.
        ticket_type: Ticket type.
        title: Ticket title.
        parent: Parent ticket identifier or ``None``.
        issue_number: Optional existing issue number.
        body: Relative body path.

    Returns:
        A constructed :class:`Ticket`.
    """
    return Ticket(
        id=ticket_id,
        type=ticket_type,
        title=title,
        body=body,
        parent=parent,
        labels=[ticket_type.upper()],
        depends_on=[],
        related=[],
        issue_number=issue_number,
    )


def make_manifest(tickets, root: pathlib.Path) -> Manifest:
    """
    Build a manifest and write each ticket's body file under ``root``.

    Args:
        tickets: Manifest ticket entries.
        root: Directory under which body files are written.

    Returns:
        A constructed :class:`Manifest` whose body files exist.
    """
    for ticket in tickets:
        body_file = root / ticket.body
        body_file.parent.mkdir(parents=True, exist_ok=True)
        body_file.write_text(f"content-{ticket.id}\n", encoding="utf-8")
    return Manifest(
        schema_version=1,
        repo=REPO,
        package="test-package",
        tickets=tickets,
        root=root,
    )


def make_issue(
    number: int, title: str = "Ticket", state: str = "open", body: str = ""
) -> Issue:
    """
    Build an existing issue for discovery.

    Args:
        number: Issue number.
        title: Issue title.
        state: Issue state.
        body: Issue body.

    Returns:
        A constructed :class:`Issue`.
    """
    return Issue(
        number=number,
        title=title,
        state=state,
        body=body,
        html_url=f"https://github.com/acme/repo/issues/{number}",
        is_pull_request=False,
    )


def make_match(ticket_id: str, number: int, title: str, state: str = "open") -> TicketMatch:
    """
    Build a confirmed match result.

    Args:
        ticket_id: Ticket identifier.
        number: Issue number.
        title: Issue title.
        state: Issue state.

    Returns:
        A constructed :class:`TicketMatch`.
    """
    return TicketMatch(
        ticket_id=ticket_id,
        issue_number=number,
        title=title,
        url=f"https://github.com/acme/repo/issues/{number}",
        state=state,
        title_matches=True,
        match_source="issue_number",
    )


class FakeClient:
    """Minimal client stub with a repo attribute for discovery."""
    def __init__(self, repo: str = REPO) -> None:
        """Create a stub client."""
        self.repo = Repo.parse(repo)

    def get_issue(self, number: int) -> Issue:
        """Unused stub for discovery paths that resolve from the list."""
        raise AssertionError("get_issue should not be called")


class TmpTestCase(unittest.TestCase):
    """
    Base test case that provides a temporary package directory."""

    def setUp(self) -> None:
        """Create a temporary directory for body files."""
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)

    def manifest(self, tickets) -> Manifest:
        """Build a manifest with body files under the temporary root.

        Args:
            tickets: Manifest ticket entries.

        Returns:
            A validated manifest with writable body files.
        """
        return make_manifest(tickets, self.root)


class BuildPlanTest(TmpTestCase):
    """Plan action classification and relationship construction."""

    def test_matched_tickets_become_exists_with_relationships(self) -> None:
        """Confirmed matches classify EXISTS and produce relationship links."""
        tickets = [
            make_ticket("E1", "epic", "Epic One", parent=None, body="e1.md"),
            make_ticket("S1", "story", "Story One", parent="E1", body="s1.md"),
            make_ticket("T1", "task", "Task One", parent="S1", body="t1.md"),
        ]
        discovery = DiscoveryResult(
            matched=[
                make_match("E1", 1, "Epic One"),
                make_match("S1", 2, "Story One"),
                make_match("T1", 3, "Task One"),
            ]
        )
        plan = build_plan(self.manifest(tickets), discovery, REPO)
        self.assertEqual([a.action for a in plan.actions], [ACTION_EXISTS] * 3)
        self.assertEqual(len(plan.relationships), 2)
        self.assertEqual(plan.relationships[0].parent_id, "E1")
        self.assertEqual(plan.relationships[0].child_id, "S1")

    def test_unmatched_ticket_is_review_required_never_create(self) -> None:
        """An unmatched ticket is REVIEW_REQUIRED, never CREATE."""
        tickets = [make_ticket("E1", "epic", "Epic One", issue_number=None)]
        plan = build_plan(self.manifest(tickets), DiscoveryResult(), REPO)
        self.assertEqual(plan.actions[0].action, ACTION_REVIEW_REQUIRED)
        for action in plan.actions:
            self.assertNotEqual(action.action, planner_module.ACTION_CREATE)

    def test_title_mismatch_is_review_required(self) -> None:
        """A title mismatch on a matched issue is surfaced for review."""
        tickets = [make_ticket("E1", "epic", "Epic One", body="e1.md")]
        match = make_match("E1", 1, "Epic One")
        match.title_matches = False
        discovery = DiscoveryResult(
            matched=[match],
            title_mismatches=[TitleMismatch("E1", 1, "Epic One", "Something Else")],
        )
        plan = build_plan(self.manifest(tickets), discovery, REPO)
        self.assertEqual(plan.actions[0].action, ACTION_REVIEW_REQUIRED)

    def test_conflict_is_blocked(self) -> None:
        """An identity conflict classifies BLOCKED."""
        tickets = [make_ticket("E1", "epic", "Epic One")]
        discovery = DiscoveryResult(conflicts=[IssueConflict(1, ["E1", "X"])])
        plan = build_plan(self.manifest(tickets), discovery, REPO)
        self.assertEqual(plan.actions[0].action, ACTION_BLOCKED)

    def test_pull_request_reference_is_blocked(self) -> None:
        """A pull-request reference classifies BLOCKED."""
        tickets = [make_ticket("E1", "epic", "Epic One", issue_number=1)]
        discovery = DiscoveryResult(
            pull_request_references=[PullRequestReference("E1", 1, "PR", "u")]
        )
        plan = build_plan(self.manifest(tickets), discovery, REPO)
        self.assertEqual(plan.actions[0].action, ACTION_BLOCKED)

    def test_repository_mismatch_is_blocked(self) -> None:
        """A wrong-repository issue classifies BLOCKED."""
        tickets = [make_ticket("E1", "epic", "Epic One", issue_number=1)]
        discovery = DiscoveryResult(
            repository_mismatches=[
                RepositoryMismatch("E1", 1, "https://github.com/other/repo/issues/1")
            ]
        )
        plan = build_plan(self.manifest(tickets), discovery, REPO)
        self.assertEqual(plan.actions[0].action, ACTION_BLOCKED)

    def test_invalid_issue_number_is_blocked(self) -> None:
        """An invalid issue number classifies BLOCKED."""
        tickets = [make_ticket("E1", "epic", "Epic One")]
        discovery = DiscoveryResult(invalid_issue_numbers=["E1"])
        plan = build_plan(self.manifest(tickets), discovery, REPO)
        self.assertEqual(plan.actions[0].action, ACTION_BLOCKED)

    def test_ambiguous_is_review_required(self) -> None:
        """An ambiguous marker match classifies REVIEW_REQUIRED."""
        tickets = [make_ticket("E1", "epic", "Epic One")]
        discovery = DiscoveryResult(ambiguous=[AmbiguousMatch("E1", [1, 2])])
        plan = build_plan(self.manifest(tickets), discovery, REPO)
        self.assertEqual(plan.actions[0].action, ACTION_REVIEW_REQUIRED)

    def test_missing_body_raises_planner_error(self) -> None:
        """A ticket whose body file is missing fails safely."""
        ticket = make_ticket("E1", "epic", "Epic One", body="missing.md")
        manifest = Manifest(
            schema_version=1,
            repo=REPO,
            package="p",
            tickets=[ticket],
            root=self.root,
        )
        discovery = DiscoveryResult(matched=[make_match("E1", 1, "Epic One")])
        with self.assertRaises(PlannerError):
            build_plan(manifest, discovery, REPO)


class HashTest(TmpTestCase):
    """Plan hash determinism and sensitivity."""

    def _plan_for(self, issues, tickets=None, repo=REPO):
        """Build a plan for the given issues and optional tickets.

        Args:
            issues: Existing issues passed to discovery.
            tickets: Optional ticket list; defaults to a single Epic mapped to
                issue #1.
            repo: Optional target repository override.

        Returns:
            The built :class:`Plan`.
        """
        tickets = tickets or [
            make_ticket("E1", "epic", "Epic One", issue_number=1, body="e1.md")
        ]
        client = FakeClient(repo)
        discovery = discover_issues(client, tickets, issues=issues)
        return build_plan(self.manifest(tickets), discovery, repo)

    def test_identical_inputs_produce_identical_hash(self) -> None:
        """The same inputs produce the same hash."""
        issues = [make_issue(1, "Epic One")]
        first = self._plan_for(issues)
        second = self._plan_for([make_issue(1, "Epic One")])
        self.assertEqual(compute_plan_hash(first), compute_plan_hash(second))

    def test_reordered_issues_produce_identical_hash(self) -> None:
        """Reordering API results does not change the hash."""
        tickets = [
            make_ticket("E1", "epic", "Epic One", issue_number=1, body="e1.md"),
            make_ticket("S1", "story", "Story One", issue_number=2, parent="E1", body="s1.md"),
        ]
        issues_a = [make_issue(1, "Epic One"), make_issue(2, "Story One")]
        issues_b = [make_issue(2, "Story One"), make_issue(1, "Epic One")]
        hash_a = compute_plan_hash(self._plan_for(issues_a, tickets=tickets))
        hash_b = compute_plan_hash(self._plan_for(issues_b, tickets=tickets))
        self.assertEqual(hash_a, hash_b)

    def test_changed_issue_state_changes_hash(self) -> None:
        """A changed issue state changes the hash."""
        plan_open = self._plan_for([make_issue(1, "Epic One", state="open")])
        plan_closed = self._plan_for([make_issue(1, "Epic One", state="closed")])
        self.assertNotEqual(compute_plan_hash(plan_open), compute_plan_hash(plan_closed))

    def test_changed_issue_title_changes_hash(self) -> None:
        """A changed issue title changes the hash."""
        plan_a = self._plan_for([make_issue(1, "Epic One")])
        plan_b = self._plan_for([make_issue(1, "Different Title")])
        self.assertNotEqual(compute_plan_hash(plan_a), compute_plan_hash(plan_b))

    def test_changed_repo_changes_hash(self) -> None:
        """A changed target repository changes the hash."""
        plan_a = self._plan_for([make_issue(1, "Epic One")], repo="acme/repo")
        plan_b = self._plan_for([make_issue(1, "Epic One")], repo="other/repo")
        self.assertNotEqual(compute_plan_hash(plan_a), compute_plan_hash(plan_b))

    def test_body_content_change_changes_hash(self) -> None:
        """Modifying a body file while keeping its name changes the hash."""
        ticket = make_ticket("E1", "epic", "Epic One", issue_number=1, body="e1.md")
        manifest = self.manifest([ticket])
        (self.root / "e1.md").write_text("content-A\n", encoding="utf-8")
        discovery = DiscoveryResult(matched=[make_match("E1", 1, "Epic One")])
        hash_a = compute_plan_hash(build_plan(manifest, discovery, REPO))
        (self.root / "e1.md").write_text("content-B\n", encoding="utf-8")
        hash_b = compute_plan_hash(build_plan(manifest, discovery, REPO))
        self.assertNotEqual(hash_a, hash_b)

    def test_relationship_change_changes_hash(self) -> None:
        """A changed relationship operation changes the hash."""
        manifest = self.manifest(
            [
                make_ticket("E1", "epic", "Epic One", body="e1.md"),
                make_ticket("S1", "story", "Story One", parent="E1", body="s1.md"),
            ]
        )
        discovery = DiscoveryResult(
            matched=[make_match("E1", 1, "Epic One"), make_match("S1", 2, "Story One")]
        )
        plan_with = build_plan(manifest, discovery, REPO)
        manifest2 = self.manifest(
            [
                make_ticket("E1", "epic", "Epic One", body="e1.md"),
                make_ticket("S1", "story", "Story One", parent=None, body="s1.md"),
            ]
        )
        plan_without = build_plan(manifest2, discovery, REPO)
        self.assertNotEqual(compute_plan_hash(plan_with), compute_plan_hash(plan_without))


class ApprovalTest(TmpTestCase):
    """Explicit hash-bound approval and artifact integrity."""

    def _approved_plan(self) -> Plan:
        """Build a fully approved single-Epic plan.

        Returns:
            A :class:`Plan` whose only action is ``EXISTS`` for issue #1.
        """
        tickets = [make_ticket("E1", "epic", "Epic One", issue_number=1, body="e1.md")]
        discovery = DiscoveryResult(matched=[make_match("E1", 1, "Epic One")])
        return build_plan(self.manifest(tickets), discovery, REPO)

    def test_exact_hash_approves(self) -> None:
        """The exact plan hash approves."""
        plan = self._approved_plan()
        result = approve_plan(plan, compute_plan_hash(plan))
        self.assertIsInstance(result, ApprovalResult)
        self.assertTrue(result.approved)

    def test_wrong_hash_rejects(self) -> None:
        """An incorrect hash rejects."""
        plan = self._approved_plan()
        result = approve_plan(plan, "0" * 64)
        self.assertFalse(result.approved)

    def test_plan_with_blocker_rejects_even_with_correct_hash(self) -> None:
        """A plan with a blocker rejects even when the hash matches."""
        tickets = [make_ticket("E1", "epic", "Epic One", issue_number=1, body="e1.md")]
        discovery = DiscoveryResult(
            pull_request_references=[PullRequestReference("E1", 1, "PR", "u")]
        )
        plan = build_plan(self.manifest(tickets), discovery, REPO)
        result = approve_plan(plan, compute_plan_hash(plan))
        self.assertFalse(result.approved)

    def test_plan_with_review_required_rejects(self) -> None:
        """A plan with review-required actions rejects."""
        tickets = [make_ticket("E1", "epic", "Epic One")]
        plan = build_plan(self.manifest(tickets), DiscoveryResult(), REPO)
        result = approve_plan(plan, compute_plan_hash(plan))
        self.assertFalse(result.approved)

    def test_body_change_rejects_old_approval_hash(self) -> None:
        """A body content change invalidates the previously approved hash."""
        ticket = make_ticket("E1", "epic", "Epic One", issue_number=1, body="e1.md")
        manifest = self.manifest([ticket])
        discovery = DiscoveryResult(matched=[make_match("E1", 1, "Epic One")])
        plan_a = build_plan(manifest, discovery, REPO)
        old_hash = compute_plan_hash(plan_a)
        (self.root / "e1.md").write_text("changed-content\n", encoding="utf-8")
        plan_b = build_plan(manifest, discovery, REPO)
        self.assertFalse(approve_plan(plan_b, old_hash).approved)

    def test_issue_identity_change_rejects_old_approval_hash(self) -> None:
        """An issue state change invalidates the previously approved hash."""
        ticket = make_ticket("E1", "epic", "Epic One", issue_number=1, body="e1.md")
        manifest = self.manifest([ticket])
        discovery = DiscoveryResult(matched=[make_match("E1", 1, "Epic One", state="open")])
        plan_a = build_plan(manifest, discovery, REPO)
        old_hash = compute_plan_hash(plan_a)
        discovery2 = DiscoveryResult(matched=[make_match("E1", 1, "Epic One", state="closed")])
        plan_b = build_plan(manifest, discovery2, REPO)
        self.assertFalse(approve_plan(plan_b, old_hash).approved)

    def test_artifact_round_trip_verifies(self) -> None:
        """A written artifact verifies its own integrity."""
        plan = self._approved_plan()
        path = self.root / "plan.json"
        write_plan_artifact(plan, str(path))
        self.assertTrue(path.is_file())
        artifact = json_module.loads(path.read_text(encoding="utf-8"))
        verification = verify_plan_artifact(artifact)
        self.assertIsInstance(verification, ArtifactVerification)
        self.assertTrue(verification.valid)

    def test_tampered_artifact_fails_verification(self) -> None:
        """A tampered artifact fails integrity verification."""
        plan = self._approved_plan()
        artifact = plan_artifact_dict(plan)
        artifact["plan"]["actions"][0]["action"] = "CREATE"
        self.assertFalse(verify_plan_artifact(artifact).valid)

    def test_write_artifact_refuses_overwrite(self) -> None:
        """Writing over an existing artifact is refused."""
        plan = self._approved_plan()
        path = self.root / "plan.json"
        write_plan_artifact(plan, str(path))
        with self.assertRaises(PlannerError):
            write_plan_artifact(plan, str(path))



    def test_invalid_approval_hash_formats_rejected(self) -> None:
        """Truncated, malformed, and uppercase hashes are rejected."""
        plan = self._approved_plan()
        bad_hashes = [
            "0" * 63,          # truncated
            "0" * 65,          # too long
            "g" * 64,          # non-hex character
            "A" * 64,          # uppercase
            "0" * 32 + "xyz" + "0" * 29,  # malformed mix
            "not-a-hash",
            None,
        ]
        for bad in bad_hashes:
            result = approve_plan(plan, bad)
            self.assertFalse(result.approved, bad)
            self.assertIn("64 lowercase hexadecimal", result.reason)

    def test_overwrite_refusal_preserves_existing_content(self) -> None:
        """An exclusive write refuses overwrite and keeps original content."""
        plan = self._approved_plan()
        path = self.root / "plan.json"
        write_plan_artifact(plan, str(path))
        original = path.read_text(encoding="utf-8")
        with self.assertRaises(PlannerError):
            write_plan_artifact(plan, str(path))
        self.assertEqual(path.read_text(encoding="utf-8"), original)

class CliPlanTest(TmpTestCase):
    """CLI ``plan`` command integration with a mocked client."""

    def _run_plan(self, argv, issues):
        """Run the CLI ``plan`` command against a mocked client.

        Args:
            argv: CLI argument list (without the program name).
            issues: Existing issues returned by the mocked client.

        Returns:
            The CLI exit code.
        """
        fake_client = SimpleNamespace(
            repo=Repo.parse(REPO),
            list_issues=mock.Mock(return_value=issues),
        )
        with mock.patch.object(cli_module, "GitHubClient", return_value=fake_client):
            return cli_module.main(argv)

    def _write_package(self, body_text=None):
        """Write a minimal valid package and return its manifest path.

        Args:
            body_text: Optional body content; defaults to a complete Epic body
                with all required template headings.

        Returns:
            The path to the written ``manifest.json``.
        """
        pkg = self.root / "pkg"
        pkg.mkdir()
        (pkg / "manifest.json").write_text(
            json_module.dumps(
                {
                    "schema_version": 1,
                    "repo": REPO,
                    "package": "p",
                    "tickets": [
                        {
                            "id": "E1",
                            "type": "epic",
                            "title": "Epic One",
                            "body": "e.md",
                            "parent": None,
                            "labels": ["EPIC"],
                            "depends_on": [],
                            "related": [],
                            "issue_number": 1,
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        body_text = body_text or (
            "### Feature Description\nEpic\n\n"
            "### Problem Statement\nProblem\n\n"
            "### Proposed Solution\nSolution\n\n"
            "### Alternative Solutions\nAlt\n\n"
            "### Impact\nImpact\n\n"
            "### Acceptance Criteria\nCriteria\n\n"
            "### Additional Context\nContext\n\n"
            "### Related Issues / PRs\nNone\n"
        )
        (pkg / "e.md").write_text(body_text, encoding="utf-8")
        return str(pkg / "manifest.json")

    def test_plan_success_exit_zero(self) -> None:
        """A valid manifest with matches exits zero and prints the hash."""
        manifest_path = self._write_package()
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = self._run_plan(
                ["plan", "--manifest", manifest_path], [make_issue(1, "Epic One")]
            )
        self.assertEqual(code, 0)
        self.assertIn("Plan hash (SHA-256):", out.getvalue())

    def test_plan_writes_artifact(self) -> None:
        """--output writes a deterministic plan.json artifact."""
        manifest_path = self._write_package()
        output = self.root / "plan.json"
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = self._run_plan(
                ["plan", "--manifest", manifest_path, "--output", str(output)],
                [make_issue(1, "Epic One")],
            )
        self.assertEqual(code, 0)
        self.assertTrue(output.is_file())
        artifact = json_module.loads(output.read_text(encoding="utf-8"))
        self.assertTrue(verify_plan_artifact(artifact).valid)

    def test_plan_approve_wrong_hash_exits_nonzero(self) -> None:
        """Approval with the wrong hash exits nonzero."""
        manifest_path = self._write_package()
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = self._run_plan(
                ["plan", "--manifest", manifest_path, "--approve", "0" * 64],
                [make_issue(1, "Epic One")],
            )
        self.assertEqual(code, 1)


if __name__ == "__main__":
    unittest.main()
