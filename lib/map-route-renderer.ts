import maplibregl from 'maplibre-gl'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { decodePolyline, isEncodedPolyline } from './polyline-decoder'

interface LayerEventHandlers {
  mouseenter: (e: maplibregl.MapLayerMouseEvent) => void
  mouseleave: (e: maplibregl.MapLayerMouseEvent) => void
  click: (e: maplibregl.MapLayerMouseEvent) => void
}

/**
 * Manages MapLibre route visualization for VRP solutions
 */
export class MapRouteRenderer {
  private map: maplibregl.Map
  private routeSourceIds: string[] = []
  private eventHandlers = new Map<string, LayerEventHandlers>()

  constructor(map: maplibregl.Map) {
    this.map = map
  }

  /**
   * Clear all route visualizations
   */
  clear(): void {
    if (!this.map) return

    // Remove event listeners explicitly
    this.eventHandlers.forEach((handlers, layerId) => {
      try {
        this.map.off('mouseenter', layerId, handlers.mouseenter)
        this.map.off('mouseleave', layerId, handlers.mouseleave)
        this.map.off('click', layerId, handlers.click)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to remove event listeners for layer ${layerId}:`, error)
        }
      }
    })
    this.eventHandlers.clear()

    const style = this.map.getStyle()

    // Remove layers
    style.layers?.forEach(layer => {
      if (layer.id.startsWith('line-') || layer.id.startsWith('shadow-')) {
        try {
          this.map.removeLayer(layer.id)
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`Failed to remove layer ${layer.id}:`, error)
          }
        }
      }
    })

    // Remove sources
    this.routeSourceIds.forEach(sourceId => {
      try {
        if (this.map.getSource(sourceId)) {
          this.map.removeSource(sourceId)
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Failed to remove source ${sourceId}:`, error)
        }
      }
    })

    this.routeSourceIds = []
  }

  /**
   * Create route geometry from trip data
   */
  private createRouteGeometry(
    trip: Vrp.OnRouteResponse['trips'][0],
    requestData: Record<string, unknown>,
    tripIndex: number
  ): GeoJSON.LineString | null {
    // Try polyline first
    if (trip.polyline && typeof trip.polyline === 'string') {
      try {
        if (isEncodedPolyline(trip.polyline)) {
          console.log(`🗺️ Decoding polyline for trip ${tripIndex}`)
          const coordinates = decodePolyline(trip.polyline)
          if (coordinates.length > 0) {
            console.log(`✅ Successfully decoded ${coordinates.length} coordinates`)
            return {
              type: 'LineString',
              coordinates
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to decode polyline for trip ${tripIndex}:`, error)
      }
    }

    // Fallback: create route from visit locations
    const coordinates: [number, number][] = []

    // Find the vehicle/resource for this trip
    const resources = requestData.resources as Array<Record<string, unknown>> | undefined
    const resource = resources?.find((r) => r.name === trip.resource)

    // Start from depot if available
    const shifts = resource?.shifts as Array<Record<string, unknown>> | undefined
    const startLocation = shifts?.[0]?.start
    if (startLocation && typeof startLocation === 'object' && startLocation !== null) {
      const location = startLocation as { longitude?: number; latitude?: number }
      if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
        coordinates.push([location.longitude, location.latitude])
      }
    }

    // Add visit locations
    trip.visits?.forEach((visit) => {
      const jobs = requestData.jobs as Array<Record<string, unknown>> | undefined
      const job = jobs?.find((j) => j.name === visit.job)
      if (job?.location && typeof job.location === 'object' && job.location !== null) {
        const location = job.location as { longitude?: number; latitude?: number }
        if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
          coordinates.push([location.longitude, location.latitude])
        }
      }
    })

    // Return to depot if available
    const endLocation = shifts?.[0]?.end || startLocation
    if (endLocation && typeof endLocation === 'object' && endLocation !== null && coordinates.length > 1) {
      const location = endLocation as { longitude?: number; latitude?: number }
      if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
        coordinates.push([location.longitude, location.latitude])
      }
    }

    if (coordinates.length > 1) {
      return {
        type: 'LineString',
        coordinates
      }
    }

    return null
  }

  /**
   * Render routes for all trips
   */
  renderRoutes(
    trips: Vrp.OnRouteResponse['trips'],
    requestData: Record<string, unknown>,
    resourceColors: Map<string, string>
  ): void {
    if (!trips) return

    trips.forEach((trip, tripIndex) => {
      const resourceName = trip.resource || 'Unknown'
      const color = resourceColors.get(resourceName) || '#3B82F6'
      const routeId = `route-${tripIndex}`
      const lineId = `line-${tripIndex}`
      const shadowId = `shadow-${tripIndex}`

      // Create route geometry
      const routeGeometry = this.createRouteGeometry(trip, requestData, tripIndex)

      if (!routeGeometry) return

      // Remove existing layers first (before removing source)
      const layersToRemove = [shadowId, lineId]
      for (const layerId of layersToRemove) {
        if (this.map.getLayer(layerId)) {
          try {
            this.map.removeLayer(layerId)
          } catch {
            // Layer might not exist
          }
        }
      }

      // Remove existing source if it exists
      if (this.map.getSource(routeId)) {
        try {
          this.map.removeSource(routeId)
        } catch {
          // Source might still be in use
        }
      }

      // Add route source with trip metadata
      this.map.addSource(routeId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            resourceName: trip.resource,
            tripIndex,
            visitCount: trip.visits?.length || 0,
            hasPolyline: !!trip.polyline,
            isActualRoute: !!trip.polyline && routeGeometry.coordinates.length > 2,
            coordinateCount: routeGeometry.coordinates.length
          },
          geometry: routeGeometry
        }
      })

      this.routeSourceIds.push(routeId)

      // Add route shadow for better visibility
      this.map.addLayer({
        id: shadowId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#000000',
          'line-width': 6,
          'line-opacity': 0.2
        }
      })

      // Add main route layer
      this.map.addLayer({
        id: lineId,
        type: 'line',
        source: routeId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': color,
          'line-width': 4,
          'line-opacity': 0.9
        }
      })

      // Create and store event handlers
      const handlers: LayerEventHandlers = {
        mouseenter: () => {
          this.map.setPaintProperty(lineId, 'line-width', 6)
          this.map.setPaintProperty(lineId, 'line-opacity', 1)
          this.map.getCanvas().style.cursor = 'pointer'
        },
        mouseleave: () => {
          this.map.setPaintProperty(lineId, 'line-width', 4)
          this.map.setPaintProperty(lineId, 'line-opacity', 0.9)
          this.map.getCanvas().style.cursor = ''
        },
        click: (e) => {
          const feature = e.features?.[0]
          if (feature) {
            const properties = feature.properties
            const isActualRoute = properties?.isActualRoute
            const coordinateCount = properties?.coordinateCount || 0

            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-3">
                  <div class="font-semibold text-gray-900 mb-2">${properties?.resourceName}</div>
                  <div class="text-sm text-gray-600 mb-1">Route ${(properties?.tripIndex || 0) + 1}</div>
                  <div class="text-sm text-gray-600 mb-1">${properties?.visitCount || 0} stops</div>
                  ${isActualRoute ?
                    `<div class="text-sm text-green-600">✓ Actual route geometry (${coordinateCount} points)</div>` :
                    `<div class="text-sm text-blue-600">⭢ Straight-line approximation</div>`
                  }
                </div>
              `)
              .addTo(this.map)
          }
        }
      }

      // Store handlers for cleanup
      this.eventHandlers.set(lineId, handlers)

      // Add route hover effects
      this.map.on('mouseenter', lineId, handlers.mouseenter)
      this.map.on('mouseleave', lineId, handlers.mouseleave)
      this.map.on('click', lineId, handlers.click)
    })
  }
}