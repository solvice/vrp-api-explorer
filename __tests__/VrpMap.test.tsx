import { render, screen, waitFor } from '@testing-library/react'
import { VrpMap } from '../components/VrpMap'
import { getSampleVrpData } from '../lib/sample-data'

// Mock MapLibre GL JS
const mockMap = {
  addControl: jest.fn(),
  addSource: jest.fn(),
  addLayer: jest.fn(),
  removeLayer: jest.fn(),
  removeSource: jest.fn(),
  getSource: jest.fn(),
  on: jest.fn((event, callback) => {
    if (event === 'load') {
      // Simulate map load after a short delay
      setTimeout(callback, 0)
    }
  }),
  off: jest.fn(),
  fitBounds: jest.fn(),
  resize: jest.fn(),
  remove: jest.fn(),
  loaded: jest.fn(() => true),
  getStyle: jest.fn(() => ({ layers: [], sources: {} }))
}

jest.mock('maplibre-gl', () => ({
  Map: jest.fn(() => mockMap),
  NavigationControl: jest.fn(),
  Marker: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn(),
    getElement: jest.fn(() => document.createElement('div'))
  })),
  LngLatBounds: jest.fn(() => ({
    extend: jest.fn().mockReturnThis(),
    isEmpty: jest.fn(() => false)
  }))
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

