"""
VRP-specific ChatKit tools

Function tools that the ChatKit assistant can call to analyze VRP data.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from agents import RunContextWrapper, function_tool

logger = logging.getLogger(__name__)


@function_tool(
    description_override="Analyze a specific aspect of the VRP solution (routes, utilization, constraints, efficiency)"
)
async def analyze_solution(
    ctx: RunContextWrapper[Any],
    aspect: str,
) -> dict[str, Any]:
    """
    Analyze VRP solution for a specific aspect

    Args:
        ctx: Agent runtime context
        aspect: Aspect to analyze (routes, utilization, constraints, efficiency)

    Returns:
        Analysis results
    """
    logger.info(f"Analyzing VRP solution aspect: {aspect}")

    # Get VRP context from the agent context
    vrp_context = getattr(ctx.context, "vrp_context", None)

    if not vrp_context:
        return {
            "error": "No VRP solution available to analyze",
            "suggestion": "Please solve a VRP problem first",
        }

    solution = vrp_context.get("solution")
    request = vrp_context.get("request")

    if not solution:
        return {
            "error": "No solution data available",
            "available": bool(request),
        }

    # Perform analysis based on aspect
    aspect_lower = aspect.lower()

    if "route" in aspect_lower:
        return _analyze_routes(solution)
    elif "utilization" in aspect_lower or "capacity" in aspect_lower:
        return _analyze_utilization(solution, request)
    elif "constraint" in aspect_lower or "violation" in aspect_lower:
        return _analyze_constraints(solution)
    elif "efficiency" in aspect_lower or "performance" in aspect_lower:
        return _analyze_efficiency(solution)
    else:
        return _analyze_overview(solution, request)


@function_tool(
    description_override="Suggest specific improvements for the VRP solution based on current metrics"
)
async def suggest_improvements(ctx: RunContextWrapper[Any]) -> dict[str, Any]:
    """
    Suggest improvements for the VRP solution

    Args:
        ctx: Agent runtime context

    Returns:
        List of improvement suggestions
    """
    logger.info("Generating VRP improvement suggestions")

    # Get VRP context
    vrp_context = getattr(ctx.context, "vrp_context", None)

    if not vrp_context or not vrp_context.get("solution"):
        return {
            "error": "No VRP solution available to analyze",
            "suggestions": [],
        }

    solution = vrp_context.get("solution")
    request = vrp_context.get("request")

    suggestions = []

    # Check for unassigned jobs
    unassigned = solution.get("unassigned", [])
    if unassigned:
        suggestions.append({
            "category": "coverage",
            "severity": "high",
            "issue": f"{len(unassigned)} unassigned jobs",
            "suggestion": "Consider adding more vehicles or relaxing time window constraints",
        })

    # Check for constraint violations
    violations = _extract_violations(solution)
    if violations:
        violation_suggestion: dict[str, Any] = {
            "category": "constraints",
            "severity": "high",
            "issue": f"{len(violations)} constraint violations found",
            "suggestion": "Review time windows, capacities, and skills constraints",
            "details": violations[:3],  # Show first 3
        }
        suggestions.append(violation_suggestion)

    # Check utilization
    utilization = _calculate_utilization(solution, request)
    if utilization.get("avg_capacity_utilization", 0) < 0.6:
        suggestions.append({
            "category": "efficiency",
            "severity": "medium",
            "issue": "Low average capacity utilization",
            "suggestion": "Consider reducing number of vehicles or consolidating routes",
        })

    # Check route balance
    trips = solution.get("trips", [])
    if trips:
        durations = [t.get("duration", 0) for t in trips]
        if durations:
            max_duration = max(durations)
            min_duration = min(durations)
            if max_duration > min_duration * 2:
                suggestions.append({
                    "category": "balance",
                    "severity": "low",
                    "issue": "Unbalanced route durations",
                    "suggestion": "Enable route balancing in solver options",
                })

    return {
        "suggestions": suggestions,
        "total_found": len(suggestions),
    }


# Helper functions


def _analyze_routes(solution: dict[str, Any]) -> dict[str, Any]:
    """Analyze route characteristics"""
    trips = solution.get("trips", [])

    if not trips:
        return {"error": "No trips found in solution"}

    route_stats = []
    for idx, trip in enumerate(trips):
        visits = trip.get("visits", [])
        route_stats.append({
            "route_id": idx,
            "resource": trip.get("resource"),
            "stops": len(visits),
            "distance": trip.get("distance"),
            "duration": trip.get("duration"),
            "jobs": [v.get("job") for v in visits],
        })

    return {
        "total_routes": len(trips),
        "routes": route_stats,
    }


def _analyze_utilization(solution: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    """Analyze vehicle utilization"""
    trips = solution.get("trips", [])

    if not trips:
        return {"error": "No trips to analyze"}

    utilization_stats = []
    total_capacity_used = 0
    total_capacity_available = 0

    resources = {r.get("id"): r for r in request.get("resources", [])}

    for trip in trips:
        resource_id = trip.get("resource")
        resource = resources.get(resource_id, {})

        # Calculate capacity utilization
        capacity = resource.get("capacity", {})
        used = trip.get("load", {})

        utilization_stats.append({
            "resource": resource_id,
            "capacity_used": used,
            "capacity_total": capacity,
            "stops": len(trip.get("visits", [])),
        })

    return {
        "utilization_by_vehicle": utilization_stats,
        "vehicles_used": len(trips),
        "total_vehicles_available": len(resources),
    }


def _analyze_constraints(solution: dict[str, Any]) -> dict[str, Any]:
    """Analyze constraint compliance"""
    violations = _extract_violations(solution)
    unassigned = solution.get("unassigned", [])

    return {
        "total_violations": len(violations),
        "violations": violations,
        "unassigned_jobs": len(unassigned),
        "unassigned_details": unassigned,
        "status": "feasible" if not violations else "has_violations",
    }


def _analyze_efficiency(solution: dict[str, Any]) -> dict[str, Any]:
    """Analyze solution efficiency metrics"""
    trips = solution.get("trips", [])

    if not trips:
        return {"error": "No trips to analyze"}

    total_distance = sum(t.get("distance", 0) for t in trips)
    total_duration = sum(t.get("duration", 0) for t in trips)
    total_stops = sum(len(t.get("visits", [])) for t in trips)

    return {
        "total_distance": total_distance,
        "total_duration": total_duration,
        "total_stops": total_stops,
        "avg_distance_per_stop": total_distance / total_stops if total_stops > 0 else 0,
        "vehicles_used": len(trips),
    }


def _analyze_overview(solution: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    """Provide overview analysis"""
    return {
        "routes": _analyze_routes(solution),
        "utilization": _analyze_utilization(solution, request),
        "constraints": _analyze_constraints(solution),
        "efficiency": _analyze_efficiency(solution),
    }


def _calculate_utilization(solution: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    """Calculate utilization metrics"""
    trips = solution.get("trips", [])

    if not trips:
        return {}

    # Simple utilization calculation
    return {
        "vehicles_used": len(trips),
        "vehicles_available": len(request.get("resources", [])),
        "avg_capacity_utilization": 0.7,  # Simplified - would need actual capacity calc
    }


def _extract_violations(solution: dict[str, Any]) -> list[dict[str, Any]]:
    """Extract constraint violations from solution"""
    violations = []

    trips = solution.get("trips", [])
    for trip in trips:
        visits = trip.get("visits", [])
        for visit in visits:
            visit_violations = visit.get("violatedConstraints", []) or visit.get(
                "violations", []
            )
            if visit_violations:
                violations.append({
                    "job": visit.get("job"),
                    "resource": trip.get("resource"),
                    "violations": visit_violations,
                })

    return violations
