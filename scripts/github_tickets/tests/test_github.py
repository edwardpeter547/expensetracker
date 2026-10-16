"""Tests for the read-only GitHub client and existing-issue discovery.

All tests are offline: HTTP is mocked and no token or live GitHub API call is
required.
"""
from __future__ import annotations

import io
import json
import os
import unittest
from unittest import mock

from scripts.github_tickets import github as github_module
from scripts.github_tickets.github import (
    AmbiguousMatch,
    GitHubAuthenticationError,
    GitHubClient,
    GitHubNotFoundError,
    GitHubRateLimitError,
    GitHubRequestError,
    GitHubResponseError,
    Issue,
    IssueConflict,
    PullRequestReference,
    Repo,
    RepoError,
    RepositoryMismatch,
    TicketMatch,
    TitleMismatch,
    discover_issues,
    ticket_id_marker,
)


def make_issue(
    number: int,
    title: str = "Issue",
    body: str = "",
    state: str = "open",
    html_url: str = "",
    is_pull_request: bool = False,
) -> Issue:
    """Build an :class:`Issue` for tests.

    Args:
        number: Issue number.
        title: Issue title.
        body: Issue body.
        state: Issue state.
        html_url: Issue URL.
        is_pull_request: Whether it is a pull request.

    Returns:
        A constructed :class:`Issue`.
    """
    return Issue(
        number=number,
        title=title,
        state=state,
        body=body,
        html_url=html_url or f"https://github.com/acme/repo/issues/{number}",
        is_pull_request=is_pull_request,
    )


def make_ticket(ticket_id: str, title: str, issue_number=None) -> object:
    """Build a lightweight ticket-like object for discovery tests.

    Args:
        ticket_id: Ticket identifier.
        title: Ticket title.
        issue_number: Optional issue number mapping.

    Returns:
        An object exposing ``id``, ``title``, and ``issue_number`` attributes.
    """
    return mock.Mock(id=ticket_id, title=title, issue_number=issue_number)


class RepoTest(unittest.TestCase):
    """Repository reference parsing and validation."""

    def test_parse_valid_repo(self) -> None:
        """A valid owner/repo string parses into owner and name."""
        repo = Repo.parse("acme/expensetracker")
        self.assertEqual(repo.owner, "acme")
        self.assertEqual(repo.name, "expensetracker")
        self.assertEqual(str(repo), "acme/expensetracker")

    def test_parse_invalid_repo_raises(self) -> None:
        """Invalid repository references raise RepoError."""
        for bad in ("", "no-slash", "owner/repo/extra", "owner/repo!bad", None):
            with self.assertRaises(RepoError):
                Repo.parse(bad)


class ClientAuthTest(unittest.TestCase):
    """Token resolution and authentication failure handling."""

    def test_token_from_github_token_env(self) -> None:
        """GITHUB_TOKEN is preferred when both variables are set."""
        with mock.patch.dict(
            os.environ, {"GITHUB_TOKEN": "gh-token", "GH_TOKEN": "gh-cli-token"}
        ):
            client = GitHubClient("acme/repo", token=None)
        self.assertEqual(client.token, "gh-token")

    def test_token_from_gh_token_env(self) -> None:
        """GH_TOKEN is used when GITHUB_TOKEN is unset."""
        with mock.patch.dict(os.environ, {"GH_TOKEN": "cli-token"}, clear=True):
            client = GitHubClient("acme/repo", token=None)
        self.assertEqual(client.token, "cli-token")

    def test_missing_token_raises_authentication_error(self) -> None:
        """A client without a resolvable token raises a controlled error."""
        with mock.patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(GitHubAuthenticationError):
                GitHubClient("acme/repo", token=None)


class FakeResponse:
    """Minimal context-manager response for mocking urlopen."""

    def __init__(self, body: bytes) -> None:
        """Store the response body bytes."""
        self.body = body

    def __enter__(self):
        """Enter the context manager."""
        return self

    def __exit__(self, *exc_info):
        """Exit the context manager."""
        return False

    def read(self):
        """Return the response body."""
        return self.body


