/**
 * Telemetry service for tracking OpenAI API usage, costs, and performance
 */
export interface TokenUsageEvent {
  id: string;
  timestamp: Date;
  model: string;
  operation: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  latencyMs: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface UsageStats {
  eventCount: number;
  totalCost: number;
  totalTokens: number;
  avgLatency: number;
  successRate: number;
}

class TelemetryService {
  private events: TokenUsageEvent[] = [];
  private readonly MAX_EVENTS = 1000;

  /**
   * Log a token usage event
   */
  logUsage(event: Omit<TokenUsageEvent, 'id' | 'timestamp'>): void {
    const fullEvent: TokenUsageEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // Keep only recent events
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Log to console for immediate visibility
    const status = event.success ? '✅' : '❌';
    console.log(
      `📊 ${status} [${event.model}] ${event.operation}: ${event.totalTokens} tokens, $${event.estimatedCost.toFixed(4)}, ${event.latencyMs}ms`
    );

    // Persist to localStorage for debugging
    this.persistToStorage(fullEvent);
  }

  /**
   * Get aggregated statistics for all events or filtered by operation
   */
  getStats(operation?: string): UsageStats {
    const filtered = operation
      ? this.events.filter(e => e.operation === operation)
      : this.events;

    if (filtered.length === 0) {
      return {
        eventCount: 0,
        totalCost: 0,
        totalTokens: 0,
        avgLatency: 0,
        successRate: 0,
      };
    }

    const totalCost = filtered.reduce((sum, e) => sum + e.estimatedCost, 0);
    const totalTokens = filtered.reduce((sum, e) => sum + e.totalTokens, 0);
    const avgLatency = filtered.reduce((sum, e) => sum + e.latencyMs, 0) / filtered.length;
    const successCount = filtered.filter(e => e.success).length;

    return {
      eventCount: filtered.length,
      totalCost,
      totalTokens,
      avgLatency,
      successRate: successCount / filtered.length,
    };
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(limit = 50): TokenUsageEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Persist event to localStorage for debugging
   */
  private persistToStorage(event: TokenUsageEvent): void {
    if (typeof window === 'undefined') return;

    try {
      const key = `telemetry_${new Date().toISOString().split('T')[0]}`;
      const stored = localStorage.getItem(key);
      const events: TokenUsageEvent[] = stored ? JSON.parse(stored) : [];
      events.push(event);

      // Keep only last 100 events per day to avoid storage bloat
      if (events.length > 100) {
        events.shift();
      }

      localStorage.setItem(key, JSON.stringify(events));
    } catch {
      // Ignore storage errors
    }
  }
}

export const telemetryService = new TelemetryService();