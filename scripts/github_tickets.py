#!/usr/bin/env python3
"""Entrypoint for the ExpenseTracker GitHub ticket automation CLI.

Kept intentionally thin; all behavior lives in scripts/github_tickets/.
"""
from __future__ import annotations

import os
import sys

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from scripts.github_tickets.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
