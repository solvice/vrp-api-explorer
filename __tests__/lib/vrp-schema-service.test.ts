import { VrpSchemaService } from '../../lib/vrp-schema-service'
import { getSampleVrpData } from '../../lib/sample-data'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

describe('VrpSchemaService', () => {
  let sampleData: Vrp.VrpSyncSolveParams

  beforeEach(() => {
    sampleData = getSampleVrpData('simple')
  })

  describe('getSchemaForAI', () => {
    it('should return comprehensive schema description', () => {
      const schema = VrpSchemaService.getSchemaForAI()
      
      expect(schema).toContain('VRP (Vehicle Routing Problem) JSON Schema')
      expect(schema).toContain('jobs')
      expect(schema).toContain('resources')
      expect(schema).toContain('Core Structure')
      expect(schema).toContain('Jobs Array')
      expect(schema).toContain('Resources Array')
      expect(schema).toContain('Options')
      expect(schema).toContain('Common Patterns')
      expect(schema).toContain('Validation Rules')
    })

    it('should include essential VRP properties', () => {
      const schema = VrpSchemaService.getSchemaForAI()
      
      // Job properties
      expect(schema).toContain('name: string')
      expect(schema).toContain('duration')
      expect(schema).toContain('location')
      expect(schema).toContain('windows')
      expect(schema).toContain('priority')
      expect(schema).toContain('tags')
      
      // Resource properties
      expect(schema).toContain('shifts')
      expect(schema).toContain('capacity')
      expect(schema).toContain('category')
      
      // Options
      expect(schema).toContain('partialPlanning')
      expect(schema).toContain('minimizeResources')
      expect(schema).toContain('polylines')
    })

    it('should provide practical examples', () => {
      const schema = VrpSchemaService.getSchemaForAI()
      
      expect(schema).toContain('Simple delivery')
      expect(schema).toContain('Time windows')
      expect(schema).toContain('Skills matching')
      expect(schema).toContain('Multi-day')
      expect(schema).toContain('Capacity limits')
    })
  })

  describe('getJobSchema', () => {
    it('should return job-specific schema', () => {
      const schema = VrpSchemaService.getJobSchema()
      
      expect(schema).toContain('Job properties')
      expect(schema).toContain('name (required)')
      expect(schema).toContain('duration')
      expect(schema).toContain('location')
      expect(schema).toContain('windows')
      expect(schema).toContain('priority')
      expect(schema).toContain('urgency')
      expect(schema).toContain('complexity')
      expect(schema).toContain('load')
      expect(schema).toContain('tags')
    })

    it('should include practical examples for job properties', () => {
      const schema = VrpSchemaService.getJobSchema()
      
      expect(schema).toContain('900 = 15 minutes')
      expect(schema).toContain('latitude: number, longitude: number')
      expect(schema).toContain('ISO-datetime')
      expect(schema).toContain('default: 1')
    })
  })

  describe('getResourceSchema', () => {
    it('should return resource-specific schema', () => {
      const schema = VrpSchemaService.getResourceSchema()
      
      expect(schema).toContain('Resource properties')
      expect(schema).toContain('name (required)')
      expect(schema).toContain('shifts (required)')
      expect(schema).toContain('capacity')
      expect(schema).toContain('category')
      expect(schema).toContain('tags')
      expect(schema).toContain('hourlyCost')
      expect(schema).toContain('rules')
    })

    it('should include vehicle categories', () => {
      const schema = VrpSchemaService.getResourceSchema()
      
      expect(schema).toContain('CAR')
      expect(schema).toContain('BIKE')
      expect(schema).toContain('TRUCK')
    })
  })

  describe('getModificationExamples', () => {
    it('should return practical modification examples', () => {
      const examples = VrpSchemaService.getModificationExamples()
      
      expect(examples).toContain('Common VRP modifications')
      expect(examples).toContain('Add new job')
      expect(examples).toContain('Add time window')
      expect(examples).toContain('Add new vehicle')
      expect(examples).toContain('Increase capacity')
      expect(examples).toContain('Change time window')
      expect(examples).toContain('Add skill requirement')
    })

    it('should include valid JSON examples', () => {
      const examples = VrpSchemaService.getModificationExamples()
      
      // Should contain valid JSON snippets
      expect(examples).toContain('"name": "delivery_new_customer"')
      expect(examples).toContain('"duration": 600')
      expect(examples).toContain('"latitude": 51.0538')
      expect(examples).toContain('"name": "vehicle_backup"')
      expect(examples).toContain('2024-01-15T09:00:00Z')
    })
  })

  describe('validateModification', () => {
    it('should validate correct VRP structure', () => {
      const result = VrpSchemaService.validateModification(sampleData, sampleData)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid input types', () => {
      const result1 = VrpSchemaService.validateModification(sampleData, null)
      expect(result1.valid).toBe(false)
      expect(result1.errors).toContain('Modified data must be an object')

      const result2 = VrpSchemaService.validateModification(sampleData, 'invalid')
      expect(result2.valid).toBe(false)
      expect(result2.errors).toContain('Modified data must be an object')
    })

    it('should require jobs array', () => {
      const invalidData = { resources: sampleData.resources }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('jobs array is required')
    })

    it('should require resources array', () => {
      const invalidData = { jobs: sampleData.jobs }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('resources array is required')
    })

    it('should require at least one job', () => {
      const invalidData = { jobs: [], resources: sampleData.resources }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least one job is required')
    })

    it('should require at least one resource', () => {
      const invalidData = { jobs: sampleData.jobs, resources: [] }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('At least one resource is required')
    })

    it('should validate job names are strings', () => {
      const invalidData = {
        jobs: [{ name: 123 }],
        resources: sampleData.resources
      }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(err => err.includes('name is required and must be a string'))).toBe(true)
    })

    it('should detect duplicate job names', () => {
      const invalidData = {
        jobs: [
          { name: 'duplicate' },
          { name: 'duplicate' }
        ],
        resources: sampleData.resources
      }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(err => err.includes('Duplicate job name: duplicate'))).toBe(true)
    })

    it('should validate resource names are strings', () => {
      const invalidData = {
        jobs: sampleData.jobs,
        resources: [{ name: 456, shifts: [] }]
      }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(err => err.includes('name is required and must be a string'))).toBe(true)
    })

    it('should detect duplicate resource names', () => {
      const invalidData = {
        jobs: sampleData.jobs,
        resources: [
          { name: 'duplicate', shifts: [{ from: '2024-01-15T08:00:00Z', to: '2024-01-15T17:00:00Z' }] },
          { name: 'duplicate', shifts: [{ from: '2024-01-15T08:00:00Z', to: '2024-01-15T17:00:00Z' }] }
        ]
      }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(err => err.includes('Duplicate resource name: duplicate'))).toBe(true)
    })

    it('should require shifts for resources', () => {
      const invalidData = {
        jobs: sampleData.jobs,
        resources: [{ name: 'test_resource' }]
      }
      const result = VrpSchemaService.validateModification(sampleData, invalidData)
      
      expect(result.valid).toBe(false)
      expect(result.errors.some(err => err.includes('shifts array is required'))).toBe(true)
    })

    it('should handle complex valid modifications', () => {
      const modifiedData = {
        ...sampleData,
        jobs: [
          ...sampleData.jobs,
          {
            name: 'new_delivery',
            duration: 1200,
            location: { latitude: 51.0600, longitude: 3.7300 },
            windows: [{ from: '2024-01-15T10:00:00Z', to: '2024-01-15T12:00:00Z' }],
            priority: 2,
            tags: [{ name: 'urgent', hard: true }]
          }
        ],
        resources: [
          ...sampleData.resources,
          {
            name: 'vehicle_express',
            shifts: [{
              from: '2024-01-15T07:00:00Z',
              to: '2024-01-15T19:00:00Z',
              start: { latitude: 50.95, longitude: 3.80 },
              end: { latitude: 50.95, longitude: 3.80 }
            }],
            capacity: [1000, 500],
            category: 'TRUCK' as const,
            tags: ['urgent', 'heavy_lifting']
          }
        ],
        options: {
          ...sampleData.options,
          minimizeResources: false,
          traffic: 1.2
        }
      }

      const result = VrpSchemaService.validateModification(sampleData, modifiedData)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })
})