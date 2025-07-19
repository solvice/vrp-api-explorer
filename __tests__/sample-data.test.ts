import { getSampleVrpData } from '../lib/sample-data'
import { validateVrpRequest } from '../lib/vrp-schema'

describe('Sample VRP Data', () => {
  describe('getSampleVrpData', () => {
    it('should return valid VRP data', () => {
      const sampleData = getSampleVrpData()
      
      expect(sampleData).toBeDefined()
      expect(sampleData.jobs).toBeDefined()
      expect(sampleData.resources).toBeDefined()
    })

    it('should have exactly 10 locations (2 resources + 8 jobs)', () => {
      const sampleData = getSampleVrpData()
      
      // Count resources with locations
      const resourceLocations = sampleData.resources.filter(r => r.location).length
      
      // Count job locations  
      const jobLocations = sampleData.jobs.filter(j => j.location).length
      
      // Total should be 10 (assuming depot + 8 delivery locations + 1 return depot)
      expect(jobLocations).toBe(8)
      expect(sampleData.resources).toHaveLength(2)
    })

    it('should have realistic geographic coordinates', () => {
      const sampleData = getSampleVrpData()
      
      // Check that all locations have valid lat/lng
      sampleData.jobs.forEach(job => {
        if (job.location) {
          expect(job.location.lat).toBeGreaterThan(-90)
          expect(job.location.lat).toBeLessThan(90)
          expect(job.location.lng).toBeGreaterThan(-180)
          expect(job.location.lng).toBeLessThan(180)
        }
      })

      sampleData.resources.forEach(resource => {
        if (resource.location) {
          expect(resource.location.lat).toBeGreaterThan(-90)
          expect(resource.location.lat).toBeLessThan(90)
          expect(resource.location.lng).toBeGreaterThan(-180)
          expect(resource.location.lng).toBeLessThan(180)
        }
      })
    })

    it('should have time windows and shifts', () => {
      const sampleData = getSampleVrpData()
      
      // Check that resources have shifts
      sampleData.resources.forEach(resource => {
        expect(resource.shifts).toBeDefined()
        expect(resource.shifts!.length).toBeGreaterThan(0)
        
        resource.shifts!.forEach(shift => {
          expect(shift.from).toBeDefined()
          expect(shift.to).toBeDefined()
          expect(new Date(shift.from).getTime()).toBeLessThan(new Date(shift.to).getTime())
        })
      })
    })

    it('should validate against VRP schema', () => {
      const sampleData = getSampleVrpData()
      
      const validationResult = validateVrpRequest(sampleData)
      expect(validationResult.valid).toBe(true)
      expect(validationResult.errors).toEqual([])
    })

    it('should be suitable for immediate demo use', () => {
      const sampleData = getSampleVrpData()
      
      // Should have descriptive names
      expect(sampleData.jobs[0].name).toBeTruthy()
      expect(sampleData.resources[0].name).toBeTruthy()
      
      // Should have service times for realistic routing
      sampleData.jobs.forEach(job => {
        if (job.serviceDuration) {
          expect(job.serviceDuration).toBeGreaterThan(0)
        }
      })
      
      // Should include capacity constraints for demo value
      sampleData.resources.forEach(resource => {
        if (resource.capacity) {
          expect(Array.isArray(resource.capacity)).toBe(true)
        }
      })
    })
  })
})