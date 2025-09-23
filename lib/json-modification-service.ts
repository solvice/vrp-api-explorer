import { OpenAIService, VrpModificationRequest } from '../components/VrpAssistant/OpenAIService'
import { VrpSchemaService } from './vrp-schema-service'
import { validateVrpRequest } from './vrp-schema'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export interface ModificationResult {
  success: boolean
  modifiedData?: Vrp.VrpSyncSolveParams
  explanation: string
  changes: Array<{
    type: 'add' | 'modify' | 'remove'
    target: 'job' | 'resource' | 'option'
    description: string
  }>
  attempts: number
  validationErrors?: string[]
}

export interface ProcessingOptions {
  maxRetries?: number
  validateResult?: boolean
  includeContext?: boolean
}

export class JsonModificationService {
  private openAIService: OpenAIService
  private maxRetries: number = 3
  private validationEnabled: boolean = true

  constructor(openAIService?: OpenAIService) {
    this.openAIService = openAIService || new OpenAIService()
  }

  /**
   * Process a user request to modify VRP JSON data with AI assistance
   */
  async processModificationRequest(
    currentData: Vrp.VrpSyncSolveParams,
    userRequest: string,
    options: ProcessingOptions = {}
  ): Promise<ModificationResult> {
    const maxRetries = options.maxRetries ?? this.maxRetries
    const validateResult = options.validateResult ?? this.validationEnabled
    
    let attempts = 0
    let lastError: string | null = null
    
    // Validate input data first
    if (validateResult) {
      const inputValidation = validateVrpRequest(currentData)
      if (!inputValidation.valid) {
        return {
          success: false,
          explanation: `Input data is invalid: ${inputValidation.errors.join(', ')}`,
          changes: [],
          attempts: 0,
          validationErrors: inputValidation.errors
        }
      }
    }

    while (attempts < maxRetries) {
      attempts++
      
      try {
        // Prepare AI request with context
        const aiRequest: VrpModificationRequest = {
          currentData,
          userRequest,
          context: this.buildRequestContext(currentData, attempts, lastError, options)
        }

        // Get AI response
        const aiResponse = await this.openAIService.modifyVrpData(aiRequest)
        
        // Validate the modified data if requested
        if (validateResult) {
          const validationResult = this.validateModification(currentData, aiResponse.modifiedData)
          
          if (!validationResult.success) {
            lastError = `Validation failed: ${validationResult.errors.join(', ')}`
            
            // On final attempt, return the validation error
            if (attempts >= maxRetries) {
              return {
                success: false,
                explanation: `Failed after ${attempts} attempts. ${lastError}`,
                changes: aiResponse.changes,
                attempts,
                validationErrors: validationResult.errors
              }
            }
            
            // Continue to next attempt
            continue
          }
        }

        // Success! Return the modified data
        return {
          success: true,
          modifiedData: aiResponse.modifiedData,
          explanation: aiResponse.explanation,
          changes: aiResponse.changes,
          attempts
        }

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error'
        
        // On final attempt, return the error
        if (attempts >= maxRetries) {
          return {
            success: false,
            explanation: `Failed after ${attempts} attempts. Last error: ${lastError}`,
            changes: [],
            attempts
          }
        }
        
        // Continue to next attempt
        continue
      }
    }

    // This should never be reached, but just in case
    return {
      success: false,
      explanation: `Failed after ${attempts} attempts. Last error: ${lastError}`,
      changes: [],
      attempts
    }
  }

  /**
   * Validate that a modification preserves VRP structure and constraints
   * Made public for testing purposes
   */
  validateModification(
    originalData: Vrp.VrpSyncSolveParams,
    modifiedData: Vrp.VrpSyncSolveParams
  ): { success: boolean; errors: string[] } {
    const errors: string[] = []

    // Use VrpSchemaService for structural validation
    const schemaValidation = VrpSchemaService.validateModification(originalData, modifiedData)
    if (!schemaValidation.valid) {
      errors.push(...schemaValidation.errors)
    }

    // Use existing VRP validation for business logic
    const vrpValidation = validateVrpRequest(modifiedData)
    if (!vrpValidation.valid) {
      errors.push(...vrpValidation.errors)
    }

    // Additional semantic validations
    this.validateSemanticConstraints(originalData, modifiedData, errors)

    return {
      success: errors.length === 0,
      errors
    }
  }

