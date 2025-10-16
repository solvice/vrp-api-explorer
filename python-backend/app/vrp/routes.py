"""
VRP API Routes

FastAPI endpoints for VRP operations:
- Solve VRP problems
- Load persisted jobs
- Get solution explanations
- Reorder jobs in solutions
"""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from .client import VrpApiError, VrpClient, vrp_error_to_http_exception
from .context_store import vrp_context_store
from .models import (
    HealthResponse,
    LoadJobResponse,
    ReorderRequest,
    ReorderResponse,
    ScoreComparison,
    VrpErrorResponse,
)
from .types import JobExplanationResponse, OnRouteResponse
from .validators import get_complexity_error_message, validate_complexity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vrp", tags=["vrp"])


@router.post("/solve")
async def solve_vrp(request: Request) -> JSONResponse:
    """
    Solve a VRP problem

    Validates complexity limits and proxies request to Solvice API.
    Automatically stores context for ChatKit integration.

    Returns:
        VRP solution
    """
    try:
        # Parse request body
        request_data = await request.json()

        # Validate complexity before solving
        complexity_check = validate_complexity(request_data)

        if not complexity_check.valid:
            error_message = get_complexity_error_message(complexity_check)

            # Build Pydantic model for error response (auto-serializes to camelCase)
            from .models import ComplexityDetails, VrpErrorResponse

            error_response = VrpErrorResponse(
                error=error_message,
                type="complexity_limit",
                details=ComplexityDetails(
                    errors=complexity_check.errors,
                    warnings=complexity_check.warnings,
                    actual_complexity=complexity_check.actual_complexity.model_dump(
                        by_alias=True, mode="json"
                    ),
                ),
            )

            return JSONResponse(
                status_code=400,
                content=error_response.model_dump(by_alias=True, mode="json"),
            )

        # Log warnings if approaching limits
        if complexity_check.warnings:
            logger.warning(f"VRP complexity warnings: {complexity_check.warnings}")

        # Initialize VRP client and solve
        client = VrpClient()
        solution: OnRouteResponse = await client.solve(request_data)

        # Extract or generate session ID
        # In production, this should come from authenticated user session
        session_id = request.headers.get("x-session-id", f"anon_{hash(str(request_data))}")

        # Store context for ChatKit (convert to dict for storage)
        # SDK uses custom serializer, use model_dump_json() then parse
        solution_dict = json.loads(solution.model_dump_json())
        await vrp_context_store.save(
            session_id=session_id,
            request=request_data,
            solution=solution_dict,
        )
        logger.info(f"Stored VRP context for session {session_id}")

        # FastAPI will automatically serialize the Pydantic model to JSON
        return JSONResponse(content=solution_dict)

    except VrpApiError as e:
        raise vrp_error_to_http_exception(e)
    except Exception as e:
        logger.error(f"VRP solve error: {str(e)}", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"error": "Internal server error", "type": "server"},
        )


@router.get("/jobs/{job_id}/load")
async def load_job(job_id: str) -> JSONResponse:
    """
    Load a persisted VRP job

    Args:
        job_id: Job identifier

    Returns:
        Job data including request, solution, and explanation
    """
    try:
        client = VrpClient()

        # Load job data
        try:
            job_data = await client.load_job(job_id)
            request_data = job_data.get("request")
            solution_data = job_data.get("solution")
        except VrpApiError as e:
            if e.status_code == 404:
                raise HTTPException(
                    status_code=404, detail={"error": "Job not found", "type": "not_found"}
                )
            raise

        # Try to load explanation (non-blocking)
        explanation_data = None
        explanation_error = None
        try:
            explanation_response: JobExplanationResponse = await client.get_explanation(job_id)
            # SDK uses custom serializer, use model_dump_json() then parse back to dict
            explanation_data = json.loads(explanation_response.model_dump_json())
        except VrpApiError as e:
            explanation_error = f"Explanation not available: {e.message}"
            logger.info(explanation_error)
        except Exception as e:
            explanation_error = f"Failed to serialize explanation: {str(e)}"
            logger.warning(explanation_error)

        response = LoadJobResponse(
            request=request_data,
            solution=solution_data,
            explanation=explanation_data,
            solution_error=None,
            explanation_error=explanation_error,
        )
        return JSONResponse(content=response.model_dump(by_alias=True, mode="json"))

    except HTTPException:
        raise
    except VrpApiError as e:
        raise vrp_error_to_http_exception(e)
    except Exception as e:
        logger.error(f"Job load error: {str(e)}", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to load job", "type": "server"},
        )


