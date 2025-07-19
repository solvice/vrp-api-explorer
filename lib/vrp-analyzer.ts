import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export interface VrpAnalysis {
  overview: {
    jobCount: number
    resourceCount: number
    jobToResourceRatio: number
    planningComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex'
    estimatedSolutionTime: 'fast' | 'moderate' | 'slow' | 'very_slow'
  }
  jobs: {
    withTimeWindows: number
    withPriorities: number
    withTags: number
    withCapacityRequirements: number
    averageDuration: number
    timeSpread: string // e.g., "8 hours"
  }
  resources: {
    withCapacityDefined: number
    withTags: number
    withMultipleShifts: number
    totalWorkingHours: number
    averageShiftDuration: number
    utilizationPotential: 'low' | 'moderate' | 'high' | 'very_high'
  }
  constraints: {
    hasRelations: boolean
    hasCustomWeights: boolean
    hasSpecialOptions: boolean
    constraintComplexity: 'minimal' | 'moderate' | 'high'
  }
  suggestions: VrpSuggestion[]
  optimizationOpportunities: OptimizationOpportunity[]
}

export interface VrpSuggestion {
  type: 'improvement' | 'optimization' | 'best_practice' | 'warning'
  category: 'capacity' | 'time_windows' | 'skills' | 'efficiency' | 'constraints' | 'data_quality'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'easy' | 'moderate' | 'complex'
  actionable: boolean
  example?: string
}

export interface OptimizationOpportunity {
  area: string
  description: string
  potentialImprovement: string
  implementationSteps: string[]
  priority: 'low' | 'medium' | 'high'
}

export class VrpAnalyzer {
  /**
   * Perform comprehensive analysis of VRP data
   */
  static analyzeVrpData(vrpData: Vrp.VrpSyncSolveParams): VrpAnalysis {
    const overview = this.analyzeOverview(vrpData)
    const jobs = this.analyzeJobs(vrpData.jobs)
    const resources = this.analyzeResources(vrpData.resources)
    const constraints = this.analyzeConstraints(vrpData)
    
    const suggestions = this.generateSuggestions(vrpData, { overview, jobs, resources, constraints })
    const optimizationOpportunities = this.identifyOptimizationOpportunities(vrpData, { overview, jobs, resources, constraints })

    return {
      overview,
      jobs,
      resources,
      constraints,
      suggestions,
      optimizationOpportunities
    }
  }

  /**
   * Generate contextual suggestions for chat initialization
   */
  static generateContextualSuggestions(vrpData: Vrp.VrpSyncSolveParams): string[] {
    const analysis = this.analyzeVrpData(vrpData)
    const suggestions: string[] = []

    // High-impact suggestions first
    const highImpactSuggestions = analysis.suggestions
      .filter(s => s.impact === 'high' && s.actionable)
      .slice(0, 3)
      .map(s => s.title)

    suggestions.push(...highImpactSuggestions)

    // Add contextual suggestions based on data characteristics
    if (analysis.jobs.withTimeWindows === 0 && analysis.overview.jobCount > 5) {
      suggestions.push('Add time windows to jobs for better customer scheduling')
    }

    if (analysis.resources.withCapacityDefined === 0 && analysis.jobs.withCapacityRequirements > 0) {
      suggestions.push('Define vehicle capacities to match job requirements')
    }

    if (analysis.overview.jobToResourceRatio > 15) {
      suggestions.push('Consider adding more vehicles to reduce workload')
    }

    if (analysis.jobs.withPriorities === 0 && analysis.overview.jobCount > 10) {
      suggestions.push('Set priorities on important jobs to ensure they get scheduled')
    }

    // Ensure we have at least a few suggestions
    if (suggestions.length < 3) {
      suggestions.push(
        'Optimize job locations for better routing efficiency',
        'Review resource shift times for better coverage',
        'Consider adding breaks to shifts for driver compliance'
      )
    }

    return suggestions.slice(0, 5) // Limit to 5 suggestions
  }

