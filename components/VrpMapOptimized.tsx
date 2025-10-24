'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MapRouteRenderer } from '@/lib/map-route-renderer'
import { createResourceColorMap } from '@/lib/color-utils'
import { useMapStyle } from '@/lib/hooks/useMapStyle'
import 'maplibre-gl/dist/maplibre-gl.css'

interface VrpMapOptimizedProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
}

/**
 * Optimized map for large datasets (1000+ jobs).
 * Uses GPU-rendered circle layers instead of DOM markers.
 */
export function VrpMapOptimized({ requestData, responseData, className }: VrpMapOptimizedProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const routeRenderer = useRef<MapRouteRenderer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { currentStyle, MAP_STYLES } = useMapStyle({ map: map.current })

  const highlightRoute = useCallback((resourceName: string | null) => {
    if (!map.current || !responseData?.trips) return

    responseData.trips.forEach((trip, idx) => {
      const lineId = `line-${idx}`
      if (!map.current?.getLayer(lineId)) return

      if (resourceName === null) {
        map.current.setPaintProperty(lineId, 'line-opacity', 0.4)
        map.current.setPaintProperty(lineId, 'line-width', 1.5)
      } else if (trip.resource === resourceName) {
        map.current.setPaintProperty(lineId, 'line-opacity', 0.9)
        map.current.setPaintProperty(lineId, 'line-width', 2.5)
      } else {
        map.current.setPaintProperty(lineId, 'line-opacity', 0.1)
        map.current.setPaintProperty(lineId, 'line-width', 1.5)
      }
    })
  }, [responseData])

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const selectedStyle = MAP_STYLES.find(s => s.id === currentStyle) || MAP_STYLES[0]

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: selectedStyle.url,
      center: [3.7250, 51.0538],
      zoom: 11
    })

    routeRenderer.current = new MapRouteRenderer(map.current)
    map.current.addControl(new maplibregl.NavigationControl({ showZoom: false, showCompass: false }), 'top-right')

    map.current.on('load', () => setIsLoading(false))
    map.current.on('styledata', () => setIsLoading(false))

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [currentStyle, MAP_STYLES])

  const renderMapData = useCallback(() => {
    if (!map.current || !responseData) return

    routeRenderer.current?.clear()

    // Remove existing layers and sources
    if (map.current.getLayer('jobs-circles')) {
      map.current.removeLayer('jobs-circles')
    }
    if (map.current.getSource('jobs')) {
      map.current.removeSource('jobs')
    }

    const resourceColors = createResourceColorMap(responseData.trips)
    const bounds = new maplibregl.LngLatBounds()
    const jobFeatures: GeoJSON.Feature[] = []
    const jobs = requestData.jobs as Array<Record<string, unknown>> | undefined

    responseData.trips?.forEach((trip) => {
      const color = resourceColors.get(trip.resource || '') || '#3B82F6'

      trip.visits?.forEach((visit, idx) => {
        const job = jobs?.find((j) => j.name === visit.job)
        if (job?.location && typeof job.location === 'object') {
          const loc = job.location as { longitude: number; latitude: number }

          jobFeatures.push({
            type: 'Feature',
            properties: {
              name: job.name,
              sequence: idx + 1,
              resource: trip.resource,
              color
            },
            geometry: { type: 'Point', coordinates: [loc.longitude, loc.latitude] }
          })

          bounds.extend([loc.longitude, loc.latitude])
        }
      })
    })

    if (jobFeatures.length === 0) return

    // Render routes under markers
    routeRenderer.current?.renderRoutes(responseData.trips, requestData, resourceColors, {
      simplified: true
    })

    // Add job markers
    map.current.addSource('jobs', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: jobFeatures }
    })

    map.current.addLayer({
      id: 'jobs-circles',
      type: 'circle',
      source: 'jobs',
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 4,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.8
      }
    })

    // Click to show job details
    map.current.on('click', 'jobs-circles', (e) => {
      if (!e.features?.[0] || !map.current) return
      const props = e.features[0].properties
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="p-2">
            <strong>${props?.name || 'Job'}</strong><br/>
            Visit #${props?.sequence || '?'}<br/>
            Vehicle: ${props?.resource || 'Unknown'}
          </div>
        `)
        .addTo(map.current)
    })

    // Hover to highlight route
    map.current.on('mouseenter', 'jobs-circles', (e) => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer'
      const resourceName = e.features?.[0]?.properties?.resource
      if (resourceName) highlightRoute(resourceName)
    })

    map.current.on('mouseleave', 'jobs-circles', () => {
      if (map.current) map.current.getCanvas().style.cursor = ''
      highlightRoute(null)
    })

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50 })
    }
  }, [requestData, responseData, highlightRoute])

  useEffect(() => {
    if (!map.current) return

    if (!map.current.isStyleLoaded()) {
      map.current.once('styledata', renderMapData)
      return
    }

    renderMapData()
  }, [requestData, responseData, renderMapData])

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div ref={mapContainer} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      <div className="absolute bottom-4 right-4 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow">
        Optimized (GPU-rendered)
      </div>
    </div>
  )
}
