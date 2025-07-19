import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate a VRP request using runtime type checking based on SDK types
 */
export function validateVrpRequest(request: unknown): ValidationResult {
  const errors: string[] = []
  
  // Check basic structure
  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['Request must be an object'] }
  }
  
  // Check required fields
  if (!Array.isArray((request as {jobs?: unknown}).jobs)) {
    errors.push('jobs: must be an array')
  } else {
    // Validate jobs
    (request as {jobs: unknown[]}).jobs.forEach((job: unknown, index: number) => {
      if (!job || typeof job !== 'object') {
        errors.push(`jobs[${index}]: must be an object`)
        return
      }
      
      const jobObj = job as Record<string, unknown>
      if (!jobObj.name || typeof jobObj.name !== 'string') {
        errors.push(`jobs[${index}].name: must be a string`)
      }
      
      // Location is optional but if present, validate it
      if (jobObj.location) {
        if (typeof jobObj.location !== 'object' || jobObj.location === null) {
          errors.push(`jobs[${index}].location: must be an object`)
        } else {
          const location = jobObj.location as Record<string, unknown>
          if (typeof location.latitude !== 'number') {
            errors.push(`jobs[${index}].location.latitude: must be a number`)
          }
          if (typeof location.longitude !== 'number') {
            errors.push(`jobs[${index}].location.longitude: must be a number`)
          }
        }
      }
    })
  }
  
  if (!Array.isArray((request as {resources?: unknown}).resources)) {
    errors.push('resources: must be an array')
  } else {
    // Validate resources
    (request as {resources: unknown[]}).resources.forEach((resource: unknown, index: number) => {
      if (!resource || typeof resource !== 'object') {
        errors.push(`resources[${index}]: must be an object`)
        return
      }
      
      const resourceObj = resource as Record<string, unknown>
      if (!resourceObj.name || typeof resourceObj.name !== 'string') {
        errors.push(`resources[${index}].name: must be a string`)
      }
      
      // Shifts are required for resources
      if (!Array.isArray(resourceObj.shifts)) {
        errors.push(`resources[${index}].shifts: must be an array`)
      } else {
        (resourceObj.shifts as unknown[]).forEach((shift: unknown, shiftIndex: number) => {
          if (!shift || typeof shift !== 'object') {
            errors.push(`resources[${index}].shifts[${shiftIndex}]: must be an object`)
            return
          }
          
          const shiftObj = shift as Record<string, unknown>
          if (!shiftObj.from || typeof shiftObj.from !== 'string') {
            errors.push(`resources[${index}].shifts[${shiftIndex}].from: must be a string`)
          }
          
          if (!shiftObj.to || typeof shiftObj.to !== 'string') {
            errors.push(`resources[${index}].shifts[${shiftIndex}].to: must be a string`)
          }
        })
      }
    })
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Type guard to check if an object is a valid VrpSyncSolveParams
 */
export function isValidVrpRequest(request: unknown): request is Vrp.VrpSyncSolveParams {
  return validateVrpRequest(request).valid
}