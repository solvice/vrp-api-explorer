"""ChatKit server integration for VRP Analysis Assistant"""

from __future__ import annotations

import inspect
import logging
from typing import Any, AsyncIterator

from agents import Agent, Runner
from chatkit.agents import (
    AgentContext,
    ThreadItemConverter,
    stream_agent_response,
)
from chatkit.server import ChatKitServer
from chatkit.types import (
    ThreadItem,
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
)
from pydantic import ConfigDict, Field

from .constants import INSTRUCTIONS, MODEL
from .memory_store import MemoryStore
from .vrp.context_store import vrp_context_store
from .vrp.tools import analyze_solution, suggest_improvements
from .vrp.types import OnRouteResponse, Trip, Visit

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _is_tool_completion_item(item: Any) -> bool:
    """Check if item is a tool completion"""
    return hasattr(item, "__class__") and item.__class__.__name__ == "ClientToolCallItem"


def _user_message_text(item: UserMessageItem) -> str:
    """Extract text from user message item"""
    parts: list[str] = []
    for part in item.content:
        text = getattr(part, "text", None)
        if text:
            parts.append(text)
    return " ".join(parts).strip()


class VrpAgentContext(AgentContext):
    """Extended agent context with VRP data"""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    store: MemoryStore = Field(exclude=True)
    request_context: dict[str, Any]
    vrp_context: dict[str, Any] | None = None


def _format_vrp_context(vrp_data: dict[str, Any]) -> str:
    """
    Format VRP data as context string for the AI using strongly-typed Pydantic models

    This creates a structured representation that the AI can understand.
    """
    request = vrp_data.get("request", {})
    solution_dict = vrp_data.get("solution")

    # Parse solution into typed Pydantic model if available
    solution: OnRouteResponse | None = None
    if solution_dict:
        try:
            solution = OnRouteResponse.model_validate(solution_dict)
        except Exception as e:
            logger.warning(f"Failed to parse solution as OnRouteResponse: {e}")

    # Build context string
    context_parts = ["<VRP_CONTEXT>"]

    # Problem overview
    jobs = request.get("jobs", [])
    resources = request.get("resources", [])
    context_parts.append(f"\n## Problem Overview")
    context_parts.append(f"- Total Jobs: {len(jobs)}")
    context_parts.append(f"- Total Resources/Vehicles: {len(resources)}")

    # Job details (summarized)
    if jobs:
        context_parts.append(f"\n## Jobs")
        for idx, job in enumerate(jobs[:10]):  # First 10 jobs
            job_id = job.get("id") or job.get("name", f"job_{idx}")
            location = job.get("location", {})
            lat = location.get("latitude")
            lon = location.get("longitude")
            loc_str = f"({lat:.4f}, {lon:.4f})" if lat and lon else location.get("address", "Unknown location")
            duration = job.get("duration", 0)
            context_parts.append(
                f"- {job_id}: {loc_str}, duration={duration}s"
            )
        if len(jobs) > 10:
            context_parts.append(f"  ... and {len(jobs) - 10} more jobs")

    # Resource details
    if resources:
        context_parts.append(f"\n## Resources")
        for resource in resources:
            resource_id = resource.get("id", "unknown")
            capacity = resource.get("capacity", {})
            context_parts.append(f"- {resource_id}: capacity={capacity}")

    # Solution details (if available) - using typed model
    if solution:
        context_parts.append(f"\n## Solution")
        context_parts.append(f"- Solution ID: {solution.id or 'N/A'}")
        context_parts.append(f"- Status: {solution.status or 'SOLVED'}")
        context_parts.append(f"- Routes Generated: {len(solution.trips)}")

        # Unserved jobs (uses correct field name from model)
        unserved_count = len(solution.unserved) if solution.unserved else 0
        context_parts.append(f"- Unserved Jobs: {unserved_count}")

        # Occupancy and efficiency metrics
        if solution.occupancy is not None:
            context_parts.append(f"- Overall Occupancy: {solution.occupancy:.1%}")

        if solution.total_travel_distance_in_meters:
            distance_km = solution.total_travel_distance_in_meters / 1000
            context_parts.append(f"- Total Distance: {distance_km:.1f} km")

        if solution.total_travel_time_in_seconds:
            time_hours = solution.total_travel_time_in_seconds / 3600
            context_parts.append(f"- Total Travel Time: {time_hours:.1f} hours")

        # Route summaries using typed Trip model
        if solution.trips:
            context_parts.append(f"\n## Route Details")
            for idx, trip in enumerate(solution.trips):
                resource = trip.resource or f"vehicle_{idx}"
                visit_count = len(trip.visits)
                distance = trip.distance or 0
                travel_time = trip.travel_time or 0

                context_parts.append(
                    f"- {resource}: {visit_count} stops, "
                    f"{distance/1000:.1f} km, {travel_time/60:.0f} min travel time"
                )

        # Score information
        if solution.score:
            context_parts.append(f"\n## Solution Quality")
            context_parts.append(f"- Feasible: {solution.score.feasible}")
            if solution.score.hard_score is not None:
                context_parts.append(f"- Hard Score: {solution.score.hard_score}")
            if solution.score.soft_score is not None:
                context_parts.append(f"- Soft Score: {solution.score.soft_score}")

        # Violations/warnings using typed model
        if solution.violations:
            context_parts.append(f"\n## Constraint Violations")
            for violation in solution.violations[:5]:  # First 5
                if violation.name and violation.value:
                    context_parts.append(
                        f"- {violation.name} ({violation.level}): {violation.value}"
                    )

    context_parts.append("\n</VRP_CONTEXT>")

    return "\n".join(context_parts)


