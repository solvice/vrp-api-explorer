import { validateVrpRequest, isValidVrpRequest } from '../lib/vrp-schema'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

describe('VRP Schema Validation', () => {
  describe('validateVrpRequest', () => {
    it('should validate a simple valid VRP request', () => {
      const validRequest: Vrp.VrpSyncSolveParams = {
        jobs: [
          {
            name: 'job1',
            location: {
              latitude: 52.5200,
              longitude: 13.4050
            }
          }
        ],
        resources: [
          {
            name: 'vehicle1',
            shifts: [
              {
                from: '2023-01-13T08:00:00Z',
                to: '2023-01-13T17:00:00Z',
                start: {
                  latitude: 52.5200,
                  longitude: 13.4050
                }
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
                to: '2023-01-13T17:00:00Z',
                start: {
                  latitude: 52.5200,
                  longitude: 13.4050
                }
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
              latitude: 52.5200,
              longitude: 13.4050
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
              latitude: 52.5200,
              longitude: 13.4050
            }
          }
        ],
        resources: [
          {
            name: 'vehicle1',
            shifts: [
              {
                from: '2023-01-13T08:00:00Z',
                to: '2023-01-13T17:00:00Z',
                start: {
                  latitude: 52.5200,
                  longitude: 13.4050
                }
              }
            ]
          }
        ],
        options: {
          polylines: true
        }
      }

      const result = validateVrpRequest(requestWithOptionals)
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should use isValidVrpRequest type guard', () => {
      const validRequest: Vrp.VrpSyncSolveParams = {
        jobs: [
          {
            name: 'job1',
            location: {
              latitude: 52.5200,
              longitude: 13.4050
            }
          }
        ],
        resources: [
          {
            name: 'vehicle1',
            shifts: [
              {
                from: '2023-01-13T08:00:00Z',
                to: '2023-01-13T17:00:00Z',
                start: {
                  latitude: 52.5200,
                  longitude: 13.4050
                }
              }
            ]
          }
        ]
      }

      expect(isValidVrpRequest(validRequest)).toBe(true)
      expect(isValidVrpRequest({})).toBe(false)
      expect(isValidVrpRequest(null)).toBe(false)
    })
  })
})