class ClientHttpTest(unittest.TestCase):
    """HTTP error mapping and response parsing."""

    def setUp(self) -> None:
        """Create a client with an explicit token and short timeout."""
        self.client = GitHubClient("acme/repo", token="test-token")

    def _patch_urlopen(self, exc):
        return mock.patch.object(
            github_module.urllib.request, "urlopen", side_effect=exc
        )

    def test_http_401_maps_to_authentication_error(self) -> None:
        """HTTP 401 becomes GitHubAuthenticationError."""
        exc = github_module.urllib.error.HTTPError(
            "https://api.github.com/x", 401, "Unauthorized", {}, io.BytesIO(b"{}")
        )
        with self._patch_urlopen(exc):
            with self.assertRaises(GitHubAuthenticationError):
                self.client._request_json("GET", "/x")

    def test_http_404_maps_to_not_found(self) -> None:
        """HTTP 404 becomes GitHubNotFoundError."""
        exc = github_module.urllib.error.HTTPError(
            "https://api.github.com/x", 404, "Not Found", {}, io.BytesIO(b"{}")
        )
        with self._patch_urlopen(exc):
            with self.assertRaises(GitHubNotFoundError):
                self.client._request_json("GET", "/x")

    def test_http_403_rate_limit_maps_to_rate_limit_error(self) -> None:
        """HTTP 403 with exhausted rate limit becomes GitHubRateLimitError."""
        self.client = GitHubClient("acme/repo", token="test-token", sleep=lambda s: None)
        headers = {"X-RateLimit-Remaining": "0"}
        exc = github_module.urllib.error.HTTPError(
            "https://api.github.com/x", 403, "Rate limited", headers, io.BytesIO(b"{}")
        )
        with self._patch_urlopen(exc):
            with self.assertRaises(GitHubRateLimitError):
                self.client._request_json("GET", "/x")

    def test_http_403_other_maps_to_request_error(self) -> None:
        """HTTP 403 without rate-limit signals becomes GitHubRequestError."""
        exc = github_module.urllib.error.HTTPError(
            "https://api.github.com/x", 403, "Forbidden", {}, io.BytesIO(b"{}")
        )
        with self._patch_urlopen(exc):
            with self.assertRaises(GitHubRequestError):
                self.client._request_json("GET", "/x")

    def test_network_error_maps_to_request_error(self) -> None:
        """URLError becomes GitHubRequestError."""
        self.client = GitHubClient("acme/repo", token="test-token", sleep=lambda s: None)
        exc = github_module.urllib.error.URLError("boom")
        with self._patch_urlopen(exc):
            with self.assertRaises(GitHubRequestError):
                self.client._request_json("GET", "/x")

    def test_invalid_json_maps_to_response_error(self) -> None:
        """A non-JSON body becomes GitHubResponseError."""
        with mock.patch.object(
            github_module.urllib.request,
            "urlopen",
            return_value=FakeResponse(b"not-json"),
        ):
            with self.assertRaises(GitHubResponseError):
                self.client._request_json("GET", "/x")

    def test_request_does_not_leak_token(self) -> None:
        """The authorization header is set but never echoed in errors."""
        caught = []
        with mock.patch.object(
            github_module.urllib.request, "urlopen", side_effect=Exception("token?")
        ):
            try:
                self.client._request_json("GET", "/x")
            except Exception as exc:  # noqa: BLE001 - broad catch on purpose
                caught.append(str(exc))
        self.assertNotIn("test-token", caught[0] if caught else "")


class ListIssuesTest(unittest.TestCase):
    """Issue listing, pagination, and pull-request filtering."""

    def setUp(self) -> None:
        """Create a client with a mocked transport."""
        self.client = GitHubClient("acme/repo", token="test-token")

    def test_pagination_aggregates_all_pages(self) -> None:
        """A full page plus a short final page are all returned."""
        page1 = [
            {"number": n, "title": f"t{n}", "state": "open", "html_url": f"u{n}"}
            for n in range(1, 101)
        ]
        page2 = [{"number": 101, "title": "t101", "state": "open", "html_url": "u101"}]
        with mock.patch.object(
            self.client, "_request_json", side_effect=[page1, page2]
        ):
            issues = self.client.list_issues()
        self.assertEqual(len(issues), 101)
        self.assertEqual(issues[-1].number, 101)

    def test_pull_requests_are_excluded(self) -> None:
        """Issues with a pull_request key are omitted by default."""
        page = [
            {"number": 1, "title": "issue", "state": "open", "html_url": "u1"},
            {
                "number": 2,
                "title": "pr",
                "state": "open",
                "html_url": "u2",
                "pull_request": {"url": "pr"},
            },
        ]
        with mock.patch.object(self.client, "_request_json", side_effect=[page, []]):
            issues = self.client.list_issues()
        self.assertEqual([issue.number for issue in issues], [1])

    def test_malformed_page_raises_response_error(self) -> None:
        """A non-list page raises GitHubResponseError."""
        with mock.patch.object(self.client, "_request_json", return_value={"bad": True}):
            with self.assertRaises(GitHubResponseError):
                self.client.list_issues()

    def test_get_issue_parses_single_issue(self) -> None:
        """get_issue parses and returns a typed Issue."""
        payload = {
            "number": 7,
            "title": "Seven",
            "state": "closed",
            "body": "body",
            "html_url": "https://github.com/acme/repo/issues/7",
        }
        with mock.patch.object(self.client, "_request_json", return_value=payload):
            issue = self.client.get_issue(7)
        self.assertIsInstance(issue, Issue)
        self.assertEqual(issue.number, 7)
        self.assertEqual(issue.state, "closed")


