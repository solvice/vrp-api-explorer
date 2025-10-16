/**
 * API Configuration
 *
 * Central configuration for API endpoints.
 * Uses NEXT_PUBLIC_API_URL environment variable to point to Python backend.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Generate session ID for VRP context storage
 * In production, this should come from authenticated user session
 */
export function generateSessionId(): string {
  if (typeof window !== 'undefined') {
    // Try to get from localStorage for session persistence
    let sessionId = localStorage.getItem('vrp_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('vrp_session_id', sessionId)
    }
    return sessionId
  }
  // Fallback for SSR
  return `session_${Date.now()}`
}
