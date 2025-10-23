/**
 * ChatKit start screen prompt generation
 * Generates context-aware prompts based on VRP problem and solution state
 */

import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp';

export interface StartScreenPrompt {
  label: string;
  prompt: string;
  icon: string;
}

export interface StartScreenConfig {
  greeting: string;
  prompts: StartScreenPrompt[];
}

/**
 * Generate dynamic start screen configuration based on VRP context
 */
export function generateStartScreen(
  vrpData?: Vrp.VrpSyncSolveParams,
  solution?: Vrp.OnRouteResponse | null
): StartScreenConfig {
  const prompts: StartScreenPrompt[] = [];

  // Analyze VRP data characteristics
  const jobCount = vrpData?.jobs?.length || 0;
  const resourceCount = vrpData?.resources?.length || 0;
  const hasTimeWindows = vrpData?.jobs?.some((job) => job.timeWindow) || false;
  const hasCapacities = vrpData?.jobs?.some((job) => job.capacity) || false;

  // Solution-specific prompts
  if (solution) {
    prompts.push({
      label: 'Explain solution',
      prompt: 'Explain the routing solution and key metrics',
      icon: 'lightbulb',
    });

    prompts.push({
      label: 'Improve solution',
      prompt: 'What changes could improve this solution?',
      icon: 'chart',
    });

    if (jobCount > 5) {
      prompts.push({
        label: 'Reduce travel time',
        prompt: 'How can I reduce total travel time in this solution?',
        icon: 'calendar',
      });
    }

    if (resourceCount > 1) {
      prompts.push({
        label: 'Balance workload',
        prompt: 'How evenly is work distributed across vehicles?',
        icon: 'analytics',
      });
    }
  } else {
    // Pre-solve prompts
    prompts.push({
      label: 'Analyze problem',
      prompt: 'Analyze this VRP problem and suggest optimizations',
      icon: 'search',
    });

    prompts.push({
      label: 'What constraints?',
      prompt: 'What constraints and requirements are in this problem?',
      icon: 'check-circle',
    });

    if (jobCount > 10) {
      prompts.push({
        label: 'Simplify problem',
        prompt: 'This problem has many jobs. Can you suggest ways to simplify it?',
        icon: 'sparkle',
      });
    }

    if (!hasTimeWindows && !hasCapacities) {
      prompts.push({
        label: 'Add constraints',
        prompt: 'What constraints should I consider adding (time windows, capacities)?',
        icon: 'plus',
      });
    }
  }

  // Always include general help
  if (prompts.length < 4) {
    prompts.push({
      label: 'What can you do?',
      prompt: 'What can you help me with for VRP analysis and optimization?',
      icon: 'circle-question',
    });
  }

  // Limit to 4 prompts for clean UI
  const limitedPrompts = prompts.slice(0, 4);

  // Generate context-aware greeting
  const greeting = generateGreeting(vrpData, solution);

  return {
    greeting,
    prompts: limitedPrompts,
  };
}

/**
 * Generate a context-aware greeting message
 */
function generateGreeting(
  vrpData?: Vrp.VrpSyncSolveParams,
  solution?: Vrp.OnRouteResponse | null
): string {
  const jobCount = vrpData?.jobs?.length || 0;
  const resourceCount = vrpData?.resources?.length || 0;

  if (solution) {
    return `I can help analyze your routing solution for ${jobCount} jobs across ${resourceCount} vehicle${resourceCount === 1 ? '' : 's'}.`;
  }

  if (jobCount > 0) {
    return `I can help optimize your VRP problem with ${jobCount} job${jobCount === 1 ? '' : 's'} and ${resourceCount} vehicle${resourceCount === 1 ? '' : 's'}.`;
  }

  return 'I can help you analyze and optimize vehicle routing problems. What would you like to explore?';
}
