"""FastAPI entrypoint for VRP API Explorer backend"""

from __future__ import annotations

import logging
import os
from typing import Any

from chatkit.server import StreamingResult
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from starlette.responses import JSONResponse

from .chat import VrpAssistantServer, create_chatkit_server
from .vrp.routes import router as vrp_router

# Load environment variables
load_dotenv()

# Configure logging
log_level = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, log_level),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="VRP API Explorer Backend",
    description="FastAPI backend with VRP solving and ChatKit integration",
    version="0.1.0",
)

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3005").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize ChatKit server
_chatkit_server: VrpAssistantServer | None = create_chatkit_server()


def get_chatkit_server() -> VrpAssistantServer:
    """Dependency for ChatKit server"""
    if _chatkit_server is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "ChatKit dependencies are missing. Install the ChatKit Python "
                "package to enable the conversational endpoint."
            ),
        )
    return _chatkit_server


# Include VRP routes
app.include_router(vrp_router)


@app.post("/chatkit")
async def chatkit_endpoint(
    request: Request, server: VrpAssistantServer = Depends(get_chatkit_server)
) -> Response:
    """
    ChatKit streaming endpoint

    Handles ChatKit protocol for AI-powered VRP analysis conversations.
    Automatically injects VRP context from the context store.
    """
    logger.info("💬 CHATKIT REQUEST RECEIVED")

    payload = await request.body()
    logger.info(f"   Payload size: {len(payload)} bytes")

    # Extract session ID from headers if available
    session_id = request.headers.get("x-session-id")
    logger.info(f"   X-Session-ID header: {session_id}")
    logger.info(f"   All headers: {dict(request.headers)}")

    context = {"request": request, "session_id": session_id}
    logger.info(f"   Context being passed: {list(context.keys())}")

    result = await server.process(payload, context)

    if isinstance(result, StreamingResult):
        return StreamingResponse(result, media_type="text/event-stream")

    if hasattr(result, "json"):
        return Response(content=result.json, media_type="application/json")

    return JSONResponse(result)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint with API info"""
    return {
        "service": "VRP API Explorer Backend",
        "version": "0.1.0",
        "status": "operational",
        "endpoints": {
            "vrp": "/vrp/*",
            "chatkit": "/chatkit",
            "health": "/vrp/health",
            "docs": "/docs",
        },
    }


@app.get("/health")
async def health_check() -> dict[str, Any]:
    """
    Health check endpoint

    Returns:
        Service health status
    """
    # Check environment variables
    solvice_key_configured = bool(os.getenv("SOLVICE_API_KEY"))
    openai_key_configured = bool(os.getenv("OPENAI_API_KEY"))

    return {
        "status": "healthy",
        "version": "0.1.0",
        "services": {
            "fastapi": "operational",
            "vrp_api": "operational" if solvice_key_configured else "not_configured",
            "chatkit": "operational" if openai_key_configured else "not_configured",
        },
        "configuration": {
            "solvice_api_key": "configured" if solvice_key_configured else "missing",
            "openai_api_key": "configured" if openai_key_configured else "missing",
        },
    }


# Startup/shutdown events
@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    logger.info("🚀 VRP API Explorer Backend starting up")
    logger.info(f"   CORS origins: {cors_origins}")
    logger.info(f"   Solvice API: {'✅ Configured' if os.getenv('SOLVICE_API_KEY') else '❌ Not configured'}")
    logger.info(f"   OpenAI API: {'✅ Configured' if os.getenv('OPENAI_API_KEY') else '❌ Not configured'}")
    logger.info(f"   ChatKit: {'✅ Enabled' if _chatkit_server else '❌ Disabled'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Run on application shutdown"""
    logger.info("👋 VRP API Explorer Backend shutting down")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
        log_level=log_level.lower(),
    )
