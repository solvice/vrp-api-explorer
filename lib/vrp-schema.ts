import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate a VRP request using runtime type checking based on SDK types
 */
export function validateVrpRequest(request: any): ValidationResult {
  const errors: string[] = []
  
  // Check basic structure
  if (!request || typeof request !== 'object') {
    return { valid: false, errors: ['Request must be an object'] }
  }
  
  // Check required fields
  if (!Array.isArray(request.jobs)) {
    errors.push('jobs: must be an array')
  } else {
    // Validate jobs
    request.jobs.forEach((job: any, index: number) => {
      if (!job || typeof job !== 'object') {
        errors.push(`jobs[${index}]: must be an object`)
        return
      }
      
      if (!job.name || typeof job.name !== 'string') {
        errors.push(`jobs[${index}].name: must be a string`)
      }
      
      // Location is optional but if present, validate it
      if (job.location) {
        if (typeof job.location !== 'object') {
          errors.push(`jobs[${index}].location: must be an object`)
        } else {
          if (typeof job.location.latitude !== 'number') {
            errors.push(`jobs[${index}].location.latitude: must be a number`)
          }
          if (typeof job.location.longitude !== 'number') {
            errors.push(`jobs[${index}].location.longitude: must be a number`)
          }
        }
      }
    })
  }
  
  if (!Array.isArray(request.resources)) {
    errors.push('resources: must be an array')
  } else {
    // Validate resources
    request.resources.forEach((resource: any, index: number) => {
      if (!resource || typeof resource !== 'object') {
        errors.push(`resources[${index}]: must be an object`)
        return
      }
      
      if (!resource.name || typeof resource.name !== 'string') {
        errors.push(`resources[${index}].name: must be a string`)
      }
      
      // Shifts are required for resources
      if (!Array.isArray(resource.shifts)) {
        errors.push(`resources[${index}].shifts: must be an array`)
      } else {
        resource.shifts.forEach((shift: any, shiftIndex: number) => {
          if (!shift || typeof shift !== 'object') {
            errors.push(`resources[${index}].shifts[${shiftIndex}]: must be an object`)
            return
          }
          
          if (!shift.from || typeof shift.from !== 'string') {
            errors.push(`resources[${index}].shifts[${shiftIndex}].from: must be a string`)
          }
          
          if (!shift.to || typeof shift.to !== 'string') {
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
export function isValidVrpRequest(request: any): request is Vrp.VrpSyncSolveParams {
  return validateVrpRequest(request).valid
}