@router.get("/jobs/{job_id}/explanation")
async def get_explanation(job_id: str) -> JSONResponse:
    """
    Get explanation for a VRP solution

    Args:
        job_id: Job identifier

    Returns:
        Solution explanation
    """
    try:
        client = VrpClient()
        explanation: JobExplanationResponse = await client.get_explanation(job_id)
        # SDK uses custom serializer, use model_dump_json() then parse
        return JSONResponse(content=json.loads(explanation.model_dump_json()))

    except VrpApiError as e:
        raise vrp_error_to_http_exception(e)
    except Exception as e:
        logger.error(f"Explanation retrieval error: {str(e)}", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to get explanation", "type": "server"},
        )


@router.post("/jobs/reorder")
async def reorder_jobs(reorder_request: ReorderRequest) -> JSONResponse:
    """
    Reorder jobs in a VRP solution

    Uses Solvice Change API to move jobs and re-optimize.

    Args:
        reorder_request: Reorder specification

    Returns:
        New solution with score comparison
    """
    try:
        client = VrpClient()

        # Construct change specification for Solvice Change API
        change_spec = {
            "changes": [
                {
                    "job": reorder_request.job_id,
                    "after": reorder_request.after_job_id,
                }
            ],
            "operation": reorder_request.operation,
        }

        # Call Change API
        new_solution: OnRouteResponse = await client.reorder_jobs(
            solution_id=reorder_request.original_solution_id,
            changes=change_spec,
        )

        # Extract feasibility warnings
        feasibility_warnings = _extract_feasibility_warnings(new_solution)

        # Calculate score comparison (TODO: implement score caching)
        score_comparison = None  # Would need to store original scores

        # SDK uses custom serializer, use model_dump_json() then parse
        response = ReorderResponse(
            solution=json.loads(new_solution.model_dump_json()),
            score_comparison=score_comparison,
            feasibility_warnings=feasibility_warnings if feasibility_warnings else None,
        )
        return JSONResponse(content=response.model_dump(by_alias=True, mode="json"))

    except VrpApiError as e:
        raise vrp_error_to_http_exception(e)
    except Exception as e:
        logger.error(f"Job reorder error: {str(e)}", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to reorder jobs", "type": "server"},
        )


@router.post("/context")
async def store_vrp_context(request: Request) -> JSONResponse:
    """
    Store VRP context for ChatKit integration

    This endpoint allows frontend to explicitly store VRP context
    for a session, ensuring ChatKit has access to problem and solution data.

    Request body:
        {
            "sessionId": "string",
            "request": {...},
            "solution": {...}
        }

    Returns:
        Success status
    """
    try:
        data = await request.json()
        session_id = data.get("sessionId")
        request_data = data.get("request")
        solution_data = data.get("solution")

        if not session_id:
            raise HTTPException(
                status_code=400,
                detail={"error": "sessionId is required", "type": "validation"},
            )

        await vrp_context_store.save(
            session_id=session_id,
            request=request_data,
            solution=solution_data,
        )

        # Return camelCase response (sessionId instead of session_id)
        return JSONResponse(content={"status": "ok", "sessionId": session_id})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Context storage error: {str(e)}", exc_info=e)
        raise HTTPException(
            status_code=500,
            detail={"error": "Failed to store context", "type": "server"},
        )


@router.get("/health")
async def health_check() -> JSONResponse:
    """
    Health check endpoint

    Returns:
        Service health status
    """
    response = HealthResponse()
    return JSONResponse(content=response.model_dump(by_alias=True, mode="json"))


def _extract_feasibility_warnings(solution: OnRouteResponse) -> list[str]:
    """
    Extract feasibility warnings from a solution

    Args:
        solution: VRP solution (strongly-typed Pydantic model)

    Returns:
        List of warning messages
    """
    warnings: list[str] = []

    # Check for violation objects in solution
    if solution.violations:
        for violation in solution.violations:
            if violation.name and violation.value:
                warnings.append(f"{violation.name}: {violation.value}")

    # Check for unserved jobs
    if solution.unserved:
        warnings.append(f"{len(solution.unserved)} unserved jobs")

    return warnings
