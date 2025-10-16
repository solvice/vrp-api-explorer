import { Agent, RunContext } from '@openai/agents';
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp';

export interface VrpAgentContext {
  problem: Vrp.VrpSyncSolveParams;
  solution: Vrp.OnRouteResponse | null;
  metadata: {
    timestamp: string;
    hasValidSolution: boolean;
  };
}

export const vrpAgent = new Agent<VrpAgentContext>({
  name: 'VRP Optimization Assistant',
  model: 'gpt-4o',

  instructions: (ctx: RunContext<VrpAgentContext>) => {
    const { problem, solution, metadata } = ctx.context;

    // Extract key metrics from the problem
    // Handle both fleet/plan structure and resources/jobs structure
    const vehicleCount = (problem.fleet?.vehicles?.length || (problem as any).resources?.length || 0);
    const jobCount = (problem.plan?.jobs?.length || (problem as any).jobs?.length || 0);
    const hasTimeWindows = ((problem.plan?.jobs || (problem as any).jobs)?.some((j: any) => j.time_windows && j.time_windows.length > 0 || j.windows && j.windows.length > 0) || false);
    const hasCapacityConstraints = ((problem.fleet?.vehicles || (problem as any).resources)?.some((v: any) => v.capacity && v.capacity.length > 0) || false);

    // Build solution summary if available
    let solutionSummary = '';
    if (solution) {
      const stats = solution.statistics;
      solutionSummary = `
CURRENT SOLUTION STATISTICS:
- Total distance: ${stats?.total_distance || 'N/A'}
- Total duration: ${stats?.total_duration || 'N/A'}
- Number of trips: ${solution.trips?.length || 0}
- Unassigned jobs: ${solution.unassigned?.length || 0}
- Solution computed at: ${metadata.timestamp}
`;
    } else {
      solutionSummary = '\nNo solution has been computed yet.';
    }

    return `You are an expert Vehicle Routing Problem (VRP) optimization assistant. You help users understand, modify, and optimize their VRP problems.

CURRENT VRP PROBLEM STATE:
- Problem timestamp: ${metadata.timestamp}
- Has valid solution: ${metadata.hasValidSolution}
- Fleet size: ${vehicleCount} vehicles
- Number of jobs: ${jobCount} jobs
- Has time windows: ${hasTimeWindows ? 'Yes' : 'No'}
- Has capacity constraints: ${hasCapacityConstraints ? 'Yes' : 'No'}
${solutionSummary}

FULL PROBLEM DEFINITION:
\`\`\`json
${JSON.stringify(problem, null, 2)}
\`\`\`

${solution ? `COMPLETE SOLUTION DATA:
\`\`\`json
${JSON.stringify(solution, null, 2)}
\`\`\`
` : ''}

YOUR ROLE AND CAPABILITIES:

You are a VRP domain expert. Your primary responsibilities are:

1. **Understanding Requests**: Parse natural language requests about VRP modifications
   - "Add a new vehicle with capacity 100"
   - "Remove job with ID 'job_5'"
   - "Change the time window for delivery_1 to 9am-11am"
   - "What's the current solution quality?"

2. **Explaining Changes**: Clearly communicate what you will modify and why
   - Explain the impact of changes on the problem
   - Identify potential constraint violations
   - Suggest alternatives when appropriate

3. **Analyzing Solutions**: Help users understand their VRP solutions
   - Explain route assignments and sequences
   - Identify optimization opportunities
   - Compare different solution approaches

4. **Validating Modifications**: Ensure all changes maintain VRP validity
   - Check capacity constraints
   - Validate time windows
   - Ensure geographic feasibility
   - Maintain required job-vehicle compatibility

RESPONSE GUIDELINES:

- Be specific and technical when discussing VRP concepts
- Use the actual IDs and values from the problem data
- When suggesting modifications, explain the rationale
- If a request is ambiguous, ask clarifying questions
- If a modification might violate constraints, warn the user
- Format JSON responses clearly with proper indentation
- Reference specific jobs, vehicles, or locations by their IDs

IMPORTANT CONSTRAINTS:

- All jobs must have valid coordinates (lat/lon)
- Vehicle capacities cannot be negative
- Time windows must have start < end
- Service times must be non-negative
- All referenced IDs must exist in the problem

When the user asks you to modify the VRP problem, explain what you'll change and return the modified problem structure in your response. Be helpful, precise, and educational.`;
  },

  tools: [
    {
      type: 'function',
      name: 'analyze_solution_quality',
      description: 'Analyze the quality and efficiency of the current VRP solution',
      parameters: {
        type: 'object',
        properties: {
          metrics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Metrics to analyze: distance, duration, utilization, balance'
          }
        },
        required: ['metrics']
      },
      execute: async (args, ctx: RunContext<VrpAgentContext>) => {
        const { solution, problem } = ctx.context;

        if (!solution) {
          return {
            error: 'No solution available to analyze',
            suggestion: 'Please solve the VRP problem first'
          };
        }

        const analysis: Record<string, unknown> = {};
        const metrics = args.metrics as string[];

        if (metrics.includes('distance')) {
          analysis.totalDistance = solution.statistics?.total_distance;
          analysis.averageDistancePerTrip = solution.trips?.length
            ? (solution.statistics?.total_distance || 0) / solution.trips.length
            : 0;
        }

        if (metrics.includes('duration')) {
          analysis.totalDuration = solution.statistics?.total_duration;
          analysis.averageDurationPerTrip = solution.trips?.length
            ? (solution.statistics?.total_duration || 0) / solution.trips.length
            : 0;
        }

        if (metrics.includes('utilization')) {
          const totalJobs = (problem.plan?.jobs?.length || (problem as any).jobs?.length || 0);
          const assignedJobs = totalJobs - (solution.unassigned?.length || 0);
          analysis.jobUtilization = totalJobs > 0
            ? (assignedJobs / totalJobs) * 100
            : 0;
          analysis.vehicleUtilization = (problem.fleet?.vehicles?.length || (problem as any).resources?.length || 0);
        }

        if (metrics.includes('balance')) {
          const tripDurations = solution.trips?.map(t => t.duration || 0) || [];
          const avgDuration = tripDurations.reduce((a, b) => a + b, 0) / tripDurations.length;
          const variance = tripDurations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / tripDurations.length;
          analysis.routeBalance = {
            averageDuration: avgDuration,
            variance: variance,
            isBalanced: variance < (avgDuration * 0.2) // Within 20% of average
          };
        }

        return {
          success: true,
          analysis,
          timestamp: new Date().toISOString()
        };
      }
    },
    {
      type: 'function',
      name: 'validate_vrp_constraints',
      description: 'Validate that the VRP problem or a proposed modification maintains all constraints',
      parameters: {
        type: 'object',
        properties: {
          checkType: {
            type: 'string',
            enum: ['current', 'proposed'],
            description: 'Whether to check current problem or a proposed modification'
          },
          proposedChange: {
            type: 'object',
            description: 'The proposed modification to validate (if checkType is proposed)'
          }
        },
        required: ['checkType']
      },
      execute: async (args, ctx: RunContext<VrpAgentContext>) => {
        const { problem } = ctx.context;
        const violations: string[] = [];
        const warnings: string[] = [];

        // Handle both structure types
        const jobs = problem.plan?.jobs || (problem as any).jobs || [];
        const vehicles = problem.fleet?.vehicles || (problem as any).resources || [];

        // Check basic structure
        if (jobs.length === 0) {
          violations.push('Problem must have at least one job');
        }

        if (vehicles.length === 0) {
          violations.push('Problem must have at least one vehicle/resource');
        }

        // Check job constraints
        jobs.forEach((job: any, idx: number) => {
          if (!job.location?.lat || !job.location?.lon) {
            violations.push(`Job ${idx} (${job.id || 'unnamed'}) missing valid coordinates`);
          }

          if (job.time_windows) {
            job.time_windows.forEach((tw, twIdx) => {
              if (tw.start && tw.end && tw.start >= tw.end) {
                violations.push(`Job ${job.id || idx} time window ${twIdx} has start >= end`);
              }
            });
          }

          if (job.service_time && job.service_time < 0) {
            violations.push(`Job ${job.id || idx} has negative service time`);
          }
        });

        // Check vehicle constraints
        vehicles.forEach((vehicle: any, idx: number) => {
          if (!vehicle.start_location?.lat || !vehicle.start_location?.lon) {
            violations.push(`Vehicle ${idx} (${vehicle.id || 'unnamed'}) missing valid start coordinates`);
          }

          if (vehicle.capacity) {
            vehicle.capacity.forEach((cap, capIdx) => {
              if (cap < 0) {
                violations.push(`Vehicle ${vehicle.id || idx} capacity ${capIdx} is negative`);
              }
            });
          }

          if (vehicle.shift && vehicle.shift.start && vehicle.shift.end) {
            if (vehicle.shift.start >= vehicle.shift.end) {
              violations.push(`Vehicle ${vehicle.id || idx} shift has start >= end`);
            }
          }
        });

        // Check for potential issues
        const totalJobs = jobs.length;
        const totalVehicles = vehicles.length;

        if (totalJobs > totalVehicles * 20) {
          warnings.push(`High job-to-vehicle ratio (${totalJobs}:${totalVehicles}). Consider adding more vehicles.`);
        }

        return {
          valid: violations.length === 0,
          violations,
          warnings,
          timestamp: new Date().toISOString()
        };
      }
    }
  ]
});
