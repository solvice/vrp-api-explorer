/**
 * Test data generator for creating large VRP datasets
 * Used for performance testing and benchmarking
 */

interface Location {
  longitude: number
  latitude: number
}

interface GenerateVrpDataOptions {
  numJobs: number
  numVehicles: number
  centerLat?: number
  centerLng?: number
  radiusKm?: number
  timeWindowHours?: number
  includeTimeWindows?: boolean
  includeCapacities?: boolean
}

/**
 * Generate random coordinates within a radius around a center point
 */
function generateRandomLocation(
  centerLat: number,
  centerLng: number,
  radiusKm: number
): Location {
  // Convert radius from km to degrees (approximately)
  const radiusDeg = radiusKm / 111.32 // 1 degree latitude ≈ 111.32 km

  // Random angle
  const angle = Math.random() * 2 * Math.PI

  // Random distance (square root for uniform distribution)
  const distance = Math.sqrt(Math.random()) * radiusDeg

  // Calculate new coordinates
  const latitude = centerLat + (distance * Math.cos(angle))
  const longitude = centerLng + (distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180))

  return {
    latitude: parseFloat(latitude.toFixed(6)),
    longitude: parseFloat(longitude.toFixed(6))
  }
}

/**
 * Generate a time window relative to a base time
 */
function generateTimeWindow(baseTime: Date, windowHours: number) {
  // Random start time within the day
  const startOffset = Math.floor(Math.random() * (24 - windowHours)) * 3600
  const start = new Date(baseTime.getTime() + startOffset * 1000)
  const end = new Date(start.getTime() + windowHours * 3600 * 1000)

  return {
    start: start.toISOString(),
    end: end.toISOString()
  }
}

/**
 * Generate a large VRP dataset for performance testing
 */
export function generateLargeVrpDataset(options: GenerateVrpDataOptions) {
  const {
    numJobs,
    numVehicles,
    centerLat = 51.0538, // Ghent, Belgium
    centerLng = 3.7250,
    radiusKm = 50,
    timeWindowHours = 8,
    includeTimeWindows = true,
    includeCapacities = true
  } = options

  // Base time for all time windows (tomorrow at 8 AM)
  const baseTime = new Date()
  baseTime.setDate(baseTime.getDate() + 1)
  baseTime.setHours(8, 0, 0, 0)

  // Generate depot location (center)
  const depotLocation = {
    latitude: centerLat,
    longitude: centerLng
  }

  // Generate jobs
  const jobs = Array.from({ length: numJobs }, (_, i) => {
    const location = generateRandomLocation(centerLat, centerLng, radiusKm)
    const job: Record<string, any> = {
      name: `job_${i + 1}`,
      location,
      serviceTime: 300 + Math.floor(Math.random() * 900) // 5-20 minutes
    }

    if (includeTimeWindows) {
      job.timeWindows = [generateTimeWindow(baseTime, timeWindowHours)]
    }

    if (includeCapacities) {
      job.demand = {
        weight: 1 + Math.floor(Math.random() * 10) // 1-10 units
      }
    }

    return job
  })

  // Generate vehicles/resources
  const resources = Array.from({ length: numVehicles }, (_, i) => {
    const resource: Record<string, any> = {
      name: `vehicle_${i + 1}`,
      shifts: [
        {
          start: {
            ...depotLocation,
            time: baseTime.toISOString()
          },
          end: {
            ...depotLocation,
            time: new Date(baseTime.getTime() + timeWindowHours * 3600 * 1000).toISOString()
          }
        }
      ]
    }

    if (includeCapacities) {
      resource.capacity = {
        weight: 100 + Math.floor(Math.random() * 100) // 100-200 units
      }
    }

    return resource
  })

  // VRP request object
  const vrpRequest = {
    jobs,
    resources,
    options: {
      polylines: true, // Request actual route geometry
      traffic: 'average'
    }
  }

  return vrpRequest
}

/**
 * Generate a mock VRP solution for testing visualization performance
 * without actually calling the solver API
 */