  /**
   * Get quick analysis summary for UI display
   */
  static getQuickSummary(vrpData: Vrp.VrpSyncSolveParams): string {
    const analysis = this.analyzeVrpData(vrpData)
    const { overview, jobs, resources } = analysis

    const parts: string[] = []

    // Basic stats
    parts.push(`${overview.jobCount} jobs, ${overview.resourceCount} resources`)

    // Complexity indicator
    if (overview.planningComplexity !== 'simple') {
      parts.push(`${overview.planningComplexity} complexity`)
    }

    // Key features
    if (jobs.withTimeWindows > 0) {
      parts.push(`${jobs.withTimeWindows} time-windowed jobs`)
    }

    if (resources.withCapacityDefined > 0) {
      parts.push(`${resources.withCapacityDefined} capacity-enabled vehicles`)
    }

    if (jobs.withTags > 0) {
      parts.push(`skill-based matching`)
    }

    return parts.join(' • ')
  }

  /**
   * Analyze overview metrics
   */
  private static analyzeOverview(vrpData: Vrp.VrpSyncSolveParams) {
    const jobCount = vrpData.jobs.length
    const resourceCount = vrpData.resources.length
    const jobToResourceRatio = jobCount / resourceCount

    // Determine planning complexity
    let planningComplexity: 'simple' | 'moderate' | 'complex' | 'very_complex' = 'simple'
    let complexityScore = 0

    if (jobCount > 50) complexityScore += 2
    else if (jobCount > 20) complexityScore += 1

    if (jobToResourceRatio > 20) complexityScore += 2
    else if (jobToResourceRatio > 10) complexityScore += 1

    if (vrpData.relations && vrpData.relations.length > 0) complexityScore += 1
    if (vrpData.weights) complexityScore += 1
    if (vrpData.jobs.some(j => j.windows && j.windows.length > 0)) complexityScore += 1
    if (vrpData.jobs.some(j => j.tags && j.tags.length > 0)) complexityScore += 1

    if (complexityScore >= 5) planningComplexity = 'very_complex'
    else if (complexityScore >= 3) planningComplexity = 'complex'
    else if (complexityScore >= 1) planningComplexity = 'moderate'

    // Estimate solution time
    let estimatedSolutionTime: 'fast' | 'moderate' | 'slow' | 'very_slow' = 'fast'
    if (planningComplexity === 'very_complex' || jobCount > 100) estimatedSolutionTime = 'very_slow'
    else if (planningComplexity === 'complex' || jobCount > 50) estimatedSolutionTime = 'slow'
    else if (planningComplexity === 'moderate' || jobCount > 20) estimatedSolutionTime = 'moderate'

    return {
      jobCount,
      resourceCount,
      jobToResourceRatio,
      planningComplexity,
      estimatedSolutionTime
    }
  }

  /**
   * Analyze job characteristics
   */
  private static analyzeJobs(jobs: Vrp.Job[]) {
    const withTimeWindows = jobs.filter(j => j.windows && j.windows.length > 0).length
    const withPriorities = jobs.filter(j => j.priority && j.priority > 1).length
    const withTags = jobs.filter(j => j.tags && j.tags.length > 0).length
    const withCapacityRequirements = jobs.filter(j => j.load && j.load.length > 0).length

    const durations = jobs.filter(j => j.duration).map(j => j.duration!)
    const averageDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    // Calculate time spread from time windows
    let timeSpread = 'Not specified'
    const timeWindows = jobs.flatMap(j => j.windows || [])
    if (timeWindows.length > 0) {
      const startTimes = timeWindows.map(w => new Date(w.from).getHours())
      const endTimes = timeWindows.map(w => new Date(w.to).getHours())
      const earliestStart = Math.min(...startTimes)
      const latestEnd = Math.max(...endTimes)
      timeSpread = `${latestEnd - earliestStart} hours`
    }

    return {
      withTimeWindows,
      withPriorities,
      withTags,
      withCapacityRequirements,
      averageDuration,
      timeSpread
    }
  }

