"""Ensure the backend package root is importable regardless of pytest's CWD."""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
