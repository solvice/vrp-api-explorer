"""
VRP Complexity Validator

Enforces limits on VRP problem complexity to prevent:
- Resource exhaustion from large problems
- Excessive compute time
- API abuse
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


@dataclass
class ComplexityLimits:
    """Limits for VRP problem complexity"""

    max_jobs: int
    max_resources: int
    max_time_windows_per_job: int
    max_breaks_per_resource: int


class ActualComplexity(BaseModel):
    """Measured complexity of a VRP problem"""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    job_count: int
    resource_count: int
    max_time_windows: int
    total_time_windows: int


@dataclass
class ComplexityCheckResult:
    """Result of complexity validation"""

    valid: bool
    errors: list[str]
    warnings: list[str]
    actual_complexity: ActualComplexity


# Demo limits for anonymous/public users
DEMO_COMPLEXITY_LIMITS = ComplexityLimits(
    max_jobs=250,
    max_resources=30,
    max_time_windows_per_job=5,
    max_breaks_per_resource=3,
)


def validate_complexity(
    vrp_data: dict[str, Any],
    limits: ComplexityLimits = DEMO_COMPLEXITY_LIMITS,
) -> ComplexityCheckResult:
    """
    Validate VRP problem complexity against limits

    Args:
        vrp_data: VRP problem data dictionary
        limits: Complexity limits to enforce

    Returns:
        ComplexityCheckResult with validation status and messages
    """
    errors: list[str] = []
    warnings: list[str] = []

    # Count jobs and resources
    jobs = vrp_data.get("jobs", [])
    resources = vrp_data.get("resources", [])
    job_count = len(jobs)
    resource_count = len(resources)

    # Check job count
    if job_count > limits.max_jobs:
        errors.append(
            f"Too many jobs: {job_count} (maximum {limits.max_jobs} for demo). "
            "Sign up for higher limits!"
        )

    if job_count == 0:
        errors.append("At least 1 job is required")

    # Check resource count
    if resource_count > limits.max_resources:
        errors.append(
            f"Too many vehicles: {resource_count} (maximum {limits.max_resources} for demo). "
            "Sign up for higher limits!"
        )

    if resource_count == 0:
        errors.append("At least 1 vehicle/resource is required")

    # Check time windows per job
    max_time_windows = 0
    total_time_windows = 0

    for idx, job in enumerate(jobs):
        windows = job.get("windows", [])
        window_count = len(windows)
        total_time_windows += window_count

        if window_count > max_time_windows:
            max_time_windows = window_count

        if window_count > limits.max_time_windows_per_job:
            job_name = job.get("name", str(idx))
            errors.append(
                f'Job "{job_name}" has {window_count} time windows '
                f"(maximum {limits.max_time_windows_per_job} for demo)"
            )

    # Check breaks per resource
    for idx, resource in enumerate(resources):
        shifts = resource.get("shifts", [])
        for shift_idx, shift in enumerate(shifts):
            breaks = shift.get("breaks", [])
            break_count = len(breaks)

            if break_count > limits.max_breaks_per_resource:
                resource_name = resource.get("name", str(idx))
                errors.append(
                    f'Resource "{resource_name}" shift {shift_idx} has {break_count} breaks '
                    f"(maximum {limits.max_breaks_per_resource} for demo)"
                )

    # Warnings for approaching limits
    if job_count > limits.max_jobs * 0.8:
        warnings.append(f"Approaching job limit ({job_count}/{limits.max_jobs})")

    if resource_count > limits.max_resources * 0.8:
        warnings.append(
            f"Approaching resource limit ({resource_count}/{limits.max_resources})"
        )

    return ComplexityCheckResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        actual_complexity=ActualComplexity(
            job_count=job_count,
            resource_count=resource_count,
            max_time_windows=max_time_windows,
            total_time_windows=total_time_windows,
        ),
    )


def get_complexity_error_message(result: ComplexityCheckResult) -> str:
    """
    Get user-friendly error message for complexity violations

    Args:
        result: Complexity check result

    Returns:
        Formatted error message string
    """
    if result.valid:
        return ""

    error_list = "\n".join(f"{i + 1}. {err}" for i, err in enumerate(result.errors))

    return (
        f"VRP problem too complex for demo:\n\n{error_list}\n\n"
        "Sign up for a free account to unlock:\n"
        "• 100 jobs (5x more)\n"
        "• 10 vehicles\n"
        "• Advanced features"
    )


def estimate_solve_time(vrp_data: dict[str, Any]) -> float:
    """
    Calculate estimated solve time based on complexity (rough heuristic)

    Args:
        vrp_data: VRP problem data dictionary

    Returns:
        Estimated solve time in seconds
    """
    job_count = len(vrp_data.get("jobs", []))
    resource_count = len(vrp_data.get("resources", []))

    # Very rough heuristic: base time + job complexity + resource complexity
    base_time = 2.0  # 2 seconds base
    job_time = job_count * 0.1  # 100ms per job
    resource_time = resource_count * 0.5  # 500ms per resource

    return base_time + job_time + resource_time