def _extract_constraint_violations(solution: OnRouteResponse) -> list[str]:
    """
    Extract constraint violations from solution using strongly-typed Pydantic model

    Args:
        solution: Typed VRP solution response

    Returns:
        List of human-readable violation messages
    """
    violations = []

    # Use the violations field from the typed model
    if solution.violations:
        for violation in solution.violations:
            if violation.name and violation.value:
                level = violation.level or "UNKNOWN"
                violations.append(
                    f"{violation.name} ({level}): {violation.value}"
                )

    # Also check for unserved jobs with reasons
    if solution.unserved and solution.unserved_reasons:
        for job_id in solution.unserved[:5]:  # First 5 unserved
            reason = solution.unserved_reasons.get(job_id)
            if reason:
                violations.append(f"Job {job_id} unserved: {reason}")

    return violations


class VrpAssistantServer(ChatKitServer[dict[str, Any]]):
    """ChatKit server for VRP analysis with context injection"""

    def __init__(self) -> None:
        self.store: MemoryStore = MemoryStore()
        super().__init__(self.store)

        # Initialize VRP assistant agent
        tools = [analyze_solution, suggest_improvements]
        self.assistant = Agent[VrpAgentContext](
            model=MODEL,
            name="VRP Analysis Assistant",
            instructions=INSTRUCTIONS,
            tools=tools
            ,  # type: ignore[arg-type]
        )
        self._thread_item_converter = self._init_thread_item_converter()

        logger.info("VRP Assistant Server initialized")

    async def respond(
        self,
        thread: ThreadMetadata,
        item: UserMessageItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        """
        Respond to user message with VRP context injection

        This is called every time a user sends a message.
        """
        logger.info(f"🤖 RESPOND METHOD CALLED")
        logger.info(f"   Thread ID: {thread.id}")
        logger.info(f"   Context keys: {list(context.keys())}")
        logger.info(f"   Session ID in context: {context.get('session_id')}")

        # Get target item (latest if not provided)
        target_item: ThreadItem | None = item
        if target_item is None:
            target_item = await self._latest_thread_item(thread, context)

        if target_item is None or _is_tool_completion_item(target_item):
            return

        # Convert to agent input
        agent_input = await self._to_agent_input(thread, target_item)
        if agent_input is None:
            return

        # Fetch VRP context BEFORE running the agent
        # This ensures the LLM has access to VRP data from the start
        vrp_data: dict[str, Any] | None = None
        session_id = context.get("session_id")

        if session_id:
            logger.info(f"✅ Found session ID: {session_id}")
            vrp_data = await vrp_context_store.get(session_id)

            if vrp_data:
                logger.info(f"✅ Retrieved VRP context for session {session_id}")
            else:
                logger.warning(f"❌ NO VRP CONTEXT found for session {session_id}")
        else:
            logger.warning("❌ NO SESSION ID in request context!")
            logger.warning(f"   Request context: {context}")

        # Create agent context with VRP data
        agent_context = VrpAgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
            vrp_context=vrp_data,  # Store for tools to access
        )

        # Prepend VRP context to agent input so LLM can see it
        # This follows the OpenAI Agents pattern of adding context to input messages
        if vrp_data:
            vrp_context_str = _format_vrp_context(vrp_data)
            logger.info(f"📝 Formatted VRP context ({len(vrp_context_str)} chars)")
            logger.info(f"📝 Context preview: {vrp_context_str[:200]}...")

            # Prepend context to user input
            agent_input = f"{vrp_context_str}\n\nUser: {agent_input}"
            logger.info(f"✅ Prepended VRP context to agent input")

        # Run agent with streaming
        result = Runner.run_streamed(
            self.assistant,
            agent_input,
            context=agent_context,
        )

        # Stream response events
        async for event in stream_agent_response(agent_context, result):
            yield event

        return

    def _init_thread_item_converter(self) -> Any | None:
        """Initialize thread item converter"""
        converter_cls = ThreadItemConverter
        if converter_cls is None or not callable(converter_cls):
            return None

        # Try different initialization patterns
        attempts: tuple[dict[str, Any], ...] = ({},)

        for kwargs in attempts:
            try:
                return converter_cls(**kwargs)
            except TypeError:
                continue
        return None

    async def _latest_thread_item(
        self, thread: ThreadMetadata, context: dict[str, Any]
    ) -> ThreadItem | None:
        """Get latest thread item"""
        try:
            items = await self.store.load_thread_items(thread.id, None, 1, "desc", context)
        except Exception:
            return None

        return items.data[0] if getattr(items, "data", None) else None

    async def _to_agent_input(
        self,
        thread: ThreadMetadata,
        item: ThreadItem,
    ) -> Any | None:
        """Convert thread item to agent input"""
        if _is_tool_completion_item(item):
            return None

        converter = getattr(self, "_thread_item_converter", None)
        if converter is not None:
            for attr in (
                "to_input_item",
                "convert",
                "convert_item",
                "convert_thread_item",
            ):
                method = getattr(converter, attr, None)
                if method is None:
                    continue

                call_args: list[Any] = [item]
                call_kwargs: dict[str, Any] = {}

                try:
                    signature = inspect.signature(method)
                except (TypeError, ValueError):
                    signature = None

                if signature is not None:
                    params = [
                        parameter
                        for parameter in signature.parameters.values()
                        if parameter.kind
                        not in (
                            inspect.Parameter.VAR_POSITIONAL,
                            inspect.Parameter.VAR_KEYWORD,
                        )
                    ]
                    if len(params) >= 2:
                        next_param = params[1]
                        if next_param.kind in (
                            inspect.Parameter.POSITIONAL_ONLY,
                            inspect.Parameter.POSITIONAL_OR_KEYWORD,
                        ):
                            call_args.append(thread)
                        else:
                            call_kwargs[next_param.name] = thread

                result = method(*call_args, **call_kwargs)
                if inspect.isawaitable(result):
                    return await result
                return result

        if isinstance(item, UserMessageItem):
            return _user_message_text(item)

        return None


def create_chatkit_server() -> VrpAssistantServer | None:
    """Create ChatKit server instance"""
    return VrpAssistantServer()
