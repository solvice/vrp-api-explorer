'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { Loader2, Truck } from 'lucide-react'
import { cn } from '@/lib/utils'
import 'maplibre-gl/dist/maplibre-gl.css'

interface VrpMapProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
}

// Route colors for different vehicles
const ROUTE_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red  
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16'  // lime
]

export function VrpMap({ requestData, responseData, className }: VrpMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://cdn.solvice.io/styles/white.json',
      center: [3.7250, 51.0538], // Ghent center
      zoom: 11
    })

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    // Handle loading state
    map.current.on('load', () => {
      setIsLoading(false)
    })

    // Handle style changes (important for external styles like Solvice)
    map.current.on('styledata', () => {
      // Trigger a re-render of data when style loads
      setIsLoading(false)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Clear existing markers
  const clearMarkers = () => {
    markers.current.forEach(marker => marker.remove())
    markers.current = []
  }

  // Create marker element with custom styling and hover interactions
  const createMarkerElement = (
    type: 'job' | 'resource', 
    name: string, 
    sequence?: number, 
    visit?: Record<string, unknown>,
    vehicleColor?: string
  ) => {
    const el = document.createElement('div')
    el.className = `${type}-marker cursor-pointer relative`
    
    if (type === 'job') {
      const markerColor = vehicleColor || '#3B82F6'
      el.innerHTML = `
        <div class="marker-icon flex items-center justify-center w-8 h-8 text-white rounded-full border-2 border-white shadow-lg text-xs font-bold transition-transform hover:scale-110" style="background-color: ${markerColor}">
          ${sequence || '•'}
        </div>
        <div class="marker-tooltip absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-3 py-2 bg-white rounded-lg shadow-lg border text-xs whitespace-nowrap opacity-0 invisible transition-all duration-200 z-10 pointer-events-none">
          <div class="font-semibold text-gray-900">${name}</div>
          ${sequence ? `<div class="text-gray-600">Visit #${sequence}</div>` : ''}
          ${visit?.arrival && typeof visit.arrival === 'string' ? `<div class="text-gray-600">Arrival: ${new Date(visit.arrival).toLocaleTimeString()}</div>` : ''}
          ${visit?.arrival && typeof visit.arrival === 'string' && visit?.serviceTime && typeof visit.serviceTime === 'number' ? `<div class="text-gray-600">Departure: ${new Date(new Date(visit.arrival).getTime() + visit.serviceTime * 1000).toLocaleTimeString()}</div>` : ''}
          <div class="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t rotate-45"></div>
        </div>
      `
    } else {
      el.innerHTML = `
        <div class="marker-icon flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z"/>
          </svg>
        </div>
        <div class="marker-tooltip absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-3 py-2 bg-white rounded-lg shadow-lg border text-xs whitespace-nowrap opacity-0 invisible transition-all duration-200 z-10 pointer-events-none">
          <div class="font-semibold text-gray-900">${name}</div>
          <div class="text-gray-600">Vehicle Depot</div>
          <div class="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t rotate-45"></div>
        </div>
      `
    }
    
    // Add hover interactions
    el.addEventListener('mouseenter', () => {
      const tooltip = el.querySelector('.marker-tooltip')
      if (tooltip) {
        tooltip.classList.remove('opacity-0', 'invisible')
        tooltip.classList.add('opacity-100', 'visible')
      }
    })

    el.addEventListener('mouseleave', () => {
      const tooltip = el.querySelector('.marker-tooltip')
      if (tooltip) {
        tooltip.classList.remove('opacity-100', 'visible')
        tooltip.classList.add('opacity-0', 'invisible')
      }
    })
    
    return el
  }

  // Add markers for request data
  const addRequestMarkers = useCallback(() => {
    if (!map.current || !requestData) return

    const bounds = new maplibregl.LngLatBounds()

    // Add resource markers (from shift start locations in SDK 0.6.0)
    const resources = requestData.resources as Array<Record<string, unknown>> | undefined
    resources?.forEach((resource) => {
      const shifts = resource.shifts as Array<Record<string, unknown>> | undefined
      shifts?.forEach((shift) => {
        if (shift.start && typeof shift.start === 'object' && shift.start !== null) {
          const location = shift.start as { longitude?: number; latitude?: number }
          if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
            const el = createMarkerElement('resource', typeof resource.name === 'string' ? resource.name : 'Resource')
            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([location.longitude, location.latitude])
              .addTo(map.current!)
          
            markers.current.push(marker)
            bounds.extend([location.longitude, location.latitude])
          }
        }
      })
    })

    // Add job markers
    const jobs = requestData.jobs as Array<Record<string, unknown>> | undefined
    jobs?.forEach((job) => {
      if (job.location && typeof job.location === 'object' && job.location !== null) {
        const location = job.location as { longitude?: number; latitude?: number }
        if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
          const el = createMarkerElement('job', typeof job.name === 'string' ? job.name : 'Job')
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([location.longitude, location.latitude])
            .addTo(map.current!)
          
          markers.current.push(marker)
          bounds.extend([location.longitude, location.latitude])
        }
      }
    })

    // Fit map to bounds
    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50 })
    }
  }, [requestData])

  // Add route visualization with enhanced styling
  const addRouteVisualization = useCallback(() => {
    if (!map.current || !responseData) return

    // Ensure map is loaded before adding layers
    if (!map.current.isStyleLoaded()) {
      map.current.once('styledata', () => {
        addRouteVisualization()
      })
      return
    }

    // Capture trips early to avoid race conditions
    const trips = responseData.trips

    if (!trips || !Array.isArray(trips)) {
      console.warn('No valid trips data found in response')
      return
    }

    trips.forEach((trip, tripIndex) => {
      const color = ROUTE_COLORS[tripIndex % ROUTE_COLORS.length]
      const routeId = `route-${tripIndex}`
      const lineId = `line-${tripIndex}`
      const shadowId = `shadow-${tripIndex}`

      // Use actual route geometry if available (from polyline option), otherwise fallback to straight lines
      let routeGeometry: GeoJSON.LineString | null = null
      
      if (trip.polyline) {
        // TODO: Decode polyline string to coordinates if needed
        // For now, fall back to manual coordinate generation
        routeGeometry = null
      }
      
      if (!routeGeometry) {
        // Fallback: create route coordinates from visits, including depot start/end
        const coordinates: [number, number][] = []
        
        // Find the vehicle/resource for this trip
        const resources = requestData.resources as Array<Record<string, unknown>> | undefined
        const resource = resources?.find((r) => r.name === trip.resource)
        
        // Start from depot if available (from shift start in SDK 0.6.0)
        const shifts = resource?.shifts as Array<Record<string, unknown>> | undefined
        const startLocation = shifts?.[0]?.start
        if (startLocation && typeof startLocation === 'object' && startLocation !== null) {
          const location = startLocation as { longitude?: number; latitude?: number }
          if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
            coordinates.push([location.longitude, location.latitude])
          }
        }
        
        // Add visit locations (they're already in sequence order from API)
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

        // Return to depot if available and we have visits (use end location if available, fallback to start)
        const endLocation = shifts?.[0]?.end || startLocation
        if (endLocation && typeof endLocation === 'object' && endLocation !== null && coordinates.length > 1) {
          const location = endLocation as { longitude?: number; latitude?: number }
          if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
            coordinates.push([location.longitude, location.latitude])
          }
        }
        
        if (coordinates.length > 1) {
          routeGeometry = {
            type: 'LineString',
            coordinates
          }
        }
      }

      if (routeGeometry) {
        // Remove existing source if it exists
        if (map.current!.getSource(routeId)) {
          try {
            map.current!.removeSource(routeId)
          } catch {
            // Source might be in use by layers
          }
        }

        // Add route source with trip metadata
        map.current!.addSource(routeId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {
              resourceName: trip.resource,
              tripIndex,
              visitCount: trip.visits?.length || 0,
              hasGeometry: !!trip.polyline
            },
            geometry: routeGeometry
          }
        })

        // Remove existing layers if they exist
        const layersToRemove = [shadowId, lineId]
        
        for (const layerId of layersToRemove) {
          if (map.current!.getLayer(layerId)) {
            try {
              map.current!.removeLayer(layerId)
            } catch {
              // Layer might not exist
            }
          }
        }

        // Add route shadow for better visibility
        map.current!.addLayer({
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
        map.current!.addLayer({
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

        // Add route hover effects
        map.current!.on('mouseenter', lineId, () => {
          map.current!.setPaintProperty(lineId, 'line-width', 6)
          map.current!.setPaintProperty(lineId, 'line-opacity', 1)
          map.current!.getCanvas().style.cursor = 'pointer'
        })

        map.current!.on('mouseleave', lineId, () => {
          map.current!.setPaintProperty(lineId, 'line-width', 4)
          map.current!.setPaintProperty(lineId, 'line-opacity', 0.9)
          map.current!.getCanvas().style.cursor = ''
        })

        // Add click handler for route information
        map.current!.on('click', lineId, (e) => {
          const feature = e.features?.[0]
          if (feature) {
            const properties = feature.properties
            new maplibregl.Popup()
              .setLngLat(e.lngLat)
              .setHTML(`
                <div class="p-3">
                  <div class="font-semibold text-gray-900 mb-2">${properties?.resourceName}</div>
                  <div class="text-sm text-gray-600 mb-1">Route ${(properties?.tripIndex || 0) + 1}</div>
                  <div class="text-sm text-gray-600">${properties?.visitCount || 0} stops</div>
                </div>
              `)
              .addTo(map.current!)
          }
        })
      }
    })
  }, [requestData, responseData])

  // Update markers with sequence numbers from response
  const updateMarkersWithSequence = useCallback(() => {
    if (!responseData) return

    clearMarkers()

    // Create bounds for fitting map view
    const boundsCoords = [] as Array<[number, number]>

    // Add resource markers (from shift start locations in SDK 0.6.0)
    (requestData.resources as Array<{ name?: string; shifts?: Array<{ start?: { longitude: number; latitude: number } }> }> | undefined)?.forEach((resource) => {
      resource.shifts?.forEach((shift) => {
        if (shift.start) {
          const el = createMarkerElement('resource', resource.name || 'Resource')
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([shift.start.longitude, shift.start.latitude])
            .addTo(map.current!)
          
          markers.current.push(marker)
          boundsCoords.push([shift.start.longitude, shift.start.latitude])
        }
      })
    })

    // Add job markers with sequence numbers and vehicle colors
    responseData.trips?.forEach((trip, tripIndex) => {
      const vehicleColor = ROUTE_COLORS[tripIndex % ROUTE_COLORS.length]
      
      trip.visits?.forEach((visit, visitIndex) => {
        const jobs = requestData.jobs as Array<Record<string, unknown>> | undefined
        const job = jobs?.find((j) => j.name === visit.job)
        if (job?.location && typeof job.location === 'object' && job.location !== null) {
          const location = job.location as { longitude?: number; latitude?: number }
          if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
            const el = createMarkerElement('job', typeof job.name === 'string' ? job.name : 'Job', visitIndex + 1, visit as unknown as Record<string, unknown>, vehicleColor)
            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([location.longitude, location.latitude])
              .addTo(map.current!)
            
            markers.current.push(marker)
            boundsCoords.push([location.longitude, location.latitude])
          }
        }
      })
    })

    // Fit map to bounds if we have markers
    if (boundsCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      boundsCoords.forEach(coord => bounds.extend(coord))
      map.current!.fitBounds(bounds, { padding: 50 })
    }
  }, [requestData, responseData])

  // Clear route visualization
  const clearRoutes = () => {
    if (!map.current) return

    // Remove event listeners first
    const style = map.current.getStyle()
    style.layers?.forEach(layer => {
      if (layer.id.startsWith('line-')) {
        // Event listeners will be automatically cleaned when layers are removed
      }
    })

    // Remove existing route layers and sources
    style.layers?.forEach(layer => {
      if (layer.id.startsWith('line-') || layer.id.startsWith('shadow-')) {
        try {
          map.current!.removeLayer(layer.id)
        } catch {
          // Layer might already be removed
        }
      }
    })

    Object.keys(style.sources || {}).forEach(sourceId => {
      if (sourceId.startsWith('route-')) {
        try {
          map.current!.removeSource(sourceId)
        } catch {
          // Source might already be removed
        }
      }
    })
  }

  // Create route legend component
  const RouteLegend = () => {
    if (!responseData?.trips?.length) return null

    return (
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg border p-3 text-xs max-w-[200px]">
        <div className="font-semibold text-gray-900 mb-2 flex items-center">
          <Truck className="h-3 w-3 mr-1" />
          Routes
        </div>
        <div className="space-y-1">
          {responseData.trips.map((trip, index) => (
            <div key={`${trip.resource}-${index}`} className="flex items-center">
              <div 
                className="w-3 h-0.5 mr-2 rounded"
                style={{ backgroundColor: ROUTE_COLORS[index % ROUTE_COLORS.length] }}
              />
              <span className="text-gray-700 truncate">
                {trip.resource} ({trip.visits?.length || 0} stops)
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
          • Hover over routes for details
          • Click routes for information
          • Hover over markers for timing
          {responseData.trips?.some(trip => trip.polyline) && (
            <div className="mt-1 text-green-600">✓ Using actual route geometry</div>
          )}
        </div>
      </div>
    )
  }

  // Update map when data changes
  useEffect(() => {
    if (!map.current || isLoading) return

    console.log('🗺️ VrpMap: Map updating due to data change...', {
      hasRequestData: !!requestData,
      hasResponseData: !!responseData,
      jobCount: Array.isArray((requestData as any)?.jobs) ? (requestData as any).jobs.length : 0,
      resourceCount: Array.isArray((requestData as any)?.resources) ? (requestData as any).resources.length : 0,
      isLoading
    })

    clearRoutes()
    
    if (responseData) {
      console.log('🗺️ VrpMap: Rendering solution data (routes + markers)')
      updateMarkersWithSequence()
      addRouteVisualization()
    } else {
      console.log('🗺️ VrpMap: Rendering request data (markers only)')
      clearMarkers()
      addRequestMarkers()
    }
  }, [requestData, responseData, isLoading, updateMarkersWithSequence, addRouteVisualization, addRequestMarkers])

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div 
        ref={mapContainer} 
        data-testid="vrp-map"
        className="w-full h-full"
      />
      
      {/* Route Legend */}
      <RouteLegend />
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading map...</span>
          </div>
        </div>
      )}
    </div>
  )
}