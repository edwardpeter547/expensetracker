"""
Tests for safe, idempotent plan execution and native sub-issue linking.

All tests are offline and use a fake GitHub client; no live GitHub API calls
are performed.
"""
from __future__ import annotations

import pathlib
import tempfile
import unittest

from scripts.github_tickets import planner as planner_module
from scripts.github_tickets.executor import (
    STATUS_COMPLETED,
    STATUS_FAILED,
    STATUS_PARTIAL,
    ExecutionError,
    execute_plan,
    verify_approved_plan,
)
from scripts.github_tickets.github import (
    GitHubAmbiguousParentError,
    GitHubAuthenticationError,
    GitHubNotFoundError,
    GitHubRequestError,
    Issue,
    Repo,
    discover_issues,
    ticket_id_marker,
)
from scripts.github_tickets.model import Manifest, Ticket

REPO = "acme/repo"


def make_ticket(ticket_id, ticket_type, title, parent=None, issue_number=None):
    """Build a manifest ticket."""
    return Ticket(
        id=ticket_id,
        type=ticket_type,
        title=title,
        body=f"{ticket_id}.md",
        parent=parent,
        labels=[ticket_type.upper()],
        depends_on=[],
        related=[],
        issue_number=issue_number,
    )


def make_issue(number, title, state="open", issue_id=None, body=""):
    """Build an existing issue with a global id."""
    return Issue(
        number=number,
        title=title,
        state=state,
        body=body,
        html_url=f"https://github.com/acme/repo/issues/{number}",
        is_pull_request=False,
        id=issue_id if issue_id is not None else 1000 + number,
    )


class FakeClient:
    """In-memory GitHub client for offline execution tests."""

    def __init__(self, issues, parent=None, children=None):
        self.repo = Repo.parse(REPO)
        self.issues = list(issues)
        self.parent = parent or {}
        self.children = children or {}
        self.create_calls = []
        self.create_bodies = []
        self.create_labels_calls = []
        self.add_calls = []

    def list_issues(self):
        return list(self.issues)

    def get_issue(self, number):
        for issue in self.issues:
            if issue.number == number:
                return issue
        raise GitHubNotFoundError(f"issue {number} not found")

    def list_sub_issues(self, number):
        return list(self.children.get(number, []))

    def get_parent_issue(self, number):
        return self.parent.get(number)  # None == confirmed parentless

    def add_sub_issue(self, parent_number, sub_issue_id):
        self.add_calls.append((parent_number, sub_issue_id))

    def create_issue(self, title, body, labels=None):
        number = max([issue.number for issue in self.issues] or [0]) + 1
        issue = make_issue(number, title, issue_id=5000 + number, body=body)
        self.issues.append(issue)
        self.create_calls.append(issue)
        self.create_bodies.append(body)
        self.create_labels_calls.append(labels)
        return issue


class RacingFakeClient(FakeClient):
    """A client where an issue appears after the initial verification."""

    def __init__(self):
        """Create a client that reports an existing Epic after first list."""
        super().__init__([])
        self.list_calls = 0
        self.preexisting = make_issue(
            10, "Epic One", issue_id=5010, body=ticket_id_marker("E1")
        )

    def list_issues(self):
        """Return an empty snapshot first, then a pre-existing Epic."""
        self.list_calls += 1
        if self.list_calls == 1:
            return []
        return [self.preexisting]


class AmbiguousCreateClient(FakeClient):
    """A client whose create POST is ambiguous but actually succeeded."""

    def __init__(self):
        """Create an empty client and a POST attempt counter."""
        super().__init__([])
        self.post_attempts = []

    def create_issue(self, title, body, labels=None):
        """Record a POST attempt, then report an ambiguous failure."""
        self.post_attempts.append(title)
        issue = make_issue(1, title, issue_id=5001, body=body)
        self.issues.append(issue)
        raise GitHubRequestError("timeout", status_code=500)


class UnknownCreateClient(FakeClient):
    """A client whose ambiguous create POST leaves no trace."""

    def __init__(self):
        """Create an empty client and a POST attempt counter."""
        super().__init__([])
        self.post_attempts = []

    def create_issue(self, title, body, labels=None):
        """Record a POST attempt, then report an ambiguous failure."""
        self.post_attempts.append(title)
        raise GitHubRequestError("timeout", status_code=500)