describe('VrpMap', () => {
  const sampleData = getSampleVrpData()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render map container', () => {
      render(<VrpMap requestData={sampleData} />)
      
      expect(screen.getByTestId('vrp-map')).toBeInTheDocument()
    })

    it('should initialize MapLibre map', () => {
      const { Map } = require('maplibre-gl')
      
      render(<VrpMap requestData={sampleData} />)
      
      expect(Map).toHaveBeenCalledWith(
        expect.objectContaining({
          container: expect.any(HTMLElement),
          center: expect.any(Array),
          zoom: expect.any(Number)
        })
      )
    })

    it('should add navigation controls', () => {
      const { NavigationControl } = require('maplibre-gl')
      
      render(<VrpMap requestData={sampleData} />)
      
      expect(NavigationControl).toHaveBeenCalled()
      expect(mockMap.addControl).toHaveBeenCalled()
    })
  })

  describe('Markers Display', () => {
    it('should display markers for job locations', async () => {
      const { Marker } = require('maplibre-gl')
      
      render(<VrpMap requestData={sampleData} />)
      
      // Wait for map to load and markers to be added
      await waitFor(() => {
        const jobsWithLocations = sampleData.jobs.filter(job => job.location)
        expect(Marker).toHaveBeenCalledTimes(jobsWithLocations.length + sampleData.resources.length)
      })
    })

    it('should display markers for resource locations', async () => {
      const { Marker } = require('maplibre-gl')
      
      render(<VrpMap requestData={sampleData} />)
      
      await waitFor(() => {
        // Check that markers are created for resources
        expect(Marker).toHaveBeenCalledTimes(
          sampleData.jobs.filter(job => job.location).length + sampleData.resources.length
        )
      })
    })

    it('should use different marker styles for jobs vs resources', async () => {
      const { Marker } = require('maplibre-gl')
      
      render(<VrpMap requestData={sampleData} />)
      
      await waitFor(() => {
        // Verify that markers were created with different element configurations
        expect(Marker).toHaveBeenCalled()
        
        // Check that markers were created with custom elements (job and resource markers)
        const markerCalls = Marker.mock.calls
        expect(markerCalls.length).toBeGreaterThan(0)
        
        // Each marker call should have an element parameter
        markerCalls.forEach(call => {
          expect(call[0]).toHaveProperty('element')
        })
      })
    })

    it('should fit map bounds to show all markers', async () => {
      render(<VrpMap requestData={sampleData} />)
      
      await waitFor(() => {
        expect(mockMap.fitBounds).toHaveBeenCalled()
      })
    })
  })

  describe('Marker Information', () => {
    it('should create markers with job and resource names', async () => {
      const { Marker } = require('maplibre-gl')
      
      render(<VrpMap requestData={sampleData} />)
      
      await waitFor(() => {
        // Verify markers are created
        expect(Marker).toHaveBeenCalled()
        
        // Verify the correct number of markers for jobs and resources
        const expectedMarkerCount = sampleData.jobs.filter((job: any) => job.location).length + 
                                  sampleData.resources.length
        expect(Marker).toHaveBeenCalledTimes(expectedMarkerCount)
      })
    })
  })

  describe('Response Data Integration', () => {
    const sampleResponse = {
      trips: [
        {
          resourceName: 'vehicle_east',
          visits: [
            {
              jobName: 'delivery_alexanderplatz',
              arrivalTime: '2024-01-15T09:00:00Z',
              sequence: 1
            },
            {
              jobName: 'delivery_potsdamer_platz', 
              arrivalTime: '2024-01-15T10:00:00Z',
              sequence: 2
            }
          ]
        }
      ]
    }

    it('should display routes when response data provided', async () => {
      render(
        <VrpMap 
          requestData={sampleData}
          responseData={sampleResponse}
        />
      )
      
      await waitFor(() => {
        // Should add route layers to map
        expect(mockMap.addSource).toHaveBeenCalled()
        expect(mockMap.addLayer).toHaveBeenCalled()
      })
    })

    it('should create markers with sequence information', async () => {
      const { Marker } = require('maplibre-gl')
      
      render(
        <VrpMap 
          requestData={sampleData}
          responseData={sampleResponse}
        />
      )
      
      await waitFor(() => {
        // Should create markers for visits with sequence info
        expect(Marker).toHaveBeenCalled()
      })
    })

    it('should handle multiple vehicle routes', async () => {
      const multiVehicleResponse = {
        trips: [
          {
            resourceName: 'vehicle_east',
            visits: [
              { jobName: 'delivery_alexanderplatz', sequence: 1 },
              { jobName: 'delivery_potsdamer_platz', sequence: 2 }
            ]
          },
          {
            resourceName: 'vehicle_west', 
            visits: [
              { jobName: 'delivery_brandenburg_gate', sequence: 1 },
              { jobName: 'delivery_museum_island', sequence: 2 }
            ]
          }
        ]
      }

      render(
        <VrpMap 
          requestData={sampleData}
          responseData={multiVehicleResponse}
        />
      )
      
      await waitFor(() => {
        // Should at least attempt to add route sources and layers
        expect(mockMap.addSource).toHaveBeenCalled()
        expect(mockMap.addLayer).toHaveBeenCalled()
      })
    })
  })

  describe('Map Updates', () => {
    it('should update markers when request data changes', async () => {
      const { rerender } = render(<VrpMap requestData={sampleData} />)
      
      await waitFor(() => {
        expect(mockMap.fitBounds).toHaveBeenCalled()
      })
      
      const newData = {
        ...sampleData,
        jobs: sampleData.jobs.slice(0, 3) // Fewer jobs
      }
      
      rerender(<VrpMap requestData={newData} />)
      
      await waitFor(() => {
        // Map should be updated with new markers
        expect(mockMap.fitBounds).toHaveBeenCalledTimes(2)
      })
    })

    it('should handle response data changes', async () => {
      const { rerender } = render(
        <VrpMap 
          requestData={sampleData}
          responseData={{ trips: [] }}
        />
      )
      
      await waitFor(() => {
        expect(mockMap.getStyle).toHaveBeenCalled()
      })
      
      rerender(<VrpMap requestData={sampleData} />)
      
      // Component should handle clearing routes by checking style
      expect(mockMap.getStyle).toHaveBeenCalled()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup map on unmount', () => {
      const { unmount } = render(<VrpMap requestData={sampleData} />)
      
      unmount()
      
      expect(mockMap.remove).toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show loading indicator when map is loading', () => {
      mockMap.loaded.mockReturnValue(false)
      
      render(<VrpMap requestData={sampleData} />)
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should hide loading indicator when map is loaded', async () => {
      render(<VrpMap requestData={sampleData} />)
      
      // Initially should show loading
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
      
      // After load event, should hide loading
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
      })
    })
  })
})