export function generateMockVrpSolution(
  requestData: Record<string, unknown>,
  jobsPerVehicle?: number
) {
  const jobs = (requestData.jobs as Array<Record<string, any>>) || []
  const resources = (requestData.resources as Array<Record<string, any>>) || []

  if (jobs.length === 0 || resources.length === 0) {
    throw new Error('Invalid request data: missing jobs or resources')
  }

  const avgJobsPerVehicle = jobsPerVehicle || Math.ceil(jobs.length / resources.length)

  // Base time for solution
  const baseTime = new Date()
  baseTime.setDate(baseTime.getDate() + 1)
  baseTime.setHours(8, 0, 0, 0)

  let jobIndex = 0
  const trips = resources.map((resource) => {
    const visits: Array<Record<string, any>> = []
    let currentTime = baseTime.getTime()

    // Assign jobs to this vehicle
    const numJobsForVehicle = Math.min(avgJobsPerVehicle, jobs.length - jobIndex)

    for (let i = 0; i < numJobsForVehicle && jobIndex < jobs.length; i++, jobIndex++) {
      const job = jobs[jobIndex]

      // Add travel time (simulated - 5-15 minutes)
      currentTime += (300 + Math.random() * 600) * 1000

      visits.push({
        job: job.name,
        arrival: new Date(currentTime).toISOString(),
        serviceTime: job.serviceTime || 600,
        waitingTime: 0,
        distance: Math.floor(Math.random() * 10000), // meters
        duration: Math.floor(Math.random() * 1800) // seconds
      })

      // Add service time
      currentTime += (job.serviceTime || 600) * 1000
    }

    return {
      resource: resource.name,
      visits,
      statistics: {
        distance: visits.reduce((sum, v) => sum + (v.distance || 0), 0),
        duration: Math.floor((currentTime - baseTime.getTime()) / 1000),
        waitingTime: 0
      }
    }
  }).filter(trip => trip.visits.length > 0) // Remove empty trips

  const solution = {
    trips,
    unassigned: jobs.slice(jobIndex).map(j => ({ job: j.name, reason: 'No capacity available' })),
    statistics: {
      totalDistance: trips.reduce((sum, t) => sum + (t.statistics?.distance || 0), 0),
      totalDuration: trips.reduce((sum, t) => sum + (t.statistics?.duration || 0), 0),
      totalWaitingTime: 0
    }
  }

  return solution
}

/**
 * Preset configurations for common test scenarios
 */
export const TEST_SCENARIOS = {
  // Small dataset - standard mode works fine
  small: {
    name: 'Small (100 jobs, 5 vehicles)',
    numJobs: 100,
    numVehicles: 5
  },

  // Medium dataset - approaching threshold
  medium: {
    name: 'Medium (500 jobs, 20 vehicles)',
    numJobs: 500,
    numVehicles: 20
  },

  // Large dataset - optimization recommended
  large: {
    name: 'Large (2,000 jobs, 50 vehicles)',
    numJobs: 2000,
    numVehicles: 50
  },

  // Very large dataset - optimization required
  veryLarge: {
    name: 'Very Large (10,000 jobs, 100 vehicles)',
    numJobs: 10000,
    numVehicles: 100
  },

  // Extreme dataset - high-performance mode essential
  extreme: {
    name: 'Extreme (20,000 jobs, 200 vehicles)',
    numJobs: 20000,
    numVehicles: 200
  },

  // Maximum stress test
  maximum: {
    name: 'Maximum (50,000 jobs, 500 vehicles)',
    numJobs: 50000,
    numVehicles: 500
  }
}

/**
 * Helper to create test data for a specific scenario
 */
export function createTestScenario(scenarioName: keyof typeof TEST_SCENARIOS) {
  const scenario = TEST_SCENARIOS[scenarioName]
  console.log(`🧪 Generating test scenario: ${scenario.name}`)

  const startTime = performance.now()
  const requestData = generateLargeVrpDataset(scenario)
  const responseData = generateMockVrpSolution(requestData)
  const endTime = performance.now()

  console.log(`✅ Generated in ${Math.round(endTime - startTime)}ms`)
  console.log(`📊 Jobs: ${requestData.jobs.length}, Vehicles: ${requestData.resources.length}`)
  console.log(`📊 Trips: ${responseData.trips.length}, Unassigned: ${responseData.unassigned.length}`)

  return { requestData, responseData }
}
