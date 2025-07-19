import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

/**
 * Service for providing VRP schema information to AI models
 * Formats the Solvice VRP API schema for optimal AI consumption
 */
export class VrpSchemaService {
  /**
   * Get a comprehensive but token-optimized schema description for AI
   */
  static getSchemaForAI(): string {
    return `# VRP (Vehicle Routing Problem) JSON Schema

## Core Structure
A VRP request has two required arrays:
- **jobs**: Tasks to be assigned (max 10,000)
- **resources**: Vehicles/workers to perform jobs (max 2,000)

## Jobs Array
Each job defines work to be done:
\`\`\`typescript
{
  name: string              // Required: Unique identifier
  duration?: number         // Service time in seconds
  location?: {              // GPS coordinates
    latitude: number
    longitude: number
  }
  windows?: Array<{         // Time windows when job can start
    from: string           // ISO datetime
    to: string             // ISO datetime
    hard?: boolean         // true = strict constraint, false = soft
  }>
  priority?: number         // Higher = more important (default: 1)
  urgency?: number         // Higher = schedule earlier
  complexity?: number      // Job difficulty/workload
  load?: number[]          // Multi-dimensional capacity usage
  tags?: Array<{           // Skill/capability requirements
    name: string
    hard?: boolean         // true = required, false = preferred
  }>
  plannedResource?: string // Force assignment to specific resource
  plannedArrival?: string  // Preferred arrival time (soft constraint)
}
\`\`\`

## Resources Array
Each resource defines available capacity:
\`\`\`typescript
{
  name: string              // Required: Unique identifier
  shifts: Array<{           // Required: Work periods
    from: string           // Start datetime (ISO)
    to: string             // End datetime (ISO)
    start?: {              // Starting location
      latitude: number
      longitude: number
    }
    end?: {                // Ending location
      latitude: number
      longitude: number  
    }
    breaks?: Array<{       // Unavailable periods
      type: 'WINDOWED' | 'DRIVE' | 'UNAVAILABILITY'
    }>
  }>
  capacity?: number[]       // Multi-dimensional limits (matches job.load)
  category?: 'CAR' | 'BIKE' | 'TRUCK'
  tags?: string[]          // Capabilities/skills
  hourlyCost?: number      // Cost per hour
}
\`\`\`

## Options (optional)
Controls optimization behavior:
\`\`\`typescript
{
  partialPlanning?: boolean    // Allow unassigned jobs (default: true)
  minimizeResources?: boolean  // Prefer fewer vehicles vs less travel
  polylines?: boolean         // Include route geometries
  routingEngine?: 'OSM' | 'TOMTOM' | 'GOOGLE'
  traffic?: number            // Traffic multiplier (e.g., 1.1 = +10%)
}
\`\`\`

## Common Patterns
1. **Simple delivery**: Jobs with locations, resources with shifts
2. **Time windows**: Use job.windows for customer appointments
3. **Skills matching**: Use job.tags and resource.tags
4. **Multi-day**: Multiple shifts per resource
5. **Capacity limits**: Use job.load and resource.capacity

## Validation Rules
- At least 1 job and 1 resource required
- Job names must be unique
- Resource names must be unique
- Datetime strings must be ISO format (YYYY-MM-DDTHH:mm:ssZ)
- Coordinates: latitude (-90 to 90), longitude (-180 to 180)
- Duration/time values in seconds

## Optimization Objectives
The solver balances:
- Travel time minimization
- Resource utilization
- Time window compliance
- Priority/urgency satisfaction
- Capacity constraints`
  }

  /**
   * Get specific schema section for targeted modifications
   */
  static getJobSchema(): string {
    return `Job properties:
- name (required): Unique string identifier
- duration: Service time in seconds (e.g., 900 = 15 minutes)
- location: {latitude: number, longitude: number}
- windows: [{from: "ISO-datetime", to: "ISO-datetime", hard?: boolean}]
- priority: Higher numbers = more important (default: 1)
- urgency: Higher numbers = schedule earlier in day
- complexity: Workload/difficulty measure
- load: [dimension1, dimension2, ...] for capacity checking
- tags: [{name: "skill", hard?: boolean}] for resource requirements`
  }