  /**
   * Analyze resource characteristics
   */
  private static analyzeResources(resources: Vrp.Resource[]) {
    const withCapacityDefined = resources.filter(r => r.capacity && r.capacity.length > 0).length
    const withTags = resources.filter(r => r.tags && r.tags.length > 0).length
    const withMultipleShifts = resources.filter(r => r.shifts && r.shifts.length > 1).length

    // Calculate working hours
    let totalWorkingHours = 0
    let shiftCount = 0
    
    for (const resource of resources) {
      if (resource.shifts) {
        for (const shift of resource.shifts) {
          const start = new Date(shift.from)
          const end = new Date(shift.to)
          const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
          totalWorkingHours += hours
          shiftCount++
        }
      }
    }

    const averageShiftDuration = shiftCount > 0 ? totalWorkingHours / shiftCount : 0

    // Estimate utilization potential
    let utilizationPotential: 'low' | 'moderate' | 'high' | 'very_high' = 'moderate'
    if (averageShiftDuration > 12) utilizationPotential = 'very_high'
    else if (averageShiftDuration > 8) utilizationPotential = 'high'
    else if (averageShiftDuration < 4) utilizationPotential = 'low'

    return {
      withCapacityDefined,
      withTags,
      withMultipleShifts,
      totalWorkingHours,
      averageShiftDuration,
      utilizationPotential
    }
  }

  /**
   * Analyze constraint complexity
   */
  private static analyzeConstraints(vrpData: Vrp.VrpSyncSolveParams) {
    const hasRelations = Boolean(vrpData.relations && vrpData.relations.length > 0)
    const hasCustomWeights = Boolean(vrpData.weights)
    const hasSpecialOptions = Boolean(vrpData.options && (
      vrpData.options.minimizeResources !== undefined ||
      vrpData.options.partialPlanning !== undefined ||
      vrpData.options.routingEngine !== undefined
    ))

    let constraintComplexity: 'minimal' | 'moderate' | 'high' = 'minimal'
    if (hasRelations && hasCustomWeights) constraintComplexity = 'high'
    else if (hasRelations || hasCustomWeights || hasSpecialOptions) constraintComplexity = 'moderate'

    return {
      hasRelations,
      hasCustomWeights,
      hasSpecialOptions,
      constraintComplexity
    }
  }

