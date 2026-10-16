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
        return issue


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


if __name__ == "__main__":
    unittest.main()
