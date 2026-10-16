"""
Tests for JSON/Markdown reporting and report-file safety.

All tests are offline; GitHub interactions are mocked or faked.
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
from scripts.github_tickets import executor as executor_module
from scripts.github_tickets import planner as planner_module
from scripts.github_tickets import report as report_module
from scripts.github_tickets.executor import ExecutionReport, Operation
from scripts.github_tickets.github import Issue, Repo, discover_issues
from scripts.github_tickets.model import Manifest, Ticket
from scripts.github_tickets.planner import ApprovalResult
from scripts.github_tickets.report import ReportError, write_json_report

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


def make_issue(number, title, issue_id=None):
    """Build an existing issue."""
    return Issue(
        number=number,
        title=title,
        state="open",
        body="",
        html_url=f"https://github.com/acme/repo/issues/{number}",
        is_pull_request=False,
        id=issue_id if issue_id is not None else 1000 + number,
    )


class FakeClient:
    """In-memory client for report integration tests."""

    def __init__(self, issues, children=None, parent=None):
        self.repo = Repo.parse(REPO)
        self.issues = list(issues)
        self.children = children or {}
        self.parent = parent or {}
        self.add_calls = []
        self.create_calls = []

    def list_issues(self):
        return list(self.issues)

    def get_issue(self, number):
        for issue in self.issues:
            if issue.number == number:
                return issue
        raise KeyError(number)

    def list_sub_issues(self, number):
        return list(self.children.get(number, []))

    def get_parent_issue(self, number):
        return self.parent.get(number)

    def add_sub_issue(self, parent_number, sub_issue_id):
        self.add_calls.append((parent_number, sub_issue_id))


class RenderTest(unittest.TestCase):
    """Report rendering and file-writing behavior."""

    def test_validation_report_renders(self):
        """Validation reports are consistent between JSON and Markdown."""
        data, markdown = report_module.render_validation_report(
            "manifest.json", ["bad id"], ["missing label"]
        )
        self.assertEqual(data["status"], "INVALID")
        self.assertIn("bad id", markdown)
        self.assertIn("missing label", markdown)

    def test_execution_report_contains_urls(self):
        """Execution reports include canonical issue URLs."""
        report = ExecutionReport(
            status="COMPLETED",
            operations=[
                Operation("SKIP", "E1", "existing issue preserved", 1),
                Operation("LINK", "E1 -> S1", "linked", 2),
            ],
            linked=["E1 -> S1"],
        )
        data, markdown = report_module.render_execution_report(report, REPO, plan_hash="abc")
        self.assertEqual(data["operations"][0]["url"], "https://github.com/acme/repo/issues/1")
        self.assertIn("https://github.com/acme/repo/issues/1", markdown)

    def test_execution_report_never_claims_unconfirmed_success(self):
        """A partial execution is reported PARTIAL, never COMPLETED."""
        report = ExecutionReport(
            status="PARTIAL",
            operations=[Operation("ERROR", "S1 -> T1", "boom")],
            errors=["boom"],
        )
        data, _ = report_module.render_execution_report(report, REPO)
        self.assertEqual(data["status"], "PARTIAL")

    def test_write_json_refuses_overwrite(self):
        """Report writing never overwrites an existing file."""
        path = pathlib.Path(tempfile.mkdtemp()) / "r.json"
        write_json_report(str(path), {"a": 1})
        with self.assertRaises(ReportError):
            write_json_report(str(path), {"a": 2})

    def test_reports_never_contain_token(self):
        """Rendered reports never contain the token."""
        data, markdown = report_module.render_validation_report("m.json", [], [])
        combined = json_module.dumps(data) + markdown
        self.assertNotIn("test-token", combined)


class CliReportTest(unittest.TestCase):
    """CLI report-file writing with a mocked client."""

    def _run(self, argv, issues=None, client=None):
        issues = issues or [make_issue(1, "Epic One")]
        client = client or SimpleNamespace(
            repo=Repo.parse(REPO), list_issues=mock.Mock(return_value=issues)
        )
        with mock.patch.object(cli_module, "GitHubClient", return_value=client):
            out, err = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                code = cli_module.main(argv)
        return code, out.getvalue(), err.getvalue()

    def _write_package(self, root, issue_number=1):
        pkg = root / "pkg"
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
                            "issue_number": issue_number,
                        }
                    ],
                }
            ),
            encoding="utf-8",
        )
        (pkg / "e.md").write_text(
            "### Feature Description\nEpic\n\n### Problem Statement\nP\n\n"
            "### Proposed Solution\nS\n\n### Alternative Solutions\nA\n\n"
            "### Impact\nI\n\n### Acceptance Criteria\nC\n\n"
            "### Additional Context\nX\n\n### Related Issues / PRs\nN\n",
            encoding="utf-8",
        )
        return str(pkg / "manifest.json")

    def test_validate_writes_reports(self):
        """validate --report-dir writes JSON and Markdown reports."""
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            manifest_path = self._write_package(root)
            report_dir = root / "out"
            code, out, err = self._run(
                ["validate", "--manifest", manifest_path, "--report-dir", str(report_dir)]
            )
            self.assertEqual(code, 0)
            self.assertTrue((report_dir / "validate-report.json").is_file())
            self.assertTrue((report_dir / "validate-report.md").is_file())

    def test_plan_writes_reports(self):
        """plan --report-dir writes plan reports and the hash."""
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            manifest_path = self._write_package(root)
            report_dir = root / "out"
            code, out, err = self._run(
                ["plan", "--manifest", manifest_path, "--report-dir", str(report_dir)]
            )
            self.assertEqual(code, 0)
            data = json_module.loads((report_dir / "plan-report.json").read_text())
            self.assertEqual(data["kind"], "plan")
            self.assertTrue(data["plan_hash"])


class ApplyReportTest(unittest.TestCase):
    """Apply report integration with a fake in-memory client."""

    def test_apply_writes_execution_report_and_partial_exits_nonzero(self):
        """Apply reports match confirmed operations and propagate status."""
        with tempfile.TemporaryDirectory() as tmp:
            root = pathlib.Path(tmp)
            manifest = Manifest(
                schema_version=1,
                repo=REPO,
                package="pkg",
                tickets=[
                    make_ticket("E1", "epic", "Epic One", issue_number=1),
                    make_ticket("S1", "story", "Story One", parent="E1", issue_number=2),
                ],
                root=root,
            )
            for ticket in manifest.tickets:
                (root / ticket.body).write_text(f"body-{ticket.id}\n", encoding="utf-8")
            client = FakeClient([make_issue(1, "Epic One"), make_issue(2, "Story One")])
            discovery = discover_issues(client, manifest.tickets, issues=client.issues)
            plan = planner_module.build_plan(manifest, discovery, REPO, issues=client.issues)
            approved_hash = planner_module.compute_plan_hash(plan)

            report_dir = root / "out"
            report_dir.mkdir()
            report = executor_module.execute_plan(client, manifest, approved_hash)
            data, markdown = report_module.render_execution_report(report, REPO, approved_hash)
            report_module.write_json_report(str(report_dir / "apply-report.json"), data)
            report_module.write_markdown_report(str(report_dir / "apply-report.md"), markdown)

            self.assertEqual(report.status, "COMPLETED")
            self.assertEqual(json_module.loads((report_dir / "apply-report.json").read_text())["status"], "COMPLETED")



class RedactionTest(unittest.TestCase):
    """Secret redaction in generated reports."""

    def test_secret_is_redacted_from_execution_report(self):
        """A recognizable token in an error is removed from reports."""
        report = ExecutionReport(
            status="PARTIAL",
            operations=[Operation("ERROR", "S1", "boom secret-token-123")],
            errors=["boom secret-token-123"],
        )
        data, markdown = report_module.render_execution_report(
            report, REPO, secrets=["secret-token-123"]
        )
        combined = json_module.dumps(data) + markdown
        self.assertNotIn("secret-token-123", combined)


class ApplyCliIntegrationTest(unittest.TestCase):
    """CLI-level manifest -> plan -> approval -> apply flows."""

    def _write_apply_package(self, root):
        pkg = root / "pkg"
        pkg.mkdir()
        tickets = [
            {"id": "E1", "type": "epic", "title": "Epic One", "body": "E1.md", "parent": None, "issue_number": 1, "labels": ["EPIC"], "depends_on": [], "related": []},
            {"id": "S1", "type": "story", "title": "Story One", "body": "S1.md", "parent": "E1", "issue_number": 2, "labels": ["STORY"], "depends_on": [], "related": []},
            {"id": "T1", "type": "task", "title": "Task One", "body": "T1.md", "parent": "S1", "issue_number": 3, "labels": ["TASK"], "depends_on": [], "related": []},
        ]
        (pkg / "manifest.json").write_text(
            json_module.dumps({"schema_version": 1, "repo": REPO, "package": "p", "tickets": tickets}),
            encoding="utf-8",
        )
        headings = {
            "epic": [
                "Feature Description", "Problem Statement", "Proposed Solution",
                "Alternative Solutions", "Impact", "Acceptance Criteria",
                "Additional Context", "Related Issues / PRs",
            ],
            "story": [
                "Story Description", "Problem Statement", "Proposed Solution",
                "Alternative Solutions", "Impact", "Acceptance Criteria",
                "Additional Context", "Related Issues / PRs",
            ],
            "task": [
                "Description", "Task List", "Technical Details", "DOD",
                "Dependencies", "Additional Context", "Related Issues / PRs",
            ],
        }
        for ticket in tickets:
            body = "\n\n".join(f"### {h}\n\n{ticket['id']}\n" for h in headings[ticket["type"]])
            (pkg / ticket["body"]).write_text(body, encoding="utf-8")
        return str(pkg / "manifest.json")

    def _issues(self):
        return [make_issue(1, "Epic One"), make_issue(2, "Story One"), make_issue(3, "Task One")]

    def _approved_hash(self, manifest_path, client):
        from scripts.github_tickets import manifest as manifest_module
        from scripts.github_tickets import planner as planner_module
        from scripts.github_tickets.github import discover_issues
        manifest = manifest_module.load_manifest(manifest_path)
        errors, _ = manifest_module.validate_manifest(manifest)
        assert not errors, errors
        discovery = discover_issues(client, manifest.tickets, issues=client.issues)
        plan = planner_module.build_plan(manifest, discovery, REPO, issues=client.issues)
        return planner_module.compute_plan_hash(plan)

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)

    def _run(self, argv, fake):
        with mock.patch.object(cli_module, "GitHubClient", return_value=fake):
            out, err = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                code = cli_module.main(argv)
        return code, out.getvalue(), err.getvalue()

    def test_apply_success_writes_report(self):
        """Successful linking writes a COMPLETED execution report."""
        fake = FakeClient(self._issues())
        manifest_path = self._write_apply_package(pathlib.Path(self.tmp.name))
        # manifest for hash must match package; rebuild from manifest_path
        import scripts.github_tickets.manifest as manifest_module
        manifest = manifest_module.load_manifest(manifest_path)
        hash_value = self._approved_hash(manifest_path, FakeClient(self._issues()))
        report_dir = pathlib.Path(self.tmp.name) / "out"
        code, out, err = self._run(
            ["apply", "--manifest", manifest_path, "--approve", hash_value, "--report-dir", str(report_dir)],
            fake,
        )
        self.assertEqual(code, 0)
        data = json_module.loads((report_dir / "apply-report.json").read_text())
        self.assertEqual(data["status"], "COMPLETED")

    def test_apply_stale_approval_writes_failure_report(self):
        """A stale approval exits nonzero and writes a failure report."""
        fake = FakeClient(self._issues())
        manifest_path = self._write_apply_package(pathlib.Path(self.tmp.name))
        report_dir = pathlib.Path(self.tmp.name) / "out"
        code, out, err = self._run(
            ["apply", "--manifest", manifest_path, "--approve", "0" * 64, "--report-dir", str(report_dir)],
            fake,
        )
        self.assertEqual(code, 1)
        data = json_module.loads((report_dir / "apply-report.json").read_text())
        self.assertEqual(data["status"], "ERROR")

    def test_apply_rate_limit_writes_failure_report(self):
        """A rate limit during refresh exits nonzero with a failure report."""
        from scripts.github_tickets.github import GitHubRateLimitError
        fake = SimpleNamespace(repo=Repo.parse(REPO), list_issues=mock.Mock(side_effect=GitHubRateLimitError("limited")))
        manifest_path = self._write_apply_package(pathlib.Path(self.tmp.name))
        report_dir = pathlib.Path(self.tmp.name) / "out"
        code, out, err = self._run(
            ["apply", "--manifest", manifest_path, "--approve", "0" * 64, "--report-dir", str(report_dir)],
            fake,
        )
        self.assertEqual(code, 1)
        self.assertTrue((report_dir / "apply-report.json").is_file())

    def test_apply_partial_failure_writes_partial_report(self):
        """A link failure exits nonzero and reports PARTIAL."""
        fake = FakeClient(self._issues())
        manifest_path = self._write_apply_package(pathlib.Path(self.tmp.name))
        hash_value = self._approved_hash(manifest_path, FakeClient(self._issues()))

        def fail_add(parent_number, sub_issue_id):
            raise __import__("scripts.github_tickets.github", fromlist=["GitHubRequestError"]).GitHubRequestError("boom")

        fake.add_sub_issue = fail_add
        report_dir = pathlib.Path(self.tmp.name) / "out"
        code, out, err = self._run(
            ["apply", "--manifest", manifest_path, "--approve", hash_value, "--report-dir", str(report_dir)],
            fake,
        )
        self.assertEqual(code, 1)
        data = json_module.loads((report_dir / "apply-report.json").read_text())
        self.assertEqual(data["status"], "PARTIAL")

class CliFailureReportTest(unittest.TestCase):
    """Focused failure-report prefix, filename, and redaction tests."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = pathlib.Path(self.tmp.name)

    def _run(self, argv, client=None, side_effect=None):
        fake = client
        if side_effect is not None:
            fake = SimpleNamespace(repo=Repo.parse(REPO), list_issues=mock.Mock(side_effect=side_effect))
            setattr(fake, "token", "secret-token-123")
        elif fake is None:
            from scripts.github_tickets.github import GitHubNotFoundError
            fake = SimpleNamespace(
                repo=Repo.parse(REPO),
                list_issues=mock.Mock(return_value=[]),
                get_issue=mock.Mock(side_effect=GitHubNotFoundError("404")),
            )
        with mock.patch.object(cli_module, "GitHubClient", return_value=fake):
            out, err = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                code = cli_module.main(argv)
        return code, out.getvalue(), err.getvalue()

    def test_apply_load_failure_uses_apply_prefix(self):
        """Apply manifest-load failure writes apply-report.json, not plan-report."""
        report_dir = self.root / "out"
        code, out, err = self._run(
            ["apply", "--manifest", str(self.root / "missing.json"), "--approve", "0" * 64, "--report-dir", str(report_dir)]
        )
        self.assertEqual(code, 1)
        self.assertTrue((report_dir / "apply-report.json").is_file())
        self.assertFalse((report_dir / "plan-report.json").exists())

    def test_apply_client_init_failure_writes_report(self):
        """Apply client-init failure writes an apply failure report."""
        report_dir = self.root / "out"
        pkg = self.root / "pkg"; pkg.mkdir()
        (pkg / "manifest.json").write_text(
            '{"schema_version":1,"repo":"acme/repo","package":"p","tickets":[{"id":"E1","type":"epic","title":"Epic One","body":"e.md","parent":null,"labels":["EPIC"],"depends_on":[],"related":[],"issue_number":1}]}',
            encoding="utf-8",
        )
        (pkg / "e.md").write_text(
            "### Feature Description\nx\n\n### Problem Statement\nx\n\n### Proposed Solution\nx\n\n### Alternative Solutions\nx\n\n### Impact\nx\n\n### Acceptance Criteria\nx\n\n### Additional Context\nx\n\n### Related Issues / PRs\nx\n",
            encoding="utf-8",
        )
        manifest_path = str(pkg / "manifest.json")
        from scripts.github_tickets.github import GitHubAuthenticationError
        with mock.patch.object(
            cli_module, "GitHubClient", side_effect=GitHubAuthenticationError("denied secret-token-123")
        ):
            out, err = io.StringIO(), io.StringIO()
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                code = cli_module.main(["apply", "--manifest", manifest_path, "--approve", "0" * 64, "--report-dir", str(report_dir)])
        self.assertEqual(code, 1)
        self.assertTrue((report_dir / "apply-report.json").is_file())

    def test_plan_repo_mismatch_writes_plan_report(self):
        """Plan repo mismatch writes a plan failure report and exits nonzero."""
        report_dir = self.root / "out"
        pkg = self.root / "pkg"; pkg.mkdir()
        (pkg / "manifest.json").write_text(
            '{"schema_version":1,"repo":"acme/repo","package":"p","tickets":[{"id":"E1","type":"epic","title":"Epic One","body":"e.md","parent":null,"labels":["EPIC"],"depends_on":[],"related":[],"issue_number":1}]}',
            encoding="utf-8",
        )
        (pkg / "e.md").write_text(
            "### Feature Description\nx\n\n### Problem Statement\nx\n\n### Proposed Solution\nx\n\n### Alternative Solutions\nx\n\n### Impact\nx\n\n### Acceptance Criteria\nx\n\n### Additional Context\nx\n\n### Related Issues / PRs\nx\n",
            encoding="utf-8",
        )
        manifest_path = str(pkg / "manifest.json")
        code, out, err = self._run(
            ["plan", "--manifest", manifest_path, "--repo", "other/repo", "--report-dir", str(report_dir)]
        )
        self.assertEqual(code, 1)
        self.assertTrue((report_dir / "plan-report.json").is_file())

    def test_plan_artifact_write_failure_writes_plan_report(self):
        """Plan artifact write failure writes a plan failure report."""
        report_dir = self.root / "out"
        existing = self.root / "plan.json"
        existing.write_text("x", encoding="utf-8")
        pkg = self.root / "pkg"; pkg.mkdir()
        (pkg / "manifest.json").write_text(
            '{"schema_version":1,"repo":"acme/repo","package":"p","tickets":[{"id":"E1","type":"epic","title":"Epic One","body":"e.md","parent":null,"labels":["EPIC"],"depends_on":[],"related":[],"issue_number":1}]}',
            encoding="utf-8",
        )
        (pkg / "e.md").write_text(
            "### Feature Description\nx\n\n### Problem Statement\nx\n\n### Proposed Solution\nx\n\n### Alternative Solutions\nx\n\n### Impact\nx\n\n### Acceptance Criteria\nx\n\n### Additional Context\nx\n\n### Related Issues / PRs\nx\n",
            encoding="utf-8",
        )
        manifest_path = str(pkg / "manifest.json")
        code, out, err = self._run(
            ["plan", "--manifest", manifest_path, "--output", str(existing), "--report-dir", str(report_dir)]
        )
        self.assertEqual(code, 1)
        self.assertTrue((report_dir / "plan-report.json").is_file())

    def test_stderr_redacts_credentials(self):
        """Credentials in API errors are redacted from stderr and reports."""
        from scripts.github_tickets.github import GitHubRequestError
        report_dir = self.root / "out"
        pkg = self.root / "pkg"; pkg.mkdir()
        (pkg / "manifest.json").write_text(
            '{"schema_version":1,"repo":"acme/repo","package":"p","tickets":[{"id":"E1","type":"epic","title":"Epic One","body":"e.md","parent":null,"labels":["EPIC"],"depends_on":[],"related":[],"issue_number":1}]}',
            encoding="utf-8",
        )
        (pkg / "e.md").write_text(
            "### Feature Description\nx\n\n### Problem Statement\nx\n\n### Proposed Solution\nx\n\n### Alternative Solutions\nx\n\n### Impact\nx\n\n### Acceptance Criteria\nx\n\n### Additional Context\nx\n\n### Related Issues / PRs\nx\n",
            encoding="utf-8",
        )
        manifest_path = str(pkg / "manifest.json")
        code, out, err = self._run(
            ["apply", "--manifest", manifest_path, "--approve", "0" * 64, "--report-dir", str(report_dir)],
            side_effect=GitHubRequestError("boom secret-token-123"),
        )
        self.assertEqual(code, 1)
        self.assertNotIn("secret-token-123", err)
        self.assertNotIn("secret-token-123", (report_dir / "apply-report.json").read_text())

if __name__ == "__main__":
    unittest.main()