  /**
   * Generate actionable suggestions
   */
  private static generateSuggestions(
    vrpData: Vrp.VrpSyncSolveParams,
    analysis: { 
      overview: ReturnType<typeof VrpAnalyzer.analyzeOverview>;
      jobs: ReturnType<typeof VrpAnalyzer.analyzeJobs>;
      resources: ReturnType<typeof VrpAnalyzer.analyzeResources>;
      constraints: ReturnType<typeof VrpAnalyzer.analyzeConstraints>;
    }
  ): VrpSuggestion[] {
    const suggestions: VrpSuggestion[] = []

    // Time windows suggestions
    if (analysis.jobs.withTimeWindows === 0 && analysis.overview.jobCount > 5) {
      suggestions.push({
        type: 'improvement',
        category: 'time_windows',
        title: 'Add time windows to jobs',
        description: 'Time windows help create more realistic schedules and improve customer satisfaction by ensuring deliveries arrive when expected.',
        impact: 'high',
        effort: 'easy',
        actionable: true,
        example: 'Add "windows": [{"from": "2024-01-15T09:00:00Z", "to": "2024-01-15T17:00:00Z"}] to jobs'
      })
    }

    // Capacity suggestions
    if (analysis.resources.withCapacityDefined === 0 && analysis.jobs.withCapacityRequirements > 0) {
      suggestions.push({
        type: 'improvement',
        category: 'capacity',
        title: 'Define vehicle capacities',
        description: 'Vehicle capacity constraints ensure realistic loading and prevent overloading vehicles.',
        impact: 'high',
        effort: 'easy',
        actionable: true,
        example: 'Add "capacity": [1000, 500] to resources (weight, volume)'
      })
    }

    // Resource utilization
    if (analysis.overview.jobToResourceRatio > 20) {
      suggestions.push({
        type: 'optimization',
        category: 'efficiency',
        title: 'Add more vehicles',
        description: 'High job-to-vehicle ratio may lead to very long routes and poor service times.',
        impact: 'medium',
        effort: 'moderate',
        actionable: true
      })
    }

    // Priority suggestions
    if (analysis.jobs.withPriorities === 0 && analysis.overview.jobCount > 10) {
      suggestions.push({
        type: 'best_practice',
        category: 'constraints',
        title: 'Set job priorities',
        description: 'Priority levels help ensure important jobs are scheduled first when not all jobs can be completed.',
        impact: 'medium',
        effort: 'easy',
        actionable: true,
        example: 'Add "priority": 5 to high-importance jobs (higher number = higher priority)'
      })
    }

    // Skills/tags suggestions
    if (analysis.jobs.withTags > 0 && analysis.resources.withTags === 0) {
      suggestions.push({
        type: 'improvement',
        category: 'skills',
        title: 'Add skill tags to resources',
        description: 'Jobs require specific skills but no resources have been tagged with those capabilities.',
        impact: 'high',
        effort: 'easy',
        actionable: true,
        example: 'Add "tags": ["plumbing", "certified"] to matching resources'
      })
    }

    // Performance warnings
    if (analysis.overview.planningComplexity === 'very_complex') {
      suggestions.push({
        type: 'warning',
        category: 'efficiency',
        title: 'Consider simplifying the problem',
        description: 'Very complex problems may take a long time to solve. Consider reducing constraints or splitting into smaller problems.',
        impact: 'medium',
        effort: 'complex',
        actionable: false
      })
    }

    return suggestions
  }

  /**
   * Identify optimization opportunities
   */
  private static identifyOptimizationOpportunities(
    vrpData: Vrp.VrpSyncSolveParams,
    analysis: { 
      overview: ReturnType<typeof VrpAnalyzer.analyzeOverview>;
      jobs: ReturnType<typeof VrpAnalyzer.analyzeJobs>;
      resources: ReturnType<typeof VrpAnalyzer.analyzeResources>;
      constraints: ReturnType<typeof VrpAnalyzer.analyzeConstraints>;
    }
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = []

    // Route efficiency
    if (analysis.jobs.withTimeWindows < analysis.overview.jobCount * 0.5) {
      opportunities.push({
        area: 'Route Efficiency',
        description: 'Many jobs lack time windows, which limits the optimizer\'s ability to create efficient routes',
        potentialImprovement: 'Up to 20% reduction in travel time',
        implementationSteps: [
          'Analyze customer availability patterns',
          'Add realistic time windows to jobs',
          'Test with different window sizes'
        ],
        priority: 'high'
      })
    }

    // Load optimization
    if (analysis.resources.withCapacityDefined === 0 && analysis.overview.jobCount > 20) {
      opportunities.push({
        area: 'Load Optimization',
        description: 'Without capacity constraints, the optimizer cannot balance loads across vehicles',
        potentialImprovement: 'Better vehicle utilization and fewer required vehicles',
        implementationSteps: [
          'Measure typical job loads (weight, volume, items)',
          'Define vehicle capacity limits',
          'Add load requirements to jobs'
        ],
        priority: 'medium'
      })
    }

    // Skill-based optimization
    if (analysis.jobs.withTags === 0 && analysis.overview.jobCount > 15) {
      opportunities.push({
        area: 'Skill-Based Routing',
        description: 'Implementing skill matching can improve service quality and reduce failed visits',
        potentialImprovement: 'Reduced rework and improved customer satisfaction',
        implementationSteps: [
          'Identify job skill requirements',
          'Tag resources with capabilities',
          'Implement skill matching constraints'
        ],
        priority: 'medium'
      })
    }

    return opportunities
  }
}