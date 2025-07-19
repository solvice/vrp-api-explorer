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

    it('should have job locations and resource start locations', () => {
      const sampleData = getSampleVrpData()
      
      // Count job locations  
      const jobLocations = sampleData.jobs.filter(j => j.location).length
      
      // In the simple sample, we have 16 delivery jobs + 1 resource with start location
      expect(jobLocations).toBe(16)
      expect(sampleData.resources).toHaveLength(1)
      
      // Resources should have start locations in their shifts
      sampleData.resources.forEach(resource => {
        expect(resource.shifts).toBeDefined()
        resource.shifts?.forEach(shift => {
          expect(shift.start).toBeDefined()
        })
      })
    })

    it('should have realistic geographic coordinates', () => {
      const sampleData = getSampleVrpData()
      
      // Check that all job locations have valid latitude/longitude
      sampleData.jobs.forEach(job => {
        if (job.location) {
          expect(job.location.latitude).toBeGreaterThan(-90)
          expect(job.location.latitude).toBeLessThan(90)
          expect(job.location.longitude).toBeGreaterThan(-180)
          expect(job.location.longitude).toBeLessThan(180)
        }
      })

      // Check that all resource start locations have valid coordinates
      sampleData.resources.forEach(resource => {
        resource.shifts?.forEach(shift => {
          if (shift.start) {
            expect(shift.start.latitude).toBeGreaterThan(-90)
            expect(shift.start.latitude).toBeLessThan(90)
            expect(shift.start.longitude).toBeGreaterThan(-180)
            expect(shift.start.longitude).toBeLessThan(180)
          }
        })
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