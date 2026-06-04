"""
Safe arithmetic formula evaluator for custom calculations.

Evaluates a small arithmetic expression language over named variables using
Python's AST — never ``eval``/``exec``. Only a fixed whitelist of operators and
functions is permitted, so user-supplied formulas cannot execute arbitrary code,
import modules, access attributes, or call anything outside the whitelist.

Supported: + - * / // % ** , unary +/- , parentheses, numeric literals,
variable names, and the functions: abs min max round sqrt pow exp log log10
floor ceil.
"""
import ast
import math
import operator
from typing import Dict, Iterable, List, Optional

_BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.FloorDiv: operator.floordiv,
}

_UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

_FUNCS = {
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
    "sqrt": math.sqrt,
    "pow": math.pow,
    "exp": math.exp,
    "log": math.log,
    "log10": math.log10,
    "floor": math.floor,
    "ceil": math.ceil,
}


class FormulaError(ValueError):
    """Raised for an invalid or unsafe formula."""


def _parse(formula: str) -> ast.Expression:
    try:
        return ast.parse(formula, mode="eval")
    except SyntaxError as e:
        raise FormulaError(f"Invalid formula syntax: {e.msg}") from e


def _check_node(node: ast.AST) -> None:
    """Raise FormulaError if the node (or any child) is not whitelisted."""
    if isinstance(node, ast.BinOp):
        if type(node.op) not in _BIN_OPS:
            raise FormulaError(f"Operator not allowed: {type(node.op).__name__}")
        _check_node(node.left)
        _check_node(node.right)
    elif isinstance(node, ast.UnaryOp):
        if type(node.op) not in _UNARY_OPS:
            raise FormulaError(f"Unary operator not allowed: {type(node.op).__name__}")
        _check_node(node.operand)
    elif isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in _FUNCS:
            raise FormulaError("Only whitelisted functions may be called")
        if node.keywords:
            raise FormulaError("Keyword arguments are not allowed")
        for arg in node.args:
            _check_node(arg)
    elif isinstance(node, ast.Name):
        return
    elif isinstance(node, ast.Constant):
        if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
            raise FormulaError("Only numeric constants are allowed")
    else:
        raise FormulaError(f"Expression element not allowed: {type(node).__name__}")


def extract_variables(formula: str) -> List[str]:
    """Return the variable names referenced by ``formula`` (function names excluded)."""
    tree = _parse(formula)
    names = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name)}
    return sorted(n for n in names if n not in _FUNCS)


def validate_formula(formula: str, allowed_vars: Optional[Iterable[str]] = None) -> List[str]:
    """Compile-check ``formula``, ensure it only uses whitelisted nodes, and
    (optionally) that every variable is in ``allowed_vars``.

    Returns the referenced variable names. Raises :class:`FormulaError`.
    """
    tree = _parse(formula)
    _check_node(tree.body)
    variables = extract_variables(formula)
    if allowed_vars is not None:
        allowed = set(allowed_vars)
        unknown = [v for v in variables if v not in allowed]
        if unknown:
            raise FormulaError(f"Unknown variable(s): {', '.join(unknown)}")
    return variables


def _eval_node(node: ast.AST, variables: Dict[str, float]) -> float:
    if isinstance(node, ast.BinOp):
        return _BIN_OPS[type(node.op)](
            _eval_node(node.left, variables), _eval_node(node.right, variables)
        )
    if isinstance(node, ast.UnaryOp):
        return _UNARY_OPS[type(node.op)](_eval_node(node.operand, variables))
    if isinstance(node, ast.Call):
        # Re-check here so evaluate() is safe even without a prior validate_formula().
        if not isinstance(node.func, ast.Name) or node.func.id not in _FUNCS:
            raise FormulaError("Only whitelisted functions may be called")
        if node.keywords:
            raise FormulaError("Keyword arguments are not allowed")
        func = _FUNCS[node.func.id]
        return func(*[_eval_node(a, variables) for a in node.args])
    if isinstance(node, ast.Name):
        if node.id in variables:
            return variables[node.id]
        raise FormulaError(f"Unknown variable: {node.id}")
    if isinstance(node, ast.Constant):
        return node.value
    raise FormulaError(f"Expression element not allowed: {type(node).__name__}")


def evaluate(formula: str, variables: Dict[str, float]) -> float:
    """Evaluate ``formula`` with the given variable values.

    Only whitelisted nodes are evaluated (anything else raises FormulaError), so
    this is safe even if ``validate_formula`` was not called first.
    """
    tree = _parse(formula)
    return _eval_node(tree.body, variables)