class DefinitiveCreateClient(FakeClient):
    """A client whose create POST fails definitively without a mutation."""

    def __init__(self):
        """Create an empty client and track reads and POST attempts."""
        super().__init__([])
        self.post_attempts = []
        self.list_calls = 0

    def create_issue(self, title, body, labels=None):
        """Record a POST attempt and raise a definitive 422 failure."""
        self.post_attempts.append(title)
        raise GitHubRequestError("validation failed", status_code=422)

    def list_issues(self):
        """Return an empty list and count read calls."""
        self.list_calls += 1
        return []


class WrongTitleCreateClient(FakeClient):
    """A client whose create POST returns an issue with the wrong title."""

    def __init__(self):
        """Create an empty client."""
        super().__init__([])

    def create_issue(self, title, body, labels=None):
        """Return an issue with an unexpected title."""
        issue = make_issue(1, "Different Title", issue_id=5001, body=body)
        self.issues.append(issue)
        self.create_calls.append(issue)
        return issue


class AmbiguousPreCreateClient(FakeClient):
    """A client that reports two marker matches just before creation."""

    def __init__(self):
        """Create an empty client and two ambiguous marker issues."""
        super().__init__([])
        self.list_calls = 0
        marker = ticket_id_marker("E1")
        self.ambiguous = [
            make_issue(10, "Epic One", issue_id=5010, body=marker),
            make_issue(11, "Epic One", issue_id=5011, body=marker),
        ]

    def list_issues(self):
        """Return an empty snapshot first, then the ambiguous pair."""
        self.list_calls += 1
        if self.list_calls == 1:
            return []
        return self.ambiguous


class WrongRepoReuseClient(FakeClient):
    """A client offering a marker match from the wrong repository."""

    def __init__(self):
        """Create an empty client and a wrong-repository candidate."""
        super().__init__([])
        self.list_calls = 0
        self.candidate = make_issue(
            10, "Epic One", issue_id=5010, body=ticket_id_marker("E1")
        )
        self.candidate.html_url = "https://github.com/other/repo/issues/10"

    def list_issues(self):
        """Return an empty snapshot first, then the wrong-repo issue."""
        self.list_calls += 1
        if self.list_calls == 1:
            return []
        return [self.candidate]


class ConflictingMarkerReuseClient(FakeClient):
    """A client offering a marker match with a conflicting marker."""

    def __init__(self):
        """Create an empty client and a multi-marker candidate."""
        super().__init__([])
        self.list_calls = 0
        body = ticket_id_marker("E1") + "\n" + ticket_id_marker("OTHER")
        self.candidate = make_issue(
            10, "Epic One", issue_id=5010, body=body
        )

    def list_issues(self):
        """Return an empty snapshot first, then the conflicting issue."""
        self.list_calls += 1
        if self.list_calls == 1:
            return []
        return [self.candidate]


class MarkerlessTitleClient(FakeClient):
    """A client that reports markerless issues after initial verification."""

    def __init__(self, candidates):
        """Create an empty client and store the post-approval candidates."""
        super().__init__([])
        self.list_calls = 0
        self.candidates = candidates

    def list_issues(self):
        """Return an empty snapshot first, then the configured candidates."""
        self.list_calls += 1
        if self.list_calls == 1:
            return []
        return list(self.candidates)


