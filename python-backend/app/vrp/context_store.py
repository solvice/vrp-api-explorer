"""
VRP Context Store for ChatKit Integration

Stores VRP problem and solution data to inject as hidden context
into ChatKit conversations.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)


class VrpContextStore:
    """Thread-safe store for VRP context data"""

    def __init__(self):
        self._contexts: dict[str, dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def save(
        self,
        session_id: str,
        request: dict[str, Any],
        solution: dict[str, Any] | None = None,
    ) -> None:
        """
        Save VRP context for a session

        Args:
            session_id: Unique session identifier
            request: VRP problem request data
            solution: VRP solution data (optional)
        """
        async with self._lock:
            self._contexts[session_id] = {
                "request": request,
                "solution": solution,
                "updated_at": datetime.now().isoformat(),
                "session_id": session_id,
            }
            logger.info(f"✅ SAVED VRP CONTEXT - Session: {session_id}")
            logger.info(f"   Jobs: {len(request.get('jobs', []))}, Resources: {len(request.get('resources', []))}")
            logger.info(f"   Solution present: {solution is not None}")
            logger.info(f"   Total sessions in store: {len(self._contexts)}")
            logger.info(f"   All session IDs in store: {list(self._contexts.keys())}")

    async def get(self, session_id: str) -> dict[str, Any] | None:
        """
        Get VRP context for a session

        Args:
            session_id: Unique session identifier

        Returns:
            VRP context data or None if not found
        """
        async with self._lock:
            context = self._contexts.get(session_id)
            if context:
                logger.info(f"🔍 RETRIEVED VRP CONTEXT - Session: {session_id}")
                logger.info(f"   Has request: {context.get('request') is not None}")
                logger.info(f"   Has solution: {context.get('solution') is not None}")
            else:
                logger.warning(f"❌ NO VRP CONTEXT FOUND - Session: {session_id}")
                logger.warning(f"   Available sessions: {list(self._contexts.keys())}")
            return context

    async def update_solution(
        self, session_id: str, solution: dict[str, Any]
    ) -> None:
        """
        Update solution for existing context

        Args:
            session_id: Unique session identifier
            solution: New solution data
        """
        async with self._lock:
            if session_id in self._contexts:
                self._contexts[session_id]["solution"] = solution
                self._contexts[session_id]["updated_at"] = datetime.now().isoformat()
                logger.info(f"Updated solution for session {session_id}")
            else:
                logger.warning(
                    f"Attempted to update non-existent session {session_id}"
                )

    async def delete(self, session_id: str) -> None:
        """
        Delete VRP context for a session

        Args:
            session_id: Unique session identifier
        """
        async with self._lock:
            if session_id in self._contexts:
                del self._contexts[session_id]
                logger.info(f"Deleted VRP context for session {session_id}")

    async def list_sessions(self) -> list[str]:
        """
        List all active session IDs

        Returns:
            List of session IDs
        """
        async with self._lock:
            return list(self._contexts.keys())

    async def clear_old_sessions(self, max_age_hours: int = 24) -> int:
        """
        Clear sessions older than max_age_hours

        Args:
            max_age_hours: Maximum age in hours

        Returns:
            Number of sessions cleared
        """
        async with self._lock:
            now = datetime.now()
            to_delete = []

            for session_id, context in self._contexts.items():
                updated_at = datetime.fromisoformat(context["updated_at"])
                age_hours = (now - updated_at).total_seconds() / 3600

                if age_hours > max_age_hours:
                    to_delete.append(session_id)

            for session_id in to_delete:
                del self._contexts[session_id]

            if to_delete:
                logger.info(f"Cleared {len(to_delete)} old sessions")

            return len(to_delete)


# Global instance
vrp_context_store = VrpContextStore()
