"""
Pydantic models for VRP API requests and responses
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


# API Response Models


class ComplexityDetails(BaseModel):
    """Complexity check details for error responses"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    errors: list[str]
    warnings: list[str]
    actual_complexity: dict[str, Any]


class VrpErrorResponse(BaseModel):
    """Standard error response"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    error: str
    type: str = "unknown"
    details: ComplexityDetails | None = None


class ScoreComparison(BaseModel):
    """Score comparison for reorder operations"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    original: float
    modified: float
    delta: float
    delta_percent: float


class ReorderRequest(BaseModel):
    """Request to reorder jobs in a solution"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    job_id: str = Field(description="Job being moved")
    after_job_id: str | None = Field(description="Job to insert after (null = first position)")
    operation: Literal["evaluate", "solve"] = Field(
        description="Fast preview vs full re-optimization"
    )
    original_solution_id: str = Field(description="ID from original solve response")


class ReorderResponse(BaseModel):
    """Response from reorder operation"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    solution: dict[str, Any]
    score_comparison: ScoreComparison | None = None
    feasibility_warnings: list[str] | None = None


class LoadJobResponse(BaseModel):
    """Response from loading a persisted job"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    request: dict[str, Any] | None = None
    solution: dict[str, Any] | None = None
    explanation: dict[str, Any] | None = None
    solution_error: str | None = None
    explanation_error: str | None = None


class HealthResponse(BaseModel):
    """Health check response"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    status: str = "healthy"
    version: str = "0.1.0"
    services: dict[str, str] = Field(default_factory=lambda: {
        "vrp": "operational",
        "chatkit": "operational"
    })


# VRP Context Models


class VrpContextData(BaseModel):
    """VRP problem and solution context for ChatKit"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    request: dict[str, Any]
    solution: dict[str, Any] | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    session_id: str


class StoredVrpContext(BaseModel):
    """Stored VRP context with timestamp"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    request: dict[str, Any]
    solution: dict[str, Any] | None
    session_id: str
    timestamp: str
