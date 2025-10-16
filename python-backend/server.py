"""
VRP ChatKit Backend Server
Integrates ChatKit with Agents SDK for VRP optimization assistance
Based on: https://github.com/openai/openai-chatkit-advanced-samples
"""

from __future__ import annotations

from typing import Any, AsyncIterator
import json
import os

from openai_agents import Agent, RunConfig, Runner
from openai_agents.model_settings import ModelSettings
from openai_chatkit.agents import AgentContext, stream_agent_response
from openai_chatkit.server import ChatKitServer, StreamingResult
from openai_chatkit.types import (
    ThreadMetadata,
    ThreadStreamEvent,
    UserMessageItem,
)
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from starlette.responses import JSONResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv("../.env.local")

DEFAULT_THREAD_ID = "vrp_default_thread"


def _user_message_text(item: UserMessageItem) -> str:
    """Extract text from user message"""
    parts: list[str] = []
    for part in item.content:
        text = getattr(part, "text", None)
        if text:
            parts.append(text)
    return " ".join(parts).strip()


def _format_vrp_context(vrp_data: dict[str, Any]) -> str:
    """Format VRP context for agent instructions"""
    problem = vrp_data.get("problem", {})
    solution = vrp_data.get("solution")
    metadata = vrp_data.get("metadata", {})

    # Extract key metrics
    jobs_count = len(problem.get("jobs", []))
    resources_count = len(problem.get("resources", []))
    has_solution = metadata.get("hasValidSolution", False)

    context_text = f"""VRP Problem Context:
- Jobs: {jobs_count}
- Vehicles/Resources: {resources_count}
- Has Valid Solution: {has_solution}
- Timestamp: {metadata.get("timestamp", "N/A")}

Full Problem Data:
{json.dumps(problem, indent=2)}
"""

    if solution:
        stats = solution.get("statistics", {})
        context_text += f"""
Current Solution:
- Total Distance: {stats.get("total_distance", "N/A")}
- Total Duration: {stats.get("total_duration", "N/A")}
- Trips: {len(solution.get("trips", []))}
- Unassigned Jobs: {len(solution.get("unassigned", []))}

Full Solution:
{json.dumps(solution, indent=2)}
"""

    return context_text


# Simple in-memory storage for VRP context per thread
vrp_context_store: dict[str, dict[str, Any]] = {}


class VrpMemoryStore:
    """Simple in-memory store for ChatKit"""
    def __init__(self):
        self.threads = {}
        self.messages = {}

    async def get_thread(self, thread_id: str) -> dict | None:
        return self.threads.get(thread_id)

    async def save_thread(self, thread_id: str, data: dict):
        self.threads[thread_id] = data

    async def get_messages(self, thread_id: str) -> list:
        return self.messages.get(thread_id, [])

    async def add_message(self, thread_id: str, message: dict):
        if thread_id not in self.messages:
            self.messages[thread_id] = []
        self.messages[thread_id].append(message)


# VRP Agent with dynamic instructions
vrp_agent = Agent(
    name="VRP Optimization Assistant",
    model="gpt-4o",
    instructions="""You are an expert Vehicle Routing Problem (VRP) optimization assistant.

Your role is to:
1. Understand natural language requests about VRP modifications
2. Analyze current VRP problems and solutions
3. Suggest optimizations and improvements
4. Validate modifications maintain VRP constraints
5. Explain technical concepts clearly

Be specific, technical, and educational in your responses.""",
)


class VrpChatKitServer(ChatKitServer[dict[str, Any]]):
    def __init__(self):
        store = VrpMemoryStore()
        super().__init__(store)
        self.store = store
        self.agent = vrp_agent

    def _resolve_thread_id(self, thread: ThreadMetadata | None) -> str:
        return thread.id if thread and thread.id else DEFAULT_THREAD_ID

    async def respond(
        self,
        thread: ThreadMetadata,
        item: UserMessageItem | None,
        context: dict[str, Any],
    ) -> AsyncIterator[ThreadStreamEvent]:
        if item is None:
            return

        message_text = _user_message_text(item)
        if not message_text:
            return

        thread_key = self._resolve_thread_id(thread)

        # Get VRP context for this thread
        vrp_data = vrp_context_store.get(thread_key, {})
        context_prompt = _format_vrp_context(vrp_data)

        # Combine VRP context with user message
        combined_prompt = f"""{context_prompt}

User Request: {message_text}

Respond as a VRP optimization expert."""

        # Create agent context
        agent_context = AgentContext(
            thread=thread,
            store=self.store,
            request_context=context,
        )

        # Run agent with streaming
        result = Runner.run_streamed(
            self.agent,
            combined_prompt,
            context=agent_context,
            run_config=RunConfig(model_settings=ModelSettings(temperature=0.4)),
        )

        # Stream response back to ChatKit
        async for event in stream_agent_response(agent_context, result):
            yield event


# Initialize server
vrp_server = VrpChatKitServer()

# FastAPI app
app = FastAPI(title="VRP ChatKit Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3007",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3007"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_server() -> VrpChatKitServer:
    return vrp_server


@app.post("/chatkit")
async def chatkit_endpoint(
    request: Request,
    server: VrpChatKitServer = Depends(get_server)
) -> Response:
    """Main ChatKit endpoint"""
    payload = await request.body()
    result = await server.process(payload, {"request": request})

    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")
    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")
    return JSONResponse(result)


@app.post("/vrp/context")
async def update_vrp_context(request: Request) -> dict:
    """Update VRP context for a thread"""
    data = await request.json()
    thread_id = data.get("thread_id", DEFAULT_THREAD_ID)
    vrp_context = data.get("vrpContext", {})

    vrp_context_store[thread_id] = vrp_context

    return {"success": True, "thread_id": thread_id}


@app.get("/vrp/context/{thread_id}")
async def get_vrp_context(thread_id: str) -> dict:
    """Get VRP context for a thread"""
    return {"vrpContext": vrp_context_store.get(thread_id, {})}


@app.get("/health")
async def health_check() -> dict:
    return {"status": "healthy", "service": "VRP ChatKit Backend"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PYTHON_BACKEND_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