  /**
   * Validate semantic constraints that go beyond basic structure
   */
  private validateSemanticConstraints(
    originalData: Vrp.VrpSyncSolveParams,
    modifiedData: Vrp.VrpSyncSolveParams,
    errors: string[]
  ): void {
    // Check for reasonable job counts
    if (modifiedData.jobs.length > originalData.jobs.length * 3) {
      errors.push('Modification added too many jobs (more than 3x original count)')
    }

    // Check for reasonable resource counts
    if (modifiedData.resources.length > originalData.resources.length * 2) {
      errors.push('Modification added too many resources (more than 2x original count)')
    }

    // Validate coordinate ranges for any location changes
    modifiedData.jobs.forEach((job, idx) => {
      if (job.location) {
        if (job.location.latitude && (job.location.latitude < -90 || job.location.latitude > 90)) {
          errors.push(`Job ${idx} (${job.name}): Invalid latitude ${job.location.latitude}`)
        }
        if (job.location.longitude && (job.location.longitude < -180 || job.location.longitude > 180)) {
          errors.push(`Job ${idx} (${job.name}): Invalid longitude ${job.location.longitude}`)
        }
      }
    })

    // Validate resource shift times
    modifiedData.resources.forEach((resource, idx) => {
      if (resource.shifts) {
        resource.shifts.forEach((shift, shiftIdx) => {
          try {
            const fromDate = new Date(shift.from)
            const toDate = new Date(shift.to)
            
            if (isNaN(fromDate.getTime())) {
              errors.push(`Resource ${idx} (${resource.name}), shift ${shiftIdx}: Invalid 'from' date ${shift.from}`)
            }
            if (isNaN(toDate.getTime())) {
              errors.push(`Resource ${idx} (${resource.name}), shift ${shiftIdx}: Invalid 'to' date ${shift.to}`)
            }
            if (fromDate.getTime() >= toDate.getTime()) {
              errors.push(`Resource ${idx} (${resource.name}), shift ${shiftIdx}: 'from' date must be before 'to' date`)
            }
          } catch {
            errors.push(`Resource ${idx} (${resource.name}), shift ${shiftIdx}: Invalid date format`)
          }
        })
      }
    })

    // Check for duration constraints
    modifiedData.jobs.forEach((job, idx) => {
      if (job.duration && (job.duration < 0 || job.duration > 86400)) { // Max 24 hours
        errors.push(`Job ${idx} (${job.name}): Invalid duration ${job.duration} (must be 0-86400 seconds)`)
      }
    })
  }

  /**
   * Build contextual information for AI request
   */
  private buildRequestContext(
    currentData: Vrp.VrpSyncSolveParams,
    attempt: number,
    lastError: string | null,
    options: ProcessingOptions
  ): string {
    const context: string[] = []

    // Add basic statistics
    context.push(`Current VRP has ${currentData.jobs.length} jobs and ${currentData.resources.length} resources.`)

    // Add retry information if this is not the first attempt
    if (attempt > 1) {
      context.push(`This is attempt ${attempt}. Previous attempt failed with: ${lastError}`)
      context.push('Please ensure the response follows the exact JSON format and contains valid VRP data.')
    }

    // Add specific guidance based on data characteristics
    if (currentData.jobs.length > 50) {
      context.push('This is a large VRP instance. Be conservative with modifications.')
    }

    if (currentData.jobs.some(job => job.windows && job.windows.length > 0)) {
      context.push('This VRP has time windows. Ensure any new jobs have appropriate time constraints.')
    }

    if (currentData.resources.some(res => res.capacity && res.capacity.length > 0)) {
      context.push('This VRP uses capacity constraints. Consider load balancing when modifying.')
    }

    // Add validation reminders
    if (options.validateResult !== false) {
      context.push('Ensure all job and resource names are unique and all required fields are present.')
      context.push('Use ISO datetime format (YYYY-MM-DDTHH:mm:ssZ) for all time fields.')
    }

    return context.join(' ')
  }

  /**
   * Generate suggestions for improving VRP data
   */
  async generateOptimizationSuggestions(vrpData: Vrp.VrpSyncSolveParams): Promise<string[]> {
    try {
      return await this.openAIService.generateSuggestions(vrpData)
    } catch {
      // Return fallback suggestions based on data analysis
      return this.generateFallbackSuggestions(vrpData)
    }
  }

  /**
   * Generate fallback suggestions when AI is unavailable
   */
  private generateFallbackSuggestions(vrpData: Vrp.VrpSyncSolveParams): string[] {
    const suggestions: string[] = []
    
    // Analyze job-to-resource ratio
    const jobResourceRatio = vrpData.jobs.length / vrpData.resources.length
    if (jobResourceRatio > 20) {
      suggestions.push('Consider adding more vehicles to reduce workload per resource')
    } else if (jobResourceRatio < 5) {
      suggestions.push('You might have excess capacity - consider removing some vehicles')
    }

    // Check for time windows
    const jobsWithWindows = vrpData.jobs.filter(job => job.windows && job.windows.length > 0)
    if (jobsWithWindows.length === 0) {
      suggestions.push('Add time windows to jobs to improve customer service scheduling')
    } else if (jobsWithWindows.length < vrpData.jobs.length * 0.5) {
      suggestions.push('Consider adding time windows to more jobs for better planning')
    }

    // Check for priorities
    const jobsWithPriority = vrpData.jobs.filter(job => job.priority && job.priority > 1)
    if (jobsWithPriority.length === 0) {
      suggestions.push('Set priority levels on important jobs to ensure they get scheduled first')
    }

    // Check for capacity usage
    const resourcesWithCapacity = vrpData.resources.filter(res => res.capacity && res.capacity.length > 0)
    if (resourcesWithCapacity.length === 0) {
      suggestions.push('Define vehicle capacities and job loads for better optimization')
    }

    // Check for tags/skills
    const jobsWithTags = vrpData.jobs.filter(job => job.tags && job.tags.length > 0)
    const resourcesWithTags = vrpData.resources.filter(res => res.tags && res.tags.length > 0)
    if (jobsWithTags.length > 0 && resourcesWithTags.length === 0) {
      suggestions.push('Add skill tags to resources to match job requirements')
    }

    return suggestions.length > 0 ? suggestions : [
      'Your VRP data looks well-structured',
      'Consider testing with different optimization options',
      'Review the solution for any manual improvements'
    ]
  }

  /**
   * Check if the service is properly configured
   */
  async isConfigured(): Promise<boolean> {
    return await this.openAIService.isConfigured()
  }

  /**
   * Get service status information
   */
  async getStatus(): Promise<{ configured: boolean; apiKey: string }> {
    return {
      configured: await this.isConfigured(),
      apiKey: this.openAIService.getConfigurationStatus()
    }
  }
}