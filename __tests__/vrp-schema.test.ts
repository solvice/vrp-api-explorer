import { generateVrpSchema, validateVrpRequest } from '../lib/vrp-schema'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

describe('VRP Schema Generation and Validation', () => {
  describe('generateVrpSchema', () => {
    it('should generate valid JSON schema for VrpSyncSolveParams', () => {
      const schema = generateVrpSchema()
      
      expect(schema).toBeDefined()
      expect(schema.type).toBe('object')
      expect(schema.properties).toBeDefined()
      expect(schema.required).toContain('jobs')
      expect(schema.required).toContain('resources')
    })

    it('should include properties for jobs and resources', () => {
      const schema = generateVrpSchema()
      
      expect(schema.properties.jobs).toBeDefined()
      expect(schema.properties.jobs.type).toBe('array')
      expect(schema.properties.resources).toBeDefined()
      expect(schema.properties.resources.type).toBe('array')
    })

    it('should include optional properties', () => {
      const schema = generateVrpSchema()
      
      expect(schema.properties.millis).toBeDefined()
      expect(schema.properties.hook).toBeDefined()
      expect(schema.properties.label).toBeDefined()
      expect(schema.properties.options).toBeDefined()
      expect(schema.properties.relations).toBeDefined()
      expect(schema.properties.weights).toBeDefined()
    })
  })

  describe('validateVrpRequest', () => {
    it('should validate a simple valid VRP request', () => {
      const validRequest: Vrp.VrpSyncSolveParams = {
        jobs: [
          {
            name: 'job1',
            location: {
              lat: 52.5200,
              lng: 13.4050
            }
          }
        ],
        resources: [
          {
            name: 'vehicle1',
            shifts: [
              {
                from: '2023-01-13T08:00:00Z',
                to: '2023-01-13T17:00:00Z'
              }
            ]
          }
        ]
      }

      const result = validateVrpRequest(validRequest)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should reject request missing required jobs field', () => {
      const invalidRequest = {
        resources: [
          {
            name: 'vehicle1',
            shifts: [
              {
                from: '2023-01-13T08:00:00Z',
                to: '2023-01-13T17:00:00Z'
              }
            ]
          }
        ]
      }

      const result = validateVrpRequest(invalidRequest)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(error => error.includes('jobs'))).toBe(true)
    })

    it('should reject request missing required resources field', () => {
      const invalidRequest = {
        jobs: [
          {
            name: 'job1',
            location: {
              lat: 52.5200,
              lng: 13.4050
            }
          }
        ]
      }

      const result = validateVrpRequest(invalidRequest)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(error => error.includes('resources'))).toBe(true)
    })

    it('should accept request with optional fields', () => {
      const requestWithOptionals: Vrp.VrpSyncSolveParams = {
        jobs: [
          {
            name: 'job1',
            location: {
              lat: 52.5200,
              lng: 13.4050
            }
          }
        ],
        resources: [
          {
            name: 'vehicle1',
            shifts: [
              {
                from: '2023-01-13T08:00:00Z',
                to: '2023-01-13T17:00:00Z'
              }
            ]
          }
        ],
        millis: '5000',
        label: 'test-request'
      }

      const result = validateVrpRequest(requestWithOptionals)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })
  })
})