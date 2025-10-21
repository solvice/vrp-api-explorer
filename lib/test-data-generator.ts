/**
 * Simple test data generator for large VRP datasets
 */

interface Location {
  longitude: number
  latitude: number
}

/**
 * Generate random location within radius
 */
function randomLocation(centerLat: number, centerLng: number, radiusKm: number): Location {
  const radiusDeg = radiusKm / 111.32
  const angle = Math.random() * 2 * Math.PI
  const distance = Math.sqrt(Math.random()) * radiusDeg

  return {
    latitude: parseFloat((centerLat + distance * Math.cos(angle)).toFixed(6)),
    longitude: parseFloat((centerLng + distance * Math.sin(angle) / Math.cos(centerLat * Math.PI / 180)).toFixed(6))
  }
}

/**
 * Generate VRP dataset
 */
export function generateVrpDataset(
  numJobs: number,
  numVehicles: number,
  centerLat = 51.0538,
  centerLng = 3.7250,
  radiusKm = 50
) {
  const baseTime = new Date()
  baseTime.setDate(baseTime.getDate() + 1)
  baseTime.setHours(8, 0, 0, 0)

  const depot = { latitude: centerLat, longitude: centerLng }

  // Jobs
  const jobs = Array.from({ length: numJobs }, (_, i) => ({
    name: `job_${i + 1}`,
    location: randomLocation(centerLat, centerLng, radiusKm),
    serviceTime: 300 + Math.floor(Math.random() * 900)
  }))

  // Vehicles
  const resources = Array.from({ length: numVehicles }, (_, i) => ({
    name: `vehicle_${i + 1}`,
    shifts: [{
      start: { ...depot, time: baseTime.toISOString() },
      end: { ...depot, time: new Date(baseTime.getTime() + 8 * 3600 * 1000).toISOString() }
    }]
  }))

  return { jobs, resources, options: { polylines: true } }
}

/**
 * Generate mock solution (for testing without API)
 */
export function generateMockSolution(request: any) {
  const jobs = request.jobs || []
  const resources = request.resources || []
  const baseTime = new Date()
  baseTime.setDate(baseTime.getDate() + 1)
  baseTime.setHours(8, 0, 0, 0)

  const jobsPerVehicle = Math.ceil(jobs.length / resources.length)
  let jobIndex = 0

  const trips = resources.map((resource: any) => {
    const visits: any[] = []
    let currentTime = baseTime.getTime()

    for (let i = 0; i < jobsPerVehicle && jobIndex < jobs.length; i++, jobIndex++) {
      const job = jobs[jobIndex]
      currentTime += (300 + Math.random() * 600) * 1000 // Travel time

      visits.push({
        job: job.name,
        arrival: new Date(currentTime).toISOString(),
        serviceTime: job.serviceTime || 600
      })

      currentTime += (job.serviceTime || 600) * 1000
    }

    return { resource: resource.name, visits }
  }).filter(t => t.visits.length > 0)

  return { trips, unassigned: [] }
}

/**
 * Quick test scenarios
 */
export function createTestData(size: 'small' | 'medium' | 'large' | 'extreme') {
  const configs = {
    small: { jobs: 100, vehicles: 5 },
    medium: { jobs: 500, vehicles: 20 },
    large: { jobs: 2000, vehicles: 50 },
    extreme: { jobs: 20000, vehicles: 200 }
  }

  const config = configs[size]
  const request = generateVrpDataset(config.jobs, config.vehicles)
  const response = generateMockSolution(request)

  console.log(`Generated ${size}: ${config.jobs} jobs, ${config.vehicles} vehicles`)
  return { request, response }
}
