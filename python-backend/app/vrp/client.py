"""
Solvice VRP API client wrapper with error handling
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from fastapi import HTTPException
from solvice_vrp_solver import SolviceVrpSolver

from .types import JobExplanationResponse, OnRouteResponse

logger = logging.getLogger(__name__)


class VrpApiError(Exception):
    """Custom exception for VRP API errors"""

    def __init__(
        self,
        message: str,
        error_type: str = "unknown",
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.error_type = error_type
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class VrpClient:
    """Wrapper around Solvice VRP SDK with error handling"""

    def __init__(self, api_key: str | None = None):
        """
        Initialize VRP client

        Args:
            api_key: Solvice API key (reads from env if not provided)
        """
        self.api_key = api_key or os.getenv("SOLVICE_API_KEY")
        if not self.api_key:
            raise VrpApiError(
                "Solvice API key not configured",
                error_type="authentication",
                status_code=500,
            )

        self.client = SolviceVrpSolver(api_key=self.api_key)
        logger.info("VRP client initialized")

    async def solve(self, vrp_data: dict[str, Any]) -> OnRouteResponse:
        """
        Solve a VRP problem

        Args:
            vrp_data: VRP problem data

        Returns:
            VRP solution as strongly-typed Pydantic model

        Raises:
            VrpApiError: If solve fails
        """
        try:
            logger.info(f"Solving VRP problem with {len(vrp_data.get('jobs', []))} jobs")

            # Log the actual request data being sent
            logger.info(f"VRP Request Data: {json.dumps(vrp_data, indent=2, default=str)}")

            # Call the SDK's sync_solve method with the VRP data
            response = self.client.vrp.sync_solve(**vrp_data)
            return response
        except Exception as e:
            raise self._map_error(e) from e

    async def load_job(self, job_id: str) -> dict[str, Any]:
        """
        Load a persisted VRP job

        Args:
            job_id: Job identifier

        Returns:
            Job data including request and solution

        Raises:
            VrpApiError: If load fails
        """
        try:
            logger.info(f"Loading VRP job {job_id}")

            # Load the job request data
            request_response = self.client.vrp.jobs.retrieve(job_id)

            # Try to load the solution
            solution_response = None
            try:
                solution_response = self.client.vrp.jobs.solution(job_id)
            except Exception:
                # Solution might not be ready yet
                pass

            # Build response dict
            result = {
                'request': json.loads(request_response.model_dump_json()) if request_response else None,
                'solution': json.loads(solution_response.model_dump_json()) if solution_response else None
            }

            return result
        except Exception as e:
            raise self._map_error(e) from e

    async def get_explanation(self, job_id: str) -> JobExplanationResponse:
        """
        Get explanation for a VRP solution

        Args:
            job_id: Job identifier

        Returns:
            Solution explanation as strongly-typed Pydantic model

        Raises:
            VrpApiError: If explanation retrieval fails
        """
        try:
            logger.info(f"Getting explanation for job {job_id}")
            # SDK methods are synchronous
            response = self.client.vrp.jobs.explanation(job_id)
            return response
        except Exception as e:
            raise self._map_error(e) from e

    async def reorder_jobs(
        self, solution_id: str, changes: dict[str, Any]
    ) -> OnRouteResponse:
        """
        Reorder jobs in a solution using Change API

        Args:
            solution_id: Original solution ID
            changes: Change specification

        Returns:
            New solution as strongly-typed Pydantic model

        Raises:
            VrpApiError: If reorder fails
            NotImplementedError: Change API not yet supported in SDK
        """
        # TODO: Implement when SDK supports change/reorder API
        raise NotImplementedError(
            "Job reordering via Change API is not yet implemented in the Python SDK. "
            "This feature is planned for a future release."
        )

    def _map_error(self, error: Exception) -> VrpApiError:
        """
        Map SDK exceptions to VrpApiError

        Args:
            error: Original exception

        Returns:
            VrpApiError with appropriate type and status
        """
        error_message = str(error)

        # Authentication errors
        if "unauthorized" in error_message.lower() or "authentication" in error_message.lower():
            return VrpApiError(
                "Invalid API key",
                error_type="authentication",
                status_code=401,
            )

        # Validation errors
        if "validation" in error_message.lower() or "invalid" in error_message.lower():
            return VrpApiError(
                "Invalid request data",
                error_type="validation",
                status_code=400,
            )

        # Timeout errors
        if "timeout" in error_message.lower():
            return VrpApiError(
                "Request timeout",
                error_type="timeout",
                status_code=408,
            )

        # Network errors
        if "connection" in error_message.lower() or "network" in error_message.lower():
            return VrpApiError(
                "Network error",
                error_type="network",
                status_code=503,
            )

        # Generic server error
        logger.error(f"VRP API error: {error_message}", exc_info=error)
        return VrpApiError(
            "Internal server error",
            error_type="server",
            status_code=500,
        )


def get_vrp_client() -> VrpClient:
    """
    Dependency injection for FastAPI routes

    Returns:
        VrpClient instance
    """
    return VrpClient()


def vrp_error_to_http_exception(error: VrpApiError) -> HTTPException:
    """
    Convert VrpApiError to FastAPI HTTPException

    Args:
        error: VrpApiError instance

    Returns:
        HTTPException
    """
    return HTTPException(
        status_code=error.status_code,
        detail={
            "error": error.message,
            "type": error.error_type,
            "details": error.details,
        },
    )
