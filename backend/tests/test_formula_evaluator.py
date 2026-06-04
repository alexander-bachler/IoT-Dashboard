"""Unit tests for the safe formula evaluator (app/services/formula_evaluator.py)."""
import math

import pytest

from app.services.formula_evaluator import (
    FormulaError,
    evaluate,
    extract_variables,
    validate_formula,
)


# ------------------------------- evaluate -------------------------------

def test_arithmetic():
    assert evaluate("a * b", {"a": 3, "b": 4}) == 12
    assert evaluate("a + b - c", {"a": 10, "b": 5, "c": 2}) == 13
    assert evaluate("(a + b) / 2", {"a": 3, "b": 7}) == 5
    assert evaluate("a ** 2 + 1", {"a": 4}) == 17
    assert evaluate("-a + 5", {"a": 2}) == 3
    assert evaluate("10 % 3", {}) == 1
    assert evaluate("7 // 2", {}) == 3


def test_functions():
    assert evaluate("abs(a - b)", {"a": 2, "b": 9}) == 7
    assert evaluate("max(a, b, c)", {"a": 1, "b": 9, "c": 4}) == 9
    assert evaluate("min(a, b)", {"a": 1, "b": 9}) == 1
    assert evaluate("round(a / b, 2)", {"a": 10, "b": 3}) == 3.33
    assert evaluate("sqrt(a)", {"a": 16}) == 4
    assert math.isclose(evaluate("log(exp(a))", {"a": 2}), 2.0)


def test_unknown_variable_raises():
    with pytest.raises(FormulaError):
        evaluate("a + b", {"a": 1})


# --------------------------- extract_variables ---------------------------

def test_extract_variables_excludes_functions():
    assert extract_variables("voltage * current") == ["current", "voltage"]
    assert extract_variables("max(a, b) + 2") == ["a", "b"]
    assert extract_variables("3 * 2") == []


# --------------------------- validate_formula ---------------------------

def test_validate_allowed_vars():
    assert validate_formula("a * b", allowed_vars=["a", "b", "c"]) == ["a", "b"]


def test_validate_unknown_var_raises():
    with pytest.raises(FormulaError):
        validate_formula("a * b", allowed_vars=["a"])


def test_validate_syntax_error():
    with pytest.raises(FormulaError):
        validate_formula("a * * b")


@pytest.mark.parametrize(
    "evil",
    [
        "__import__('os').system('ls')",  # call to non-whitelisted name
        "a.__class__",                     # attribute access
        "().__class__.__bases__",          # attribute access
        "open('x')",                        # non-whitelisted function
        "[x for x in range(3)]",           # comprehension
        "lambda: 1",                        # lambda
        "a if b else c",                    # conditional expression
        "'string'",                         # non-numeric constant
        "a & b",                            # bitwise operator not allowed
    ],
)
def test_validate_rejects_unsafe(evil):
    with pytest.raises(FormulaError):
        validate_formula(evil, allowed_vars=["a", "b", "c", "x"])


def test_evaluate_rejects_unsafe_even_without_validate():
    # evaluate must be safe on its own (defense in depth).
    with pytest.raises(FormulaError):
        evaluate("__import__('os')", {})
    with pytest.raises(FormulaError):
        evaluate("a.__class__", {"a": 1})
