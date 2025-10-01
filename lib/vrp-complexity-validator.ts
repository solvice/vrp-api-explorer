/**
 * VRP Complexity Validator
 *
 * Enforces limits on VRP problem complexity to prevent:
 * - Resource exhaustion from large problems
 * - Excessive compute time
 * - API abuse
 */

import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp';

export interface ComplexityLimits {
  maxJobs: number;
  maxResources: number;
  maxTimeWindowsPerJob: number;
  maxBreaksPerResource: number;
}

export interface ComplexityCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  actualComplexity: {
    jobCount: number;
    resourceCount: number;
    maxTimeWindows: number;
    totalTimeWindows: number;
  };
}

// Demo limits for anonymous/public users
export const DEMO_COMPLEXITY_LIMITS: ComplexityLimits = {
  maxJobs: 250,
  maxResources: 30,
  maxTimeWindowsPerJob: 5,
  maxBreaksPerResource: 3,
};

/**
 * Validate VRP problem complexity against limits
 */
export function validateComplexity(
  vrpData: Vrp.VrpSyncSolveParams,
  limits: ComplexityLimits = DEMO_COMPLEXITY_LIMITS
): ComplexityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Count jobs and resources
  const jobCount = vrpData.jobs?.length || 0;
  const resourceCount = vrpData.resources?.length || 0;

  // Check job count
  if (jobCount > limits.maxJobs) {
    errors.push(
      `Too many jobs: ${jobCount} (maximum ${limits.maxJobs} for demo). Sign up for higher limits!`
    );
  }

  if (jobCount === 0) {
    errors.push('At least 1 job is required');
  }

  // Check resource count
  if (resourceCount > limits.maxResources) {
    errors.push(
      `Too many vehicles: ${resourceCount} (maximum ${limits.maxResources} for demo). Sign up for higher limits!`
    );
  }

  if (resourceCount === 0) {
    errors.push('At least 1 vehicle/resource is required');
  }

  // Check time windows per job
  let maxTimeWindows = 0;
  let totalTimeWindows = 0;

  vrpData.jobs?.forEach((job, idx) => {
    const windowCount = job.windows?.length || 0;
    totalTimeWindows += windowCount;

    if (windowCount > maxTimeWindows) {
      maxTimeWindows = windowCount;
    }

    if (windowCount > limits.maxTimeWindowsPerJob) {
      errors.push(
        `Job "${job.name || idx}" has ${windowCount} time windows (maximum ${limits.maxTimeWindowsPerJob} for demo)`
      );
    }
  });

  // Check breaks per resource
  vrpData.resources?.forEach((resource, idx) => {
    resource.shifts?.forEach((shift, shiftIdx) => {
      const breakCount = shift.breaks?.length || 0;

      if (breakCount > limits.maxBreaksPerResource) {
        errors.push(
          `Resource "${resource.name || idx}" shift ${shiftIdx} has ${breakCount} breaks (maximum ${limits.maxBreaksPerResource} for demo)`
        );
      }
    });
  });

  // Warnings for approaching limits
  if (jobCount > limits.maxJobs * 0.8) {
    warnings.push(`Approaching job limit (${jobCount}/${limits.maxJobs})`);
  }

  if (resourceCount > limits.maxResources * 0.8) {
    warnings.push(`Approaching resource limit (${resourceCount}/${limits.maxResources})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    actualComplexity: {
      jobCount,
      resourceCount,
      maxTimeWindows,
      totalTimeWindows,
    },
  };
}

/**
 * Get user-friendly error message for complexity violations
 */
export function getComplexityErrorMessage(result: ComplexityCheckResult): string {
  if (result.valid) {
    return '';
  }

  const errorList = result.errors.map((err, idx) => `${idx + 1}. ${err}`).join('\n');

  return `VRP problem too complex for demo:\n\n${errorList}\n\nSign up for a free account to unlock:\n• 100 jobs (5x more)\n• 10 vehicles\n• Advanced features`;
}

/**
 * Calculate estimated solve time based on complexity (rough heuristic)
 */
export function estimateSolveTime(vrpData: Vrp.VrpSyncSolveParams): number {
  const jobCount = vrpData.jobs?.length || 0;
  const resourceCount = vrpData.resources?.length || 0;

  // Very rough heuristic: base time + job complexity + resource complexity
  const baseTime = 2; // 2 seconds base
  const jobTime = jobCount * 0.1; // 100ms per job
  const resourceTime = resourceCount * 0.5; // 500ms per resource

  return baseTime + jobTime + resourceTime;
}