  /**
   * Get specific schema section for resource modifications
   */
  static getResourceSchema(): string {
    return `Resource properties:
- name (required): Unique string identifier
- shifts (required): [{from: "ISO-datetime", to: "ISO-datetime", start?: location, end?: location}]
- capacity: [dimension1, dimension2, ...] matching job loads
- category: "CAR" | "BIKE" | "TRUCK"
- tags: ["skill1", "skill2"] capabilities
- hourlyCost: Cost per active hour
- rules: Periodic constraints (max/min work time, etc.)`
  }

  /**
   * Get example modifications for AI learning
   */
  static getModificationExamples(): string {
    return `Common VRP modifications:

## Add new job:
{
  "name": "delivery_new_customer",
  "duration": 600,
  "location": {"latitude": 51.0538, "longitude": 3.725},
  "windows": [{"from": "2024-01-15T09:00:00Z", "to": "2024-01-15T12:00:00Z"}]
}

## Add time window to existing job:
Find job by name, add/modify windows array

## Add new vehicle:
{
  "name": "vehicle_backup", 
  "shifts": [{
    "from": "2024-01-15T08:00:00Z",
    "to": "2024-01-15T17:00:00Z",
    "start": {"latitude": 51.0, "longitude": 3.8}
  }]
}

## Increase capacity:
Find resource, modify capacity array (e.g., [500, 200] -> [750, 300])

## Change time window:
Find job, modify windows[0].from/to times

## Add skill requirement:
Find job, add to tags: [{"name": "certified", "hard": true}]`
  }

  /**
   * Validate if a modification preserves required structure
   */
  static validateModification(original: Vrp.VrpSyncSolveParams, modified: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!modified || typeof modified !== 'object') {
      return { valid: false, errors: ['Modified data must be an object'] }
    }
    
    const mod = modified as Record<string, unknown>
    
    // Check required top-level structure
    if (!Array.isArray(mod.jobs)) {
      errors.push('jobs array is required')
    } else if (mod.jobs.length === 0) {
      errors.push('At least one job is required')
    }
    
    if (!Array.isArray(mod.resources)) {
      errors.push('resources array is required')
    } else if (mod.resources.length === 0) {
      errors.push('At least one resource is required')
    }
    
    // Quick validation of job names
    if (Array.isArray(mod.jobs)) {
      const jobNames = new Set()
      mod.jobs.forEach((job: unknown, idx: number) => {
        const jobObj = job as Record<string, unknown>
        if (!jobObj?.name || typeof jobObj.name !== 'string') {
          errors.push(`Job ${idx}: name is required and must be a string`)
        } else if (jobNames.has(jobObj.name)) {
          errors.push(`Duplicate job name: ${jobObj.name}`)
        } else {
          jobNames.add(jobObj.name)
        }
      })
    }
    
    // Quick validation of resource names and shifts
    if (Array.isArray(mod.resources)) {
      const resourceNames = new Set()
      mod.resources.forEach((resource: unknown, idx: number) => {
        const resourceObj = resource as Record<string, unknown>
        if (!resourceObj?.name || typeof resourceObj.name !== 'string') {
          errors.push(`Resource ${idx}: name is required and must be a string`)
        } else if (resourceNames.has(resourceObj.name)) {
          errors.push(`Duplicate resource name: ${resourceObj.name}`)
        } else {
          resourceNames.add(resourceObj.name)
        }
        
        if (!Array.isArray(resourceObj.shifts) || resourceObj.shifts.length === 0) {
          errors.push(`Resource ${resourceObj?.name || idx}: shifts array is required`)
        }
      })
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
}