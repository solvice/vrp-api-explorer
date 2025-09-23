/**
 * Semantic validation utilities for CSV to VRP conversion testing
 * Handles AI response variability while ensuring data accuracy
 */

interface VrpJob {
  id?: string
  name: string
  location: {
    latitude: number
    longitude: number
  }
  duration: number
  priority?: string
  demand?: number[]
}

interface VrpResource {
  id?: string
  capacity?: number[]
  shifts: Array<{
    start_location?: { latitude: number; longitude: number }
    end_location?: { latitude: number; longitude: number }
  }>
}

interface VrpConversionResult {
  vrpData: {
    jobs: VrpJob[]
    resources: VrpResource[]
  }
  explanation: string
  conversionNotes: string[]
  rowsProcessed: number
}

export class CsvFixtureValidator {
  private static readonly COORDINATE_TOLERANCE = 0.001
  private static readonly DURATION_TOLERANCE = 1 // seconds

  /**
   * Validates that AI-generated VRP data matches expected structure and values
   */
  static validateConversion(
    actual: VrpConversionResult,
    expected: VrpConversionResult,
    csvRowCount: number
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate basic structure
    if (!actual.vrpData) {
      errors.push('Missing vrpData field')
    }
    if (!actual.vrpData?.jobs) {
      errors.push('Missing jobs array')
    }
    if (!actual.vrpData?.resources) {
      errors.push('Missing resources array')
    }

    // Validate row count
    if (actual.rowsProcessed !== csvRowCount) {
      errors.push(`Expected ${csvRowCount} rows processed, got ${actual.rowsProcessed}`)
    }

    // Validate job count matches CSV rows
    if (actual.vrpData?.jobs?.length !== csvRowCount) {
      errors.push(`Expected ${csvRowCount} jobs, got ${actual.vrpData?.jobs?.length}`)
    }

    // Validate each job against expected data
    if (actual.vrpData?.jobs && expected.vrpData?.jobs) {
      this.validateJobs(actual.vrpData.jobs, expected.vrpData.jobs, errors)
    }

    // Validate resources exist and have basic structure
    if (actual.vrpData?.resources) {
      this.validateResources(actual.vrpData.resources, errors)
    }

    // Validate response fields exist
    if (!actual.explanation || typeof actual.explanation !== 'string') {
      errors.push('Missing or invalid explanation field')
    }
    if (!Array.isArray(actual.conversionNotes)) {
      errors.push('Missing or invalid conversionNotes array')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  private static validateJobs(actualJobs: VrpJob[], expectedJobs: VrpJob[], errors: string[]) {
    expectedJobs.forEach((expectedJob, index) => {
      // Find matching job by name or position
      const actualJob = actualJobs.find(job =>
        job.name?.includes(expectedJob.name) ||
        job.name?.toLowerCase().includes(expectedJob.name.toLowerCase())
      ) || actualJobs[index]

      if (!actualJob) {
        errors.push(`Missing job for: ${expectedJob.name}`)
        return
      }

      // Validate coordinates with tolerance
      if (!this.coordinatesMatch(actualJob.location, expectedJob.location)) {
        errors.push(`Coordinate mismatch for ${expectedJob.name}: expected ${expectedJob.location.latitude},${expectedJob.location.longitude}, got ${actualJob.location?.latitude},${actualJob.location?.longitude}`)
      }

      // Validate duration with tolerance
      if (Math.abs(actualJob.duration - expectedJob.duration) > this.DURATION_TOLERANCE) {
        errors.push(`Duration mismatch for ${expectedJob.name}: expected ${expectedJob.duration}s, got ${actualJob.duration}s`)
      }

      // Validate demand if specified
      if (expectedJob.demand && actualJob.demand) {
        if (!this.arraysMatch(actualJob.demand, expectedJob.demand)) {
          errors.push(`Demand mismatch for ${expectedJob.name}: expected ${expectedJob.demand}, got ${actualJob.demand}`)
        }
      }
    })
  }

  private static validateResources(resources: VrpResource[], errors: string[]) {
    if (resources.length === 0) {
      errors.push('No vehicle resources generated')
      return
    }

    resources.forEach((resource, index) => {
      if (!resource.id && !resource.shifts) {
        errors.push(`Resource ${index} missing required fields`)
      }

      if (resource.shifts && resource.shifts.length === 0) {
        errors.push(`Resource ${index} has no shifts defined`)
      }

      resource.shifts?.forEach((shift, shiftIndex) => {
        if (!shift.start_location && !shift.end_location) {
          errors.push(`Resource ${index} shift ${shiftIndex} missing location data`)
        }
      })
    })
  }

  private static coordinatesMatch(
    actual: { latitude: number; longitude: number } | undefined,
    expected: { latitude: number; longitude: number }
  ): boolean {
    if (!actual) return false

    return Math.abs(actual.latitude - expected.latitude) <= this.COORDINATE_TOLERANCE &&
           Math.abs(actual.longitude - expected.longitude) <= this.COORDINATE_TOLERANCE
  }

  private static arraysMatch<T>(actual: T[], expected: T[]): boolean {
    if (actual.length !== expected.length) return false
    return actual.every((val, index) => val === expected[index])
  }

  /**
   * Extract key validation metrics for debugging
   */
  static extractMetrics(result: VrpConversionResult) {
    return {
      jobCount: result.vrpData?.jobs?.length || 0,
      resourceCount: result.vrpData?.resources?.length || 0,
      rowsProcessed: result.rowsProcessed,
      hasExplanation: !!result.explanation,
      noteCount: result.conversionNotes?.length || 0,
      coordinates: result.vrpData?.jobs?.map(job => ({
        name: job.name,
        lat: job.location?.latitude,
        lng: job.location?.longitude,
        duration: job.duration
      })) || []
    }
  }
}