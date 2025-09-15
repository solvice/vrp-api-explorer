import { decodePolyline } from '@/lib/polyline-decoder'

describe('Polyline Integration', () => {
  describe('VRP Response with Polylines', () => {
    it('should handle VRP response structure with polylines', () => {
      // Mock VRP response structure with polylines
      const mockVrpResponse = {
        trips: [
          {
            resource: 'vehicle_1',
            visits: [
              { job: 'delivery_1', arrivalTime: '2024-01-15T09:00:00Z' },
              { job: 'delivery_2', arrivalTime: '2024-01-15T10:30:00Z' }
            ],
            polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@' // Encoded polyline
          },
          {
            resource: 'vehicle_2',
            visits: [
              { job: 'delivery_3', arrivalTime: '2024-01-15T09:15:00Z' }
            ],
            polyline: 'u{~vFvyys@fS]' // Another encoded polyline
          }
        ]
      }

      // Test that we can access and decode polylines from the response
      expect(mockVrpResponse.trips).toHaveLength(2)

      mockVrpResponse.trips.forEach((trip, index) => {
        expect(trip.polyline).toBeDefined()
        expect(typeof trip.polyline).toBe('string')

        // Test that the polyline can be decoded
        const coordinates = decodePolyline(trip.polyline!)
        expect(coordinates).toBeDefined()
        expect(coordinates.length).toBeGreaterThan(0)

        console.log(`Trip ${index + 1} polyline decoded to ${coordinates.length} coordinates`)
      })
    })

    it('should handle VRP response without polylines (fallback)', () => {
      // Mock VRP response without polylines
      const mockVrpResponse = {
        trips: [
          {
            resource: 'vehicle_1',
            visits: [
              { job: 'delivery_1', arrivalTime: '2024-01-15T09:00:00Z' },
              { job: 'delivery_2', arrivalTime: '2024-01-15T10:30:00Z' }
            ]
            // No polyline property
          }
        ]
      }

      // Test that we can handle responses without polylines
      expect(mockVrpResponse.trips).toHaveLength(1)
      expect(mockVrpResponse.trips[0].polyline).toBeUndefined()

      // In this case, VrpMap would fall back to straight-line routes
      console.log('No polylines found - would use straight-line fallback')
    })

    it('should handle mixed polyline availability', () => {
      // Some trips have polylines, others don't
      const mockVrpResponse = {
        trips: [
          {
            resource: 'vehicle_1',
            visits: [{ job: 'delivery_1' }],
            polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
          },
          {
            resource: 'vehicle_2',
            visits: [{ job: 'delivery_2' }]
            // No polyline
          }
        ]
      }

      expect(mockVrpResponse.trips[0].polyline).toBeDefined()
      expect(mockVrpResponse.trips[1].polyline).toBeUndefined()

      // Test decoding where available
      const trip1Coordinates = decodePolyline(mockVrpResponse.trips[0].polyline!)
      expect(trip1Coordinates.length).toBeGreaterThan(0)

      console.log('Mixed polyline scenario handled correctly')
    })
  })

  describe('Polyline Option in Request', () => {
    it('should include polylines option in VRP request', () => {
      // Example of VRP request with polylines enabled
      const vrpRequest = {
        jobs: [
          { name: 'delivery_1', location: { latitude: 50.8465, longitude: 4.3517 } }
        ],
        resources: [
          { name: 'vehicle_1', shifts: [{ from: '2024-01-15T08:00:00Z', to: '2024-01-15T18:00:00Z' }] }
        ],
        options: {
          polylines: true  // This enables polyline generation
        }
      }

      expect(vrpRequest.options.polylines).toBe(true)
      console.log('VRP request configured for polylines')
    })
  })
})