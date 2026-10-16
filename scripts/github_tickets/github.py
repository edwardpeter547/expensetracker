"""Read-only GitHub REST client and existing-issue discovery.

Task 02 scope only: no create, update, delete, label, or sub-issue mutations.

The client uses the Python 3.9 standard library. Authentication is read from
``GITHUB_TOKEN`` or ``GH_TOKEN`` and is never hardcoded, logged, or included in
exception messages. Read-only GET requests use bounded retries for transient
failures (HTTP 429, 5xx, and rate-limited 403 responses).
"""
from __future__ import annotations

import json
import os
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Set

DEFAULT_API_BASE = "https://api.github.com"
PER_PAGE = 100
MAX_PAGES = 1000

TICKET_ID_MARKER_PREFIX = "<!-- et-ticket-id:"

_REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
_MARKER_RE = re.compile(
    r"<!--\s*et-ticket-id:\s*([A-Za-z0-9][A-Za-z0-9._/-]*)\s*-->"
)


def ticket_id_marker(ticket_id: str) -> str:
    """Return the invisible body marker that links an issue to ``ticket_id``.

    Args:
        ticket_id: The stable manifest ticket identifier.

    Returns:
        The exact marker string embedded in an issue body.
    """
    return f"<!-- et-ticket-id: {ticket_id} -->"


def extract_ticket_markers(body: Optional[str]) -> List[str]:
    """Extract sorted ticket ids referenced by markers in an issue body.

    Args:
        body: Issue body text, or ``None``.

    Returns:
        A sorted list of unique, valid ticket ids found in the body. Invalid
        or malformed marker fragments are ignored.
    """
    if not isinstance(body, str):
        return []
    return sorted(set(_MARKER_RE.findall(body)))


def _token_from_env() -> Optional[str]:
    """Read the GitHub token from the environment.

    Returns:
        The token value, or ``None`` when neither ``GITHUB_TOKEN`` nor
        ``GH_TOKEN`` is set.

    Side effects:
        None. Reads environment variables only.
    """
    return os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")


def _normalize_title(title: Optional[str]) -> str:
    """Normalize a title for comparison by collapsing whitespace.

    Args:
        title: The title to normalize, or ``None``.

    Returns:
        The whitespace-collapsed title.
    """
    return " ".join((title or "").split())


def _canonical_issue_url(repo: "Repo", number: int) -> str:
    """Return the canonical GitHub issue URL for a repository and number.

    Args:
        repo: The target repository.
        number: The issue number.

    Returns:
        The canonical ``https://github.com/owner/name/issues/<number>`` URL.
    """
    return f"https://github.com/{repo.owner}/{repo.name}/issues/{number}"


class GitHubError(Exception):
    """Base class for all GitHub client errors."""

    def __init__(self, message: str, status_code: Optional[int] = None) -> None:
        """Create a GitHub error.

        Args:
            message: Human-readable error message (never contains the token).
            status_code: Optional HTTP status code.
        """
        super().__init__(message)
        self.status_code = status_code


class GitHubAuthenticationError(GitHubError):
    """Raised when credentials are missing or rejected (HTTP 401)."""


class GitHubRateLimitError(GitHubError):
    """Raised when the GitHub API rate limit is exceeded and retries fail."""


class GitHubNotFoundError(GitHubError):
    """Raised when a requested resource does not exist (HTTP 404)."""


class GitHubRequestError(GitHubError):
    """Raised for network, timeout, or unexpected HTTP failures."""


class GitHubResponseError(GitHubError):
    """Raised when a response is not valid, expected JSON."""


class RepoError(ValueError):
    """Raised when a repository identifier is not in ``owner/repo`` form."""


@dataclass(frozen=True)
class Repo:
    """A validated GitHub repository reference.

    Attributes:
        owner: Repository owner (user or organization).
        name: Repository name.
    """

    owner: str
    name: str

    @classmethod
    def parse(cls, value: str) -> "Repo":
        """Parse and validate an ``owner/repo`` string.

        Args:
            value: Repository reference in ``owner/repo`` form.

        Returns:
            A validated :class:`Repo`.

        Raises:
            RepoError: If ``value`` is not a valid ``owner/repo`` reference.
        """
        if not isinstance(value, str) or not _REPO_RE.match(value):
            raise RepoError(
                f"Invalid repository {value!r}; expected 'owner/repo' format"
            )
        owner, name = value.split("/", 1)
        return cls(owner=owner, name=name)

    def __str__(self) -> str:
        """Return the ``owner/repo`` form of this repository."""
        return f"{self.owner}/{self.name}"


