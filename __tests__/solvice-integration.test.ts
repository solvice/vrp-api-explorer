import { SolviceVrpSolver } from 'solvice-vrp-solver'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

describe('Solvice VRP Solver TypeScript Integration', () => {
  it('should import SolviceVrpSolver client', () => {
    expect(SolviceVrpSolver).toBeDefined()
    expect(typeof SolviceVrpSolver).toBe('function')
  })

  it('should have access to VrpSyncSolveParams type', () => {
    // Create a simple object that matches VrpSyncSolveParams structure
    const sampleVrpRequest: Vrp.VrpSyncSolveParams = {
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

    // Verify the object structure is valid TypeScript
    expect(sampleVrpRequest).toBeDefined()
    expect(sampleVrpRequest.jobs).toHaveLength(1)
    expect(sampleVrpRequest.resources).toHaveLength(1)
    expect(sampleVrpRequest.jobs[0].name).toBe('job1')
    expect(sampleVrpRequest.resources[0].name).toBe('vehicle1')
  })

  it('should have access to OnRouteResponse type', () => {
    // Create a simple object that matches OnRouteResponse structure  
    const sampleResponse: Vrp.OnRouteResponse = {
      trips: [
        {
          resourceName: 'vehicle1',
          visits: [
            {
              jobName: 'job1',
              arrivalTime: '2023-01-13T09:00:00Z',
              departureTime: '2023-01-13T09:30:00Z'
            }
          ]
        }
      ]
    }

    // Verify the response structure is valid TypeScript
    expect(sampleResponse).toBeDefined()
    expect(sampleResponse.trips).toHaveLength(1)
    expect(sampleResponse.trips[0].resourceName).toBe('vehicle1')
    expect(sampleResponse.trips[0].visits).toHaveLength(1)
  })

  it('should be able to create a VRP client instance', () => {
    // Mock fetch for Node.js environment
    const mockFetch = jest.fn()
    
    // Create client with dummy API key for type checking
    const client = new SolviceVrpSolver({
      apiKey: 'test-key',
      fetch: mockFetch
    })

    expect(client).toBeDefined()
    expect(client.vrp).toBeDefined()
    expect(typeof client.vrp.syncSolve).toBe('function')
  })
})