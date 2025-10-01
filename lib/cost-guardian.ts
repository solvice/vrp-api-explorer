/**
 * Cost Guardian Service
 *
 * Protects against runaway OpenAI API costs by enforcing daily budget limits.
 * Tracks actual spending and blocks requests when budget is exceeded.
 */

export interface DailyCostTracker {
  date: string; // YYYY-MM-DD
  totalCost: number;
  requestCount: number;
  lastUpdated: Date;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  currentSpend: number;
  budgetRemaining: number;
  budgetLimit: number;
}

class CostGuardian {
  private dailyBudget = 50.00; // $50/day maximum for demo
  private tracker: DailyCostTracker | null = null;

  /**
   * Check if a request with estimated cost is within daily budget
   */
  checkBudget(estimatedCost: number): BudgetCheckResult {
    const today = new Date().toISOString().split('T')[0];

    // Reset tracker if new day
    if (!this.tracker || this.tracker.date !== today) {
      this.tracker = {
        date: today,
        totalCost: 0,
        requestCount: 0,
        lastUpdated: new Date(),
      };
    }

    const projectedTotal = this.tracker.totalCost + estimatedCost;

    if (projectedTotal > this.dailyBudget) {
      return {
        allowed: false,
        reason: `Daily demo budget of $${this.dailyBudget} exceeded. Current spend: $${this.tracker.totalCost.toFixed(2)}. Try again tomorrow or sign up for higher limits.`,
        currentSpend: this.tracker.totalCost,
        budgetRemaining: 0,
        budgetLimit: this.dailyBudget,
      };
    }

    return {
      allowed: true,
      currentSpend: this.tracker.totalCost,
      budgetRemaining: this.dailyBudget - projectedTotal,
      budgetLimit: this.dailyBudget,
    };
  }

  /**
   * Record actual cost after API call completes
   */
  recordCost(actualCost: number): void {
    if (!this.tracker) {
      const today = new Date().toISOString().split('T')[0];
      this.tracker = {
        date: today,
        totalCost: 0,
        requestCount: 0,
        lastUpdated: new Date(),
      };
    }

    this.tracker.totalCost += actualCost;
    this.tracker.requestCount++;
    this.tracker.lastUpdated = new Date();

    // Log warning if approaching limit
    const percentUsed = (this.tracker.totalCost / this.dailyBudget) * 100;
    if (percentUsed >= 80 && percentUsed < 85) {
      console.warn(`⚠️  Cost Guardian: 80% of daily budget used ($${this.tracker.totalCost.toFixed(2)}/$${this.dailyBudget})`);
    } else if (percentUsed >= 90 && percentUsed < 95) {
      console.warn(`🚨 Cost Guardian: 90% of daily budget used ($${this.tracker.totalCost.toFixed(2)}/$${this.dailyBudget})`);
    }
  }

  /**
   * Get current daily statistics
   */
  getStats(): DailyCostTracker | null {
    const today = new Date().toISOString().split('T')[0];

    // Return null if no data or data is from previous day
    if (!this.tracker || this.tracker.date !== today) {
      return null;
    }

    return { ...this.tracker };
  }

  /**
   * Get budget utilization percentage
   */
  getBudgetUtilization(): number {
    const stats = this.getStats();
    if (!stats) return 0;

    return (stats.totalCost / this.dailyBudget) * 100;
  }

  /**
   * Update daily budget limit (for testing or adjustment)
   */
  setDailyBudget(newBudget: number): void {
    if (newBudget <= 0) {
      throw new Error('Daily budget must be positive');
    }

    console.log(`💰 Cost Guardian: Daily budget updated from $${this.dailyBudget} to $${newBudget}`);
    this.dailyBudget = newBudget;
  }

  /**
   * Force reset tracker (for testing purposes)
   */
  reset(): void {
    this.tracker = null;
    console.log('🔄 Cost Guardian: Tracker reset');
  }
}

// Singleton instance
export const costGuardian = new CostGuardian();

// Log initialization
console.log('💰 Cost Guardian initialized with $50/day budget limit');