"""
Strongly-typed VRP domain models from Solvice SDK

This module re-exports the Pydantic models from the Solvice SDK
for easy import and type safety throughout the codebase.
"""

from __future__ import annotations

# Response types
from solvice_vrp_solver.types.vrp import (
    JobExplanationResponse,
    OnRouteResponse,
    Visit,
)
from solvice_vrp_solver.types.vrp.on_route_response import (
    Suggestion,
    SuggestionAssignment,
    SuggestionAssignmentScoreExplanation,
    Trip,
    Violation,
)
from solvice_vrp_solver.types.vrp.score import Score

# Re-export all types for easy importing
__all__ = [
    # Main response types
    "JobExplanationResponse",
    "OnRouteResponse",
    # Solution components
    "Trip",
    "Visit",
    "Score",
    # Suggestion types
    "Suggestion",
    "SuggestionAssignment",
    "SuggestionAssignmentScoreExplanation",
    # Constraint violations
    "Violation",
]
