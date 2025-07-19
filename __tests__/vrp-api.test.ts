import { VrpApiClient, VrpApiError } from '../lib/vrp-api'
import { getSampleVrpData } from '../lib/sample-data'

// Mock the solvice-vrp-solver
jest.mock('solvice-vrp-solver', () => {
  return {
    SolviceVrpSolver: jest.fn().mockImplementation((config) => ({
      vrp: {
        syncSolve: jest.fn()
      }
    }))
  }
})

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

describe('VrpApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)
  })

  describe('constructor', () => {
    it('should use demo API key when no user key provided', () => {
      process.env.SOLVICE_API_KEY = 'demo-key-123'
      
      const client = new VrpApiClient()
      expect(client).toBeDefined()
    })

    it('should use user API key when provided', () => {
      const userKey = 'user-key-456'
      mockLocalStorage.getItem.mockReturnValue(userKey)
      
      const client = new VrpApiClient()
      expect(client).toBeDefined()
    })

    it('should throw error when no API key available', () => {
      delete process.env.SOLVICE_API_KEY
      mockLocalStorage.getItem.mockReturnValue(null)
      
      expect(() => new VrpApiClient()).toThrow('No API key available')
    })
  })

  describe('setUserApiKey', () => {
    it('should store user API key in localStorage', () => {
      const client = new VrpApiClient('demo-key')
      const userKey = 'user-key-789'
      
      client.setUserApiKey(userKey)
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('vrp_user_api_key', userKey)
    })

    it('should remove user API key when null provided', () => {
      const client = new VrpApiClient('demo-key')
      
      client.setUserApiKey(null)
      
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vrp_user_api_key')
    })
  })

  describe('getUserApiKey', () => {
    it('should retrieve user API key from localStorage', () => {
      const userKey = 'stored-user-key'
      mockLocalStorage.getItem.mockReturnValue(userKey)
      
      const client = new VrpApiClient('demo-key')
      const retrievedKey = client.getUserApiKey()
      
      expect(retrievedKey).toBe(userKey)
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('vrp_user_api_key')
    })

    it('should return null when no user key stored', () => {
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const client = new VrpApiClient('demo-key')
      const retrievedKey = client.getUserApiKey()
      
      expect(retrievedKey).toBe(null)
    })
  })

  describe('solveVrp', () => {
    it('should successfully solve VRP problem', async () => {
      const mockResponse = {
        trips: [
          {
            resourceName: 'vehicle_east',
            visits: [
              {
                jobName: 'delivery_alexanderplatz',
                arrivalTime: '2024-01-15T09:00:00Z'
              }
            ]
          }
        ]
      }

      const { SolviceVrpSolver } = require('solvice-vrp-solver')
      const mockSyncSolve = jest.fn().mockResolvedValue(mockResponse)
      SolviceVrpSolver.mockImplementation(() => ({
        vrp: { syncSolve: mockSyncSolve }
      }))

      const client = new VrpApiClient('demo-key')
      const sampleData = getSampleVrpData()
      
      const result = await client.solveVrp(sampleData)
      
      expect(result).toEqual(mockResponse)
      expect(mockSyncSolve).toHaveBeenCalledWith(sampleData)
    })

    it('should handle API errors', async () => {
      const { SolviceVrpSolver } = require('solvice-vrp-solver')
      const mockSyncSolve = jest.fn().mockRejectedValue(new Error('API Error'))
      SolviceVrpSolver.mockImplementation(() => ({
        vrp: { syncSolve: mockSyncSolve }
      }))

      const client = new VrpApiClient('demo-key')
      const sampleData = getSampleVrpData()
      
      await expect(client.solveVrp(sampleData)).rejects.toThrow(VrpApiError)
    })

    it('should handle network timeouts', async () => {
      const { SolviceVrpSolver } = require('solvice-vrp-solver')
      const mockSyncSolve = jest.fn().mockRejectedValue(new Error('timeout'))
      SolviceVrpSolver.mockImplementation(() => ({
        vrp: { syncSolve: mockSyncSolve }
      }))

      const client = new VrpApiClient('demo-key')
      const sampleData = getSampleVrpData()
      
      await expect(client.solveVrp(sampleData)).rejects.toThrow(VrpApiError)
    })

    it('should handle authentication errors', async () => {
      const { SolviceVrpSolver } = require('solvice-vrp-solver')
      const authError = new Error('Authentication failed')
      authError.name = 'AuthenticationError'
      const mockSyncSolve = jest.fn().mockRejectedValue(authError)
      SolviceVrpSolver.mockImplementation(() => ({
        vrp: { syncSolve: mockSyncSolve }
      }))

      const client = new VrpApiClient('demo-key')
      const sampleData = getSampleVrpData()
      
      await expect(client.solveVrp(sampleData)).rejects.toThrow(VrpApiError)
      
      try {
        await client.solveVrp(sampleData)
      } catch (error) {
        expect(error).toBeInstanceOf(VrpApiError)
        expect((error as VrpApiError).type).toBe('authentication')
      }
    })
  })

  describe('isUsingDemoKey', () => {
    it('should return true when using demo key', () => {
      process.env.SOLVICE_API_KEY = 'demo-key'
      mockLocalStorage.getItem.mockReturnValue(null)
      
      const client = new VrpApiClient()
      expect(client.isUsingDemoKey()).toBe(true)
    })

    it('should return false when using user key', () => {
      process.env.SOLVICE_API_KEY = 'demo-key'
      mockLocalStorage.getItem.mockReturnValue('user-key')
      
      const client = new VrpApiClient()
      expect(client.isUsingDemoKey()).toBe(false)
    })
  })
})