@dataclass
class Issue:
    """Metadata parsed from a GitHub issue.

    Attributes:
        number: GitHub issue number (positive integer).
        title: Issue title.
        state: Issue state (e.g. ``open`` or ``closed``).
        body: Issue body, or ``None`` if absent.
        html_url: Canonical web URL for the issue.
        is_pull_request: Whether GitHub reports this as a pull request.
    """

    number: int
    title: str
    state: str
    body: Optional[str]
    html_url: str
    is_pull_request: bool


@dataclass
class TicketMatch:
    """A manifest ticket matched to an existing issue.

    Attributes:
        ticket_id: Manifest ticket identifier.
        issue_number: Matched GitHub issue number.
        title: Actual GitHub issue title.
        url: Canonical issue URL.
        state: Issue state at discovery time.
        title_matches: Whether the issue title matches the manifest title.
        match_source: ``"issue_number"`` or ``"marker"``.
    """

    ticket_id: str
    issue_number: int
    title: str
    url: str
    state: str
    title_matches: bool
    match_source: str


@dataclass
class TitleMismatch:
    """A matched issue whose title differs from the manifest title.

    Attributes:
        ticket_id: Manifest ticket identifier.
        issue_number: Matched GitHub issue number.
        expected_title: Title from the manifest.
        actual_title: Title from GitHub.
    """

    ticket_id: str
    issue_number: int
    expected_title: str
    actual_title: str


@dataclass
class PullRequestReference:
    """An explicit ``issue_number`` that points at a pull request.

    Attributes:
        ticket_id: Manifest ticket identifier.
        issue_number: The referenced number.
        title: Pull request title.
        url: Canonical pull request URL.
    """

    ticket_id: str
    issue_number: int
    title: str
    url: str


@dataclass
class AmbiguousMatch:
    """A ticket whose marker appears on multiple issues.

    Attributes:
        ticket_id: Manifest ticket identifier.
        issue_numbers: Sorted issue numbers sharing the marker.
    """

    ticket_id: str
    issue_numbers: List[int]


@dataclass
class IssueConflict:
    """Multiple manifest tickets claiming the same GitHub issue.

    Attributes:
        issue_number: The contested GitHub issue number.
        ticket_ids: Sorted ticket identifiers (or marker owners) in conflict.
    """

    issue_number: int
    ticket_ids: List[str]


@dataclass
class RepositoryMismatch:
    """An issue whose canonical URL does not match the target repository.

    Attributes:
        issue_number: The issue number.
        url: The issue's reported URL.
    """

    issue_number: int
    url: str


@dataclass
class DiscoveryResult:
    """Outcome of matching manifest tickets against GitHub issues.

    Attributes:
        matched: Tickets with a unique, deterministic match.
        unmatched: Ticket ids with no match.
        ambiguous: Tickets with multiple marker matches.
        title_mismatches: Matched tickets whose title differs.
        pull_request_references: Explicit numbers that reference pull requests.
        conflicts: Multiple identities claiming the same issue.
        repository_mismatches: Issues whose URL does not match the target repo.
        invalid_issue_numbers: Ticket ids with non-positive or non-integer
            issue numbers.
    """

    matched: List[TicketMatch] = field(default_factory=list)
    unmatched: List[str] = field(default_factory=list)
    ambiguous: List[AmbiguousMatch] = field(default_factory=list)
    title_mismatches: List[TitleMismatch] = field(default_factory=list)
    pull_request_references: List[PullRequestReference] = field(default_factory=list)
    conflicts: List[IssueConflict] = field(default_factory=list)
    repository_mismatches: List[RepositoryMismatch] = field(default_factory=list)
    invalid_issue_numbers: List[str] = field(default_factory=list)


class GitHubClient:
    """Minimal, read-only GitHub REST client with bounded retries."""

    def __init__(
        self,
        repo: str,
        token: Optional[str] = None,
        api_base: str = DEFAULT_API_BASE,
        timeout: float = 20.0,
        max_retries: int = 3,
        retry_delay: float = 1.0,
        retry_backoff: float = 2.0,
        sleep: Optional[Callable[[float], None]] = None,
    ) -> None:
        """Create a read-only client for ``repo``.

        Args:
            repo: Repository reference in ``owner/repo`` form.
            token: GitHub token. When ``None``, read from ``GITHUB_TOKEN`` or
                ``GH_TOKEN``.
            api_base: API base URL (overridable for tests).
            timeout: Request timeout in seconds.
            max_retries: Maximum attempts for transient read-only failures.
            retry_delay: Initial delay between retries in seconds.
            retry_backoff: Multiplier applied to the delay after each retry.
            sleep: Injectable sleep callable for tests; defaults to
                :func:`time.sleep`.

        Raises:
            RepoError: If ``repo`` is not a valid ``owner/repo`` reference.
            GitHubAuthenticationError: If no token can be resolved.
        """
        self.repo = Repo.parse(repo)
        self.token = token if token is not None else _token_from_env()
        if not self.token:
            raise GitHubAuthenticationError(
                "GitHub token is required; set GITHUB_TOKEN or GH_TOKEN"
            )
        self.api_base = api_base.rstrip("/")
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.retry_backoff = retry_backoff
        self._sleep = sleep if sleep is not None else time.sleep

    def _headers(self) -> Dict[str, str]:
        """Build request headers without ever logging the token.

        Returns:
            A dictionary of HTTP headers including the authorization header.
        """
        return {
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "User-Agent": "expensetracker-github-tickets",
        }

    @staticmethod
    def _is_rate_limited(headers: Any) -> bool:
        """Return whether response headers indicate an exhausted rate limit.

        Args:
            headers: Response header mapping, or ``None``.

        Returns:
            ``True`` when the remaining limit is zero or a Retry-After header
            is present.
        """
        if not headers:
            return False
        remaining = headers.get("X-RateLimit-Remaining")
        if remaining is not None and str(remaining) == "0":
            return True
        return bool(headers.get("Retry-After"))

    @staticmethod
    def _retry_after(headers: Any, default: float) -> float:
        """Return the Retry-After delay in seconds, falling back to ``default``.

        Args:
            headers: Response header mapping, or ``None``.
            default: Fallback delay when Retry-After is absent or invalid.

        Returns:
            The delay in seconds to wait before retrying.
        """
        if not headers:
            return default
        value = headers.get("Retry-After")
        if value is None:
            return default
        try:
            return max(0.0, float(value))
        except (TypeError, ValueError):
            return default

    def _is_retryable_status(self, status: int, headers: Any) -> bool:
        """Return whether an HTTP status should be retried for GET requests.

        Args:
            status: HTTP status code.
            headers: Response headers.

        Returns:
            ``True`` for HTTP 429, 5xx, and rate-limited 403 responses.
        """
        if status == 429 or status >= 500:
            return True
        return status == 403 and self._is_rate_limited(headers)

    def _request_json(
        self, method: str, path: str, query: Optional[Dict[str, Any]] = None
    ) -> Any:
        """Perform an HTTP request and return the decoded JSON body.

        Read-only GET requests are retried on transient failures (HTTP 429,
        5xx, and rate-limited 403) up to ``max_retries`` attempts. Permanent
        failures (401, 404, malformed JSON) are never retried.

        Args:
            method: HTTP method (e.g. ``"GET"``).
            path: API path beginning with ``/``.
            query: Optional query-string parameters.

        Returns:
            The parsed JSON response body.

        Raises:
            GitHubAuthenticationError: For HTTP 401.
            GitHubNotFoundError: For HTTP 404.
            GitHubRateLimitError: For rate limits after retries are exhausted.
            GitHubRequestError: For other HTTP failures, network errors, or
                timeouts, including after retries are exhausted.
            GitHubResponseError: For invalid or unexpected JSON.
        """
        url = f"{self.api_base}{path}"
        if query:
            url += "?" + urllib.parse.urlencode(query)

        retryable = method.upper() == "GET"
        delay = self.retry_delay
        request = urllib.request.Request(url, method=method, headers=self._headers())

        for attempt in range(1, self.max_retries + 1):
            try:
                with urllib.request.urlopen(request, timeout=self.timeout) as response:
                    data = response.read().decode("utf-8")
                    return json.loads(data)
            except urllib.error.HTTPError as exc:
                status = exc.code
                if retryable and self._is_retryable_status(status, exc.headers):
                    if attempt == self.max_retries:
                        if status == 429 or self._is_rate_limited(exc.headers):
                            raise GitHubRateLimitError(
                                f"GitHub API rate limit exceeded for {url} after "
                                f"{attempt} attempt(s)",
                                status_code=status,
                            ) from exc
                        raise GitHubRequestError(
                            f"GitHub API error (HTTP {status}) for {url} after "
                            f"{attempt} attempt(s)",
                            status_code=status,
                        ) from exc
                    self._sleep(self._retry_after(exc.headers, delay))
                    delay *= self.retry_backoff
                    continue
                if status == 401:
                    raise GitHubAuthenticationError(
                        f"Authentication failed (HTTP 401) for {url}",
                        status_code=status,
                    ) from exc
                if status == 404:
                    raise GitHubNotFoundError(
                        f"Not found (HTTP 404): {url}", status_code=status
                    ) from exc
                if status == 403 and self._is_rate_limited(exc.headers):
                    raise GitHubRateLimitError(
                        f"GitHub API rate limit exceeded for {url}",
                        status_code=status,
                    ) from exc
                raise GitHubRequestError(
                    f"GitHub API error (HTTP {status}) for {url}",
                    status_code=status,
                ) from exc
            except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError) as exc:
                if retryable and attempt < self.max_retries:
                    self._sleep(delay)
                    delay *= self.retry_backoff
                    continue
                raise GitHubRequestError(
                    f"Network or timeout error for {url} after {attempt} attempt(s)"
                ) from exc
            except json.JSONDecodeError as exc:
                raise GitHubResponseError(
                    f"Invalid JSON response from {url}"
                ) from exc

        raise GitHubRequestError(f"Request did not complete for {url}")

    def _issue_path(self, number: Optional[int] = None) -> str:
        """Return the issues API path for this repository.

        Args:
            number: Optional issue number for a single-issue path.

        Returns:
            The API path.
        """
        base = f"/repos/{self.repo.owner}/{self.repo.name}/issues"
        return base if number is None else f"{base}/{number}"

    @staticmethod
    def _parse_issue(item: Any) -> Issue:
        """Parse a single issue JSON object into an :class:`Issue`.

        Args:
            item: Raw JSON object for an issue.

        Returns:
            A typed :class:`Issue`.

        Raises:
            GitHubResponseError: If ``item`` is not an object, or ``number``,
                ``title``, ``state``, ``html_url``, ``body``, or
                ``pull_request`` have invalid types.
        """
        if not isinstance(item, dict):
            raise GitHubResponseError("Expected an issue object in API response")

        number = item.get("number")
        if isinstance(number, bool) or not isinstance(number, int) or number <= 0:
            raise GitHubResponseError("Issue 'number' is missing or not a positive integer")

        title = item.get("title")
        if not isinstance(title, str):
            raise GitHubResponseError("Issue 'title' is missing or not a string")

        state = item.get("state")
        if not isinstance(state, str):
            raise GitHubResponseError("Issue 'state' is missing or not a string")

        html_url = item.get("html_url")
        if not isinstance(html_url, str):
            raise GitHubResponseError("Issue 'html_url' is missing or not a string")

        body = item.get("body")
        if body is not None and not isinstance(body, str):
            raise GitHubResponseError("Issue 'body' is not a string or null")

        pull_request = item.get("pull_request")
        if pull_request is None:
            is_pull_request = False
        elif isinstance(pull_request, dict):
            is_pull_request = True
        else:
            raise GitHubResponseError("Issue 'pull_request' must be an object or absent")

        return Issue(
            number=int(number),
            title=title,
            state=state,
            body=body,
            html_url=html_url,
            is_pull_request=is_pull_request,
        )

    def get_issue(self, number: int) -> Issue:
        """Fetch a single issue by number.

        Args:
            number: GitHub issue number (positive, non-boolean integer).

        Returns:
            The parsed :class:`Issue`.

        Raises:
            ValueError: If ``number`` is not a positive, non-boolean integer.
            GitHubNotFoundError: If the issue does not exist.
            GitHubResponseError: If the response is malformed or the returned
                issue number differs from the requested number.
            GitHubAuthenticationError, GitHubRateLimitError, GitHubRequestError:
                For the corresponding transport failures.
        """
        if isinstance(number, bool) or not isinstance(number, int) or number <= 0:
            raise ValueError(
                f"issue number must be a positive integer, got {number!r}"
            )
        data = self._request_json("GET", self._issue_path(number))
        issue = self._parse_issue(data)
        if issue.number != number:
            raise GitHubResponseError(
                f"Requested issue {number} but API returned issue {issue.number}"
            )
        return issue

    def list_issues(
        self, state: str = "all", exclude_pull_requests: bool = True
    ) -> List[Issue]:
        """List repository issues with pagination.

        Args:
            state: Issue state filter (``open``, ``closed``, or ``all``).
            exclude_pull_requests: When ``True``, pull requests are omitted.

        Returns:
            Issues in GitHub's listing order, with pull requests excluded when
            ``exclude_pull_requests`` is ``True``.

        Raises:
            GitHubResponseError: If pagination data is malformed, contains a
                duplicate issue number, or does not terminate.
            GitHubAuthenticationError, GitHubRateLimitError, GitHubRequestError:
                For transport failures.
        """
        issues: List[Issue] = []
        seen_numbers: Set[int] = set()
        page = 1
        while True:
            if page > MAX_PAGES:
                raise GitHubResponseError("Pagination did not terminate")
            data = self._request_json(
                "GET",
                self._issue_path(),
                {"state": state, "per_page": PER_PAGE, "page": page},
            )
            if not isinstance(data, list):
                raise GitHubResponseError("Expected a JSON array of issues")
            for item in data:
                issue = self._parse_issue(item)
                if issue.number in seen_numbers:
                    raise GitHubResponseError(
                        f"Duplicate issue number {issue.number} in paginated response"
                    )
                seen_numbers.add(issue.number)
                if exclude_pull_requests and issue.is_pull_request:
                    continue
                issues.append(issue)
            if len(data) < PER_PAGE:
                break
            page += 1
        return issues


def _validate_issue_number(value: Any) -> bool:
    """Return whether ``value`` is a positive, non-boolean integer.

    Args:
        value: The manifest issue number value.

    Returns:
        ``True`` when ``value`` is a valid positive integer.
    """
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _belongs_to_repo(repo: Repo, issue: Issue) -> bool:
    """Return whether an issue's canonical URL matches the target repository.

    Args:
        repo: The target repository.
        issue: The issue to verify.

    Returns:
        ``True`` when ``issue.html_url`` equals the canonical URL for the
        repository and issue number.
    """
    return issue.html_url.rstrip("/") == _canonical_issue_url(repo, issue.number)


def discover_issues(
    client: GitHubClient,
    tickets: List[Any],
    issues: Optional[List[Issue]] = None,
) -> DiscoveryResult:
    """Match manifest tickets against existing GitHub issues.

    Matching rules:
      - An explicit ``issue_number`` takes priority and is verified against the
        intended repository. Title differences are reported, never overwritten.
      - With no ``issue_number``, only the deterministic body marker is used.
        Multiple matches are ambiguous; titles never establish identity alone.
      - One GitHub issue can never be returned as a match for more than one
        ticket. Explicit mappings that carry a different ticket's marker,
        multiple distinct markers, or marker candidates overlapping an explicit
        claim are reported as :class:`IssueConflict`.

    Args:
        client: A read-only :class:`GitHubClient` for the target repository.
        tickets: Manifest ticket entries (objects with ``id``, ``title``, and
            ``issue_number`` attributes).
        issues: Pre-fetched issues to match against. When ``None``, issues are
            fetched with :meth:`GitHubClient.list_issues`.

    Returns:
        A :class:`DiscoveryResult` classifying matched, unmatched, ambiguous,
        conflicting, title-mismatched, pull-request-referencing, wrong-repo,
        and invalid-issue-number cases.

    Raises:
        GitHubResponseError: If the supplied issue collection contains a
            duplicate issue number.
        GitHubError subclasses: Propagated from the client for transport and
            authentication failures.
    """
    resolved_issues = issues if issues is not None else client.list_issues()
    by_number: Dict[int, Issue] = {}
    for issue in resolved_issues:
        if issue.number in by_number:
            raise GitHubResponseError(
                f"Duplicate issue number {issue.number} in issue collection"
            )
        by_number[issue.number] = issue

    result = DiscoveryResult()
    explicit_tickets: List[Any] = []
    marker_tickets: List[Any] = []

    for ticket in tickets:
        if not isinstance(getattr(ticket, "id", None), str):
            continue
        if ticket.issue_number is not None:
            explicit_tickets.append(ticket)
        else:
            marker_tickets.append(ticket)

    conflicted_ids: Set[str] = set()
    conflict_keys: Set[tuple] = set()

    def add_conflict(number: int, ticket_ids: Set[str]) -> None:
        """Record a deduplicated conflict for ``number``.

        Args:
            number: The contested issue number.
            ticket_ids: Distinct identifiers (tickets or marker owners).
        """
        unique_ids = sorted(ticket_ids)
        key = (number, tuple(unique_ids))
        if key in conflict_keys:
            return
        conflict_keys.add(key)
        result.conflicts.append(
            IssueConflict(issue_number=number, ticket_ids=unique_ids)
        )
        conflicted_ids.update(unique_ids)

    # Duplicate explicit numbers are a conflict regardless of markers.
    explicit_claims: Dict[int, List[str]] = {}
    for ticket in explicit_tickets:
        number = ticket.issue_number
        if not _validate_issue_number(number):
            result.invalid_issue_numbers.append(ticket.id)
            continue
        explicit_claims.setdefault(number, []).append(ticket.id)
    for number, ticket_ids in explicit_claims.items():
        if len(set(ticket_ids)) > 1:
            add_conflict(number, set(ticket_ids))

    # Marker hits per marker ticket, excluding pull requests.
    marker_hits: Dict[str, List[int]] = {}
    for ticket in marker_tickets:
        marker = ticket_id_marker(ticket.id)
        hits = [
            issue.number
            for issue in resolved_issues
            if not issue.is_pull_request and issue.body and marker in issue.body
        ]
        if hits:
            marker_hits[ticket.id] = sorted(set(hits))

    # Classify explicit tickets.
    for ticket in explicit_tickets:
        if ticket.id in conflicted_ids:
            continue
        number = ticket.issue_number
        if not _validate_issue_number(number):
            continue

        issue = by_number.get(number)
        if issue is None:
            try:
                issue = client.get_issue(number)
            except GitHubNotFoundError:
                result.unmatched.append(ticket.id)
                continue

        if issue.is_pull_request:
            result.pull_request_references.append(
                PullRequestReference(
                    ticket_id=ticket.id,
                    issue_number=number,
                    title=issue.title,
                    url=issue.html_url,
                )
            )
            continue

        if not _belongs_to_repo(client.repo, issue):
            result.repository_mismatches.append(
                RepositoryMismatch(issue_number=number, url=issue.html_url)
            )
            result.unmatched.append(ticket.id)
            continue

        markers = extract_ticket_markers(issue.body)
        if markers and (ticket.id not in markers or len(markers) > 1):
            add_conflict(number, set(markers) | {ticket.id})
            continue

        _record_match(result, ticket, issue, "issue_number")

    # Classify marker tickets.
    for ticket in marker_tickets:
        hits = marker_hits.get(ticket.id, [])
        if not hits:
            result.unmatched.append(ticket.id)
            continue
        if len(hits) > 1:
            result.ambiguous.append(
                AmbiguousMatch(ticket_id=ticket.id, issue_numbers=hits)
            )
            continue
        if ticket.id in conflicted_ids:
            continue

        number = hits[0]
        issue = by_number.get(number)
        if issue is None or issue.is_pull_request:
            result.unmatched.append(ticket.id)
            continue

        if not _belongs_to_repo(client.repo, issue):
            result.repository_mismatches.append(
                RepositoryMismatch(issue_number=number, url=issue.html_url)
            )
            result.unmatched.append(ticket.id)
            continue

        markers = extract_ticket_markers(issue.body)
        if markers and (ticket.id not in markers or len(markers) > 1):
            add_conflict(number, set(markers) | {ticket.id})
            continue

        _record_match(result, ticket, issue, "marker")

    return result


def _record_match(
    result: DiscoveryResult, ticket: Any, issue: Issue, source: str
) -> None:
    """Append a confirmed match, including any title mismatch.

    Args:
        result: The discovery result being populated.
        ticket: Manifest ticket with ``id`` and ``title``.
        issue: The matched GitHub issue.
        source: Match source (``"issue_number"`` or ``"marker"``).

    Returns:
        ``None``; appends to ``result.matched`` and, when the title differs,
        to ``result.title_mismatches``.
    """
    title_matches = _normalize_title(ticket.title) == _normalize_title(issue.title)
    result.matched.append(
        TicketMatch(
            ticket_id=ticket.id,
            issue_number=issue.number,
            title=issue.title,
            url=issue.html_url,
            state=issue.state,
            title_matches=title_matches,
            match_source=source,
        )
    )
    if not title_matches:
        result.title_mismatches.append(
            TitleMismatch(
                ticket_id=ticket.id,
                issue_number=issue.number,
                expected_title=ticket.title or "",
                actual_title=issue.title,
            )
        )