class ExecutorTestCase(unittest.TestCase):
    """Base setup for executor tests."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)
        self.tickets = [
            make_ticket("E1", "epic", "Epic One", issue_number=1),
            make_ticket("S1", "story", "Story One", parent="E1", issue_number=2),
            make_ticket("T1", "task", "Task One", parent="S1", issue_number=3),
        ]
        for ticket in self.tickets:
            (self.root / ticket.body).write_text(f"body-{ticket.id}\n", encoding="utf-8")
        self.manifest = Manifest(
            schema_version=1,
            repo=REPO,
            package="pkg",
            tickets=self.tickets,
            root=self.root,
        )
        self.issues = [
            make_issue(1, "Epic One"),
            make_issue(2, "Story One"),
            make_issue(3, "Task One"),
        ]
        self.client = FakeClient(self.issues)

    def approved_hash(self):
        discovery = discover_issues(self.client, self.tickets, issues=self.issues)
        plan = planner_module.build_plan(self.manifest, discovery, REPO, issues=self.issues)
        return planner_module.compute_plan_hash(plan)

    def test_parentless_children_are_linked(self):
        """Safely confirmed parentless children are linked via child id."""
        report = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(report.status, STATUS_COMPLETED)
        self.assertEqual(self.client.add_calls, [(1, 1002), (2, 1003)])
        self.assertEqual(len(report.linked), 2)
        self.assertEqual(len(self.client.create_calls), 0)

    def test_existing_relationship_is_skipped(self):
        """A child already linked to the intended parent is skipped."""
        self.client.children = {
            1: [make_issue(2, "Story One")],
            2: [make_issue(3, "Task One")],
        }
        report = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(report.status, STATUS_COMPLETED)
        self.assertEqual(self.client.add_calls, [])

    def test_conflicting_parent_is_reported_without_reparenting(self):
        """A child under another parent is a conflict, never reparented."""
        self.client.parent = {2: make_issue(99, "Other Parent")}
        report = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(report.status, STATUS_FAILED)
        self.assertEqual(self.client.add_calls, [])
        self.assertTrue(any(op.op == "CONFLICT" for op in report.operations))

    def test_ambiguous_parent_lookup_stops_without_post(self):
        """An ambiguous parent lookup stops with no POST."""
        def ambiguous(number):
            raise GitHubAmbiguousParentError("ambiguous")

        self.client.get_parent_issue = ambiguous
        report = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(report.status, STATUS_PARTIAL)
        self.assertEqual(self.client.add_calls, [])

    def test_permission_failure_during_parent_lookup_stops(self):
        """A permission failure stops with no POST."""
        def denied(number):
            raise GitHubRequestError("forbidden", status_code=403)

        self.client.get_parent_issue = denied
        report = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(report.status, STATUS_PARTIAL)
        self.assertEqual(self.client.add_calls, [])

    def test_missing_child_id_stops_before_later_relationships(self):
        """A child with no id stops before mutating later links."""
        self.issues[2].id = None
        self.client = FakeClient(self.issues)
        report = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(report.status, STATUS_FAILED)
        self.assertEqual(self.client.add_calls, [(1, 1002)])

    def test_stale_hash_rejects_without_mutations(self):
        """A wrong approved hash rejects before any mutation."""
        with self.assertRaises(ExecutionError):
            execute_plan(self.client, self.manifest, "0" * 64)
        self.assertEqual(self.client.add_calls, [])
        self.assertEqual(self.client.create_calls, [])

    def test_stale_state_rejects_without_mutations(self):
        """A changed GitHub state makes the approval stale."""
        hash_value = self.approved_hash()
        self.client.issues = [
            make_issue(1, "Epic One"),
            make_issue(2, "Story One"),
            make_issue(3, "Task One", state="closed"),
        ]
        with self.assertRaises(ExecutionError):
            execute_plan(self.client, self.manifest, hash_value)
        self.assertEqual(self.client.add_calls, [])
        self.assertEqual(self.client.create_calls, [])

    def test_api_failure_during_linking_stops_partial(self):
        """A link failure stops with a partial report."""
        def fail_add(parent_number, sub_issue_id):
            raise GitHubRequestError("boom", status_code=500)

        self.client.add_sub_issue = fail_add
        report = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(report.status, STATUS_PARTIAL)

    def test_rerun_after_success_skips_existing_links(self):
        """A second run after successful linking does not duplicate links."""
        first = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(first.status, STATUS_COMPLETED)
        self.client.children = {
            1: [make_issue(2, "Story One")],
            2: [make_issue(3, "Task One")],
        }
        second = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(second.status, STATUS_COMPLETED)
        self.assertEqual(len(self.client.add_calls), 2)

    def test_existing_issues_are_preserved(self):
        """EXISTS actions never create or modify existing issues."""
        report = execute_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(len(self.client.create_calls), 0)
        self.assertEqual(self.issues[0].title, "Epic One")

    def test_auth_failure_during_refresh_is_controlled(self):
        """Authentication failure during refresh raises ExecutionError."""
        self.client.list_issues = lambda: (_ for _ in ()).throw(GitHubAuthenticationError("denied"))
        with self.assertRaises(ExecutionError):
            execute_plan(self.client, self.manifest, self.approved_hash())

    def test_verify_approved_plan_makes_no_mutations(self):
        """Verification (and therefore dry-run) performs no mutations."""
        verify_approved_plan(self.client, self.manifest, self.approved_hash())
        self.assertEqual(self.client.add_calls, [])
        self.assertEqual(self.client.create_calls, [])

    def test_pre_mutation_identity_mismatch_rejected(self):
        """A fetched EXISTS issue differing from the approved identity aborts."""
        hash_value = self.approved_hash()
        original_get_issue = self.client.get_issue

        def altered_get_issue(number):
            issue = original_get_issue(number)
            if number == 1:
                return make_issue(1, "Different Title", issue_id=issue.id)
            return issue

        self.client.get_issue = altered_get_issue
        with self.assertRaises(ExecutionError):
            execute_plan(self.client, self.manifest, hash_value)
        self.assertEqual(self.client.add_calls, [])


class CreateExecutionTest(unittest.TestCase):
    """Explicitly authorized issue creation and guarded linking."""

    def setUp(self):
        """Create a temporary package directory."""
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)

    def _write_manifest(self, tickets):
        """Write body files and build a manifest from ``tickets``."""
        for ticket in tickets:
            (self.root / ticket.body).write_text(
                f"body-{ticket.id}\n", encoding="utf-8"
            )
        return Manifest(
            schema_version=1,
            repo=REPO,
            package="pkg",
            tickets=tickets,
            root=self.root,
        )

    def make_create_manifest(self):
        """Build an Epic -> Story -> Task package with no issue numbers."""
        tickets = [
            make_ticket("E1", "epic", "Epic One", issue_number=None),
            make_ticket("S1", "story", "Story One", parent="E1", issue_number=None),
            make_ticket("T1", "task", "Task One", parent="S1", issue_number=None),
        ]
        return self._write_manifest(tickets)

    def make_single_manifest(self):
        """Build a single-Epic package with no issue number."""
        return self._write_manifest(
            [make_ticket("E1", "epic", "Epic One", issue_number=None)]
        )

    def approved_hash(self, manifest, client, allow_create=True):
        """Compute the approved hash for a create-authorized plan."""
        discovery = discover_issues(
            client, manifest.tickets, issues=client.issues
        )
        plan = planner_module.build_plan(
            manifest,
            discovery,
            REPO,
            issues=client.issues,
            allow_create=allow_create,
        )
        return planner_module.compute_plan_hash(plan)

    def test_allow_create_creates_in_order_and_links(self):
        """Authorized creation creates parents first and links new issues."""
        manifest = self.make_create_manifest()
        client = FakeClient([])
        hash_value = self.approved_hash(manifest, client)

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_COMPLETED)
        self.assertEqual(
            [issue.title for issue in client.create_calls],
            ["Epic One", "Story One", "Task One"],
        )
        self.assertEqual(
            [issue.number for issue in client.create_calls], [1, 2, 3]
        )
        self.assertEqual(
            client.create_labels_calls, [["EPIC"], ["STORY"], ["TASK"]]
        )
        for issue, ticket_id in zip(
            client.create_calls, ["E1", "S1", "T1"]
        ):
            self.assertIn(ticket_id_marker(ticket_id), issue.body)
        self.assertEqual(client.add_calls, [(1, 5002), (2, 5003)])
        self.assertEqual(report.created_issues, ["E1", "S1", "T1"])

    def test_apply_without_allow_create_rejects_create_plan(self):
        """A create-authorized hash cannot be applied without --allow-create."""
        manifest = self.make_create_manifest()
        client = FakeClient([])
        hash_value = self.approved_hash(manifest, client)

        with self.assertRaises(ExecutionError) as ctx:
            execute_plan(client, manifest, hash_value)

        self.assertIn("--allow-create", str(ctx.exception))
        self.assertEqual(client.create_calls, [])
        self.assertEqual(client.add_calls, [])

    def test_pre_create_revalidation_skips_duplicate(self):
        """An issue appearing after approval is preserved, not duplicated."""
        manifest = self.make_create_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = RacingFakeClient()

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_COMPLETED)
        self.assertEqual(
            [issue.title for issue in client.create_calls],
            ["Story One", "Task One"],
        )
        self.assertNotIn("E1", report.created_issues)
        self.assertIn("S1", report.created_issues)
        self.assertIn("T1", report.created_issues)
        self.assertEqual(len(client.add_calls), 2)

    def test_ambiguous_create_failure_reconciles_without_retry(self):
        """An ambiguous POST is reconciled with a read-only lookup, not retried."""
        manifest = self.make_single_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = AmbiguousCreateClient()

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_COMPLETED)
        self.assertEqual(client.post_attempts, ["Epic One"])
        self.assertEqual(report.created_issues, ["E1"])

    def test_ambiguous_create_unknown_stops_without_retry(self):
        """An unreconcilable ambiguous POST stops as PARTIAL without retrying."""
        manifest = self.make_single_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = UnknownCreateClient()

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_PARTIAL)
        self.assertEqual(client.post_attempts, ["Epic One"])
        self.assertEqual(report.created_issues, [])

    def test_definitive_create_failure_is_not_reconciled(self):
        """A definitive 422 create failure stops without a reconciliation read."""
        manifest = self.make_single_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = DefinitiveCreateClient()

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_PARTIAL)
        self.assertEqual(client.post_attempts, ["Epic One"])
        self.assertEqual(client.list_calls, 2)

    def test_created_identity_mismatch_stops(self):
        """A created issue whose identity cannot be verified stops execution."""
        manifest = self.make_single_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = WrongTitleCreateClient()

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_PARTIAL)
        self.assertTrue(
            any("title differs" in error for error in report.errors)
        )

    def test_pre_create_ambiguity_blocks_without_mutation(self):
        """Ambiguous identities immediately before creation block the POST."""
        manifest = self.make_single_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = AmbiguousPreCreateClient()

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_FAILED)
        self.assertEqual(client.create_calls, [])
        self.assertEqual(client.add_calls, [])
        self.assertTrue(any(op.op == "CONFLICT" for op in report.operations))

    def test_reuse_rejects_wrong_repository_url(self):
        """A marker match from another repository is never reused."""
        manifest = self.make_single_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = WrongRepoReuseClient()

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_FAILED)
        self.assertEqual(client.create_calls, [])
        self.assertTrue(any("URL" in error for error in report.errors))

    def test_reuse_rejects_conflicting_marker_spec(self):
        """A candidate carrying extra markers is reported and not reused."""
        manifest = self.make_single_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = ConflictingMarkerReuseClient()

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_FAILED)
        self.assertEqual(client.create_calls, [])
        self.assertTrue(
            any("marker specification" in error for error in report.errors)
        )

    def test_markerless_identical_title_blocks_create(self):
        """A markerless identical-title issue appearing late blocks creation."""
        manifest = self.make_single_manifest()
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = MarkerlessTitleClient(
            [make_issue(10, "Epic One", issue_id=5010)]
        )

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_FAILED)
        self.assertEqual(client.create_calls, [])
        self.assertTrue(any(op.op == "CONFLICT" for op in report.operations))
        self.assertTrue(any("#10" in error for error in report.errors))

    def test_markerless_normalized_title_variant_blocks_create(self):
        """A normalized title variant appearing late blocks creation."""
        manifest = self._write_manifest(
            [
                make_ticket(
                    "E1",
                    "epic",
                    "[TASK] Enable Manual Creation",
                    issue_number=None,
                )
            ]
        )
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = MarkerlessTitleClient(
            [make_issue(10, "Enable Manual Creation", issue_id=5010)]
        )

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_FAILED)
        self.assertEqual(client.create_calls, [])
        self.assertTrue(any("#10" in error for error in report.errors))

    def test_markerless_unrelated_title_does_not_block_create(self):
        """An unrelated markerless issue does not block safe creation."""
        manifest = self._write_manifest(
            [
                make_ticket(
                    "E1",
                    "epic",
                    "[TASK] Enable Manual Creation",
                    issue_number=None,
                )
            ]
        )
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = MarkerlessTitleClient(
            [make_issue(10, "Fix the login screen", issue_id=5010)]
        )

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_COMPLETED)
        self.assertEqual(len(client.create_calls), 1)

    def test_markerless_multiple_plausible_candidates_block_create(self):
        """Multiple plausible title candidates block creation with diagnostics."""
        manifest = self._write_manifest(
            [
                make_ticket(
                    "E1",
                    "epic",
                    "[TASK] Enable Manual Creation",
                    issue_number=None,
                )
            ]
        )
        hash_value = self.approved_hash(manifest, FakeClient([]))
        client = MarkerlessTitleClient(
            [
                make_issue(10, "Enable Manual Creation", issue_id=5010),
                make_issue(
                    11, "[TASK] Enable Manual Creation", issue_id=5011
                ),
            ]
        )

        report = execute_plan(client, manifest, hash_value, allow_create=True)

        self.assertEqual(report.status, STATUS_FAILED)
        self.assertEqual(client.create_calls, [])
        self.assertTrue(any("#10" in error for error in report.errors))
        self.assertTrue(any("#11" in error for error in report.errors))


if __name__ == "__main__":
    unittest.main()