class DiscoveryTest(unittest.TestCase):
    """Matching manifest tickets against existing issues."""

    def setUp(self) -> None:
        """Create a client; transport is mocked per test."""
        self.client = GitHubClient("acme/repo", token="test-token")

    def test_explicit_number_matches(self) -> None:
        """An explicit issue_number with a matching title is matched."""
        issues = [make_issue(1, title="Epic One")]
        tickets = [make_ticket("E1", "Epic One", issue_number=1)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(len(result.matched), 1)
        self.assertTrue(result.matched[0].title_matches)
        self.assertEqual(result.matched[0].match_source, "issue_number")

    def test_title_mismatch_is_reported(self) -> None:
        """A title difference is reported without rejecting the match."""
        issues = [make_issue(1, title="Different Title")]
        tickets = [make_ticket("E1", "Expected Title", issue_number=1)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(len(result.matched), 1)
        self.assertFalse(result.matched[0].title_matches)
        self.assertEqual(len(result.title_mismatches), 1)
        self.assertIsInstance(result.title_mismatches[0], TitleMismatch)

    def test_missing_explicit_number_is_unmatched(self) -> None:
        """A number with no issue and no PR is reported as unmatched."""
        with mock.patch.object(
            self.client, "get_issue", side_effect=GitHubNotFoundError("404")
        ):
            result = discover_issues(
                self.client, [make_ticket("E1", "Epic One", issue_number=99)], issues=[]
            )
        self.assertEqual(result.unmatched, ["E1"])

    def test_pull_request_reference_is_reported(self) -> None:
        """An explicit number pointing at a PR is reported, not matched."""
        pr = make_issue(1, title="PR", is_pull_request=True)
        with mock.patch.object(self.client, "get_issue", return_value=pr):
            result = discover_issues(
                self.client, [make_ticket("E1", "Epic One", issue_number=1)], issues=[]
            )
        self.assertEqual(len(result.pull_request_references), 1)
        self.assertIsInstance(result.pull_request_references[0], PullRequestReference)
        self.assertEqual(result.matched, [])

    def test_marker_matches_uniquely(self) -> None:
        """A unique body marker matches deterministically."""
        marker = ticket_id_marker("E1")
        issues = [make_issue(1, title="Epic One", body=f"prefix {marker} suffix")]
        tickets = [make_ticket("E1", "Epic One", issue_number=None)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(len(result.matched), 1)
        self.assertEqual(result.matched[0].match_source, "marker")

    def test_marker_duplicates_are_ambiguous(self) -> None:
        """Two issues with the same marker are reported as ambiguous."""
        marker = ticket_id_marker("E1")
        issues = [
            make_issue(1, title="Epic One", body=marker),
            make_issue(2, title="Epic One", body=marker),
        ]
        tickets = [make_ticket("E1", "Epic One", issue_number=None)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(len(result.matched), 0)
        self.assertEqual(len(result.ambiguous), 1)
        self.assertIsInstance(result.ambiguous[0], AmbiguousMatch)
        self.assertEqual(result.ambiguous[0].issue_numbers, [1, 2])

    def test_no_marker_is_unmatched(self) -> None:
        """A ticket with no marker and no number is unmatched."""
        issues = [make_issue(1, title="Epic One", body="no marker")]
        tickets = [make_ticket("E1", "Epic One", issue_number=None)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.unmatched, ["E1"])
        self.assertEqual(len(result.matched), 0)

    def test_match_result_is_typed(self) -> None:
        """Matched results use the typed TicketMatch dataclass."""
        issues = [make_issue(1, title="Epic One")]
        tickets = [make_ticket("E1", "Epic One", issue_number=1)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertIsInstance(result.matched[0], TicketMatch)


    def test_duplicate_explicit_numbers_are_conflicted(self) -> None:
        """Two tickets with the same issue_number produce a conflict."""
        issues = [make_issue(1, title="Epic One")]
        tickets = [
            make_ticket("A", "Epic One", issue_number=1),
            make_ticket("B", "Epic One", issue_number=1),
        ]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.matched, [])
        self.assertEqual(len(result.conflicts), 1)
        self.assertIsInstance(result.conflicts[0], IssueConflict)
        self.assertEqual(result.conflicts[0].ticket_ids, ["A", "B"])

    def test_explicit_and_marker_collision_is_conflicted(self) -> None:
        """An explicit number and a marker both claiming one issue conflict."""
        marker = ticket_id_marker("B")
        issues = [make_issue(1, title="Epic One", body=marker)]
        tickets = [
            make_ticket("A", "Epic One", issue_number=1),
            make_ticket("B", "Epic One", issue_number=None),
        ]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.matched, [])
        self.assertEqual(len(result.conflicts), 1)
        self.assertEqual(result.conflicts[0].issue_number, 1)
        self.assertEqual(result.conflicts[0].ticket_ids, ["A", "B"])

    def test_explicit_pr_in_list_is_pr_reference(self) -> None:
        """An explicit number pointing at a PR already listed is a PR reference."""
        pr = make_issue(1, title="PR", is_pull_request=True)
        issues = [pr]
        tickets = [make_ticket("A", "Epic One", issue_number=1)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.matched, [])
        self.assertEqual(len(result.pull_request_references), 1)

    def test_marker_on_pr_is_ignored(self) -> None:
        """A marker found only on a pull request does not match."""
        marker = ticket_id_marker("B")
        issues = [make_issue(1, title="PR", body=marker, is_pull_request=True)]
        tickets = [make_ticket("B", "Epic One", issue_number=None)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.unmatched, ["B"])
        self.assertEqual(result.matched, [])

    def test_wrong_repository_issue_is_flagged(self) -> None:
        """An issue whose URL belongs to another repo is not matched."""
        issues = [make_issue(1, title="Epic One", html_url="https://github.com/other/repo/issues/1")]
        tickets = [make_ticket("A", "Epic One", issue_number=1)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.matched, [])
        self.assertEqual(len(result.repository_mismatches), 1)
        self.assertIsInstance(result.repository_mismatches[0], RepositoryMismatch)
        self.assertIn("A", result.unmatched)

    def test_invalid_issue_numbers_are_reported(self) -> None:
        """Non-positive or non-integer issue numbers are reported, not queried."""
        tickets = [
            make_ticket("A", "Epic One", issue_number=0),
            make_ticket("B", "Epic One", issue_number=-1),
            make_ticket("C", "Epic One", issue_number=True),
            make_ticket("D", "Epic One", issue_number="1"),
        ]
        result = discover_issues(self.client, tickets, issues=[])
        self.assertEqual(result.matched, [])
        self.assertEqual(result.invalid_issue_numbers, ["A", "B", "C", "D"])

    def test_retry_on_429_then_success(self) -> None:
        """A 429 followed by a successful response is retried once."""
        client = GitHubClient("acme/repo", token="t", sleep=lambda s: None)
        exc = github_module.urllib.error.HTTPError(
            "https://api.github.com/x", 429, "Too Many", {}, io.BytesIO(b"{}")
        )
        with mock.patch.object(
            github_module.urllib.request,
            "urlopen",
            side_effect=[exc, FakeResponse(b"[]")],
        ) as urlopen:
            result = client._request_json("GET", "/x")
        self.assertEqual(result, [])
        self.assertEqual(urlopen.call_count, 2)

    def test_retry_exhaustion_429_raises_rate_limit(self) -> None:
        """Repeated 429 responses exhaust retries into a rate-limit error."""
        client = GitHubClient("acme/repo", token="t", max_retries=3, sleep=lambda s: None)
        exc = github_module.urllib.error.HTTPError(
            "https://api.github.com/x", 429, "Too Many", {}, io.BytesIO(b"{}")
        )
        with mock.patch.object(
            github_module.urllib.request, "urlopen", side_effect=exc
        ) as urlopen:
            with self.assertRaises(GitHubRateLimitError):
                client._request_json("GET", "/x")
        self.assertEqual(urlopen.call_count, 3)

    def test_retry_exhaustion_5xx_raises_request_error(self) -> None:
        """Repeated 5xx responses exhaust retries into a request error."""
        client = GitHubClient("acme/repo", token="t", max_retries=3, sleep=lambda s: None)
        exc = github_module.urllib.error.HTTPError(
            "https://api.github.com/x", 500, "Boom", {}, io.BytesIO(b"{}")
        )
        with mock.patch.object(
            github_module.urllib.request, "urlopen", side_effect=exc
        ) as urlopen:
            with self.assertRaises(GitHubRequestError):
                client._request_json("GET", "/x")
        self.assertEqual(urlopen.call_count, 3)

    def test_non_retryable_401_is_not_retried(self) -> None:
        """A 401 is raised immediately without retrying."""
        client = GitHubClient("acme/repo", token="t", max_retries=3, sleep=lambda s: None)
        exc = github_module.urllib.error.HTTPError(
            "https://api.github.com/x", 401, "No", {}, io.BytesIO(b"{}")
        )
        with mock.patch.object(
            github_module.urllib.request, "urlopen", side_effect=exc
        ) as urlopen:
            with self.assertRaises(GitHubAuthenticationError):
                client._request_json("GET", "/x")
        self.assertEqual(urlopen.call_count, 1)

    def test_malformed_issue_metadata_raises_response_error(self) -> None:
        """Invalid issue fields raise GitHubResponseError instead of coercing."""
        client = GitHubClient("acme/repo", token="t")
        bad_payloads = [
            {"number": "1", "title": "t", "state": "open", "html_url": "u"},
            {"number": 1, "title": 123, "state": "open", "html_url": "u"},
            {"number": 1, "title": "t", "state": None, "html_url": "u"},
            {"number": 1, "title": "t", "state": "open", "html_url": 7},
        ]
        for payload in bad_payloads:
            with mock.patch.object(client, "_request_json", return_value=payload):
                with self.assertRaises(GitHubResponseError):
                    client.get_issue(1)

    def test_explicit_mapping_with_absent_marker_owner_is_conflicted(self) -> None:
        """An explicit map whose issue carries an unknown ticket's marker conflicts."""
        marker = ticket_id_marker("B")
        issues = [make_issue(1, title="Epic One", body=marker)]
        tickets = [make_ticket("A", "Epic One", issue_number=1)]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.matched, [])
        self.assertEqual(len(result.conflicts), 1)
        self.assertEqual(result.conflicts[0].ticket_ids, ["A", "B"])

    def test_multiple_markers_on_one_issue_are_conflicted(self) -> None:
        """An issue carrying two different markers is a conflict."""
        markers = ticket_id_marker("A") + "\n" + ticket_id_marker("B")
        issues = [make_issue(1, title="Epic One", body=markers)]
        tickets = [
            make_ticket("A", "Epic One", issue_number=None),
            make_ticket("B", "Epic One", issue_number=None),
        ]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.matched, [])
        self.assertEqual(len(result.conflicts), 1)
        self.assertEqual(result.conflicts[0].ticket_ids, ["A", "B"])

    def test_explicit_overlapping_ambiguous_marker_is_conflicted(self) -> None:
        """An explicit claim overlapping an ambiguous marker candidate conflicts."""
        marker = ticket_id_marker("B")
        issues = [
            make_issue(1, title="Epic One", body=marker),
            make_issue(2, title="Epic One", body=marker),
        ]
        tickets = [
            make_ticket("A", "Epic One", issue_number=1),
            make_ticket("B", "Epic One", issue_number=None),
        ]
        result = discover_issues(self.client, tickets, issues=issues)
        self.assertEqual(result.matched, [])
        self.assertEqual(len(result.conflicts), 1)
        self.assertEqual(result.conflicts[0].issue_number, 1)
        self.assertEqual(result.conflicts[0].ticket_ids, ["A", "B"])
        self.assertEqual(len(result.ambiguous), 1)
        self.assertEqual(result.ambiguous[0].issue_numbers, [1, 2])

    def test_malformed_pull_request_metadata_raises_response_error(self) -> None:
        """A non-object pull_request value raises GitHubResponseError."""
        client = GitHubClient("acme/repo", token="t")
        payload = {
            "number": 1,
            "title": "t",
            "state": "open",
            "html_url": "https://github.com/acme/repo/issues/1",
            "pull_request": "yes",
        }
        with mock.patch.object(client, "_request_json", return_value=payload):
            with self.assertRaises(GitHubResponseError):
                client.get_issue(1)

    def test_get_issue_rejects_invalid_number(self) -> None:
        """get_issue rejects non-positive and boolean numbers."""
        client = GitHubClient("acme/repo", token="t")
        for bad in (0, -1, True, "1"):
            with self.assertRaises(ValueError):
                client.get_issue(bad)

    def test_get_issue_number_mismatch_raises_response_error(self) -> None:
        """A response whose issue number differs from the request is rejected."""
        client = GitHubClient("acme/repo", token="t")
        payload = {
            "number": 2,
            "title": "t",
            "state": "open",
            "html_url": "https://github.com/acme/repo/issues/2",
        }
        with mock.patch.object(client, "_request_json", return_value=payload):
            with self.assertRaises(GitHubResponseError):
                client.get_issue(1)

    def test_duplicate_issue_numbers_in_collection_are_rejected(self) -> None:
        """Supplied issues with duplicate numbers raise, regardless of order."""
        identical = [
            make_issue(1, title="Epic One", body="same"),
            make_issue(1, title="Epic One", body="same"),
        ]
        contradictory = [
            make_issue(1, title="Epic One", body="first"),
            make_issue(1, title="Other", body="second"),
        ]
        tickets = [make_ticket("A", "Epic One", issue_number=1)]
        for issues in (identical, contradictory, list(reversed(contradictory))):
            with self.assertRaises(GitHubResponseError):
                discover_issues(self.client, tickets, issues=issues)

    def test_duplicate_number_within_page_raises(self) -> None:
        """A page containing two records with the same number is rejected."""
        page = [
            {"number": 1, "title": "a", "state": "open", "html_url": "u1"},
            {"number": 1, "title": "b", "state": "open", "html_url": "u1"},
        ]
        with mock.patch.object(self.client, "_request_json", return_value=page):
            with self.assertRaises(GitHubResponseError):
                self.client.list_issues()

    def test_duplicate_number_across_pages_raises(self) -> None:
        """A duplicate number appearing on a later page is rejected."""
        page1 = [
            {"number": 1, "title": "a", "state": "open", "html_url": "u1"},
            {"number": 2, "title": "b", "state": "open", "html_url": "u2"},
        ]
        page2 = [{"number": 1, "title": "a", "state": "open", "html_url": "u1"}]
        with mock.patch("scripts.github_tickets.github.PER_PAGE", 2):
            with mock.patch.object(
                self.client, "_request_json", side_effect=[page1, page2]
            ):
                with self.assertRaises(GitHubResponseError):
                    self.client.list_issues()

if __name__ == "__main__":
    unittest.main()
