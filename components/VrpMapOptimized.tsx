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
 * Optimized map using MapLibre circle layers instead of DOM markers.
 * Should perform better with many jobs (1000+) since circles are GPU-rendered.
 *
 * Note: This has NOT been tested with 20k jobs. Use at your own risk.
 */
export function VrpMapOptimized({ requestData, responseData, className }: VrpMapOptimizedProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const routeRenderer = useRef<MapRouteRenderer | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const { currentStyle, MAP_STYLES } = useMapStyle({ map: map.current })

  // Initialize map
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

  // Render map data using circle layers
  const renderMapData = useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) return

    routeRenderer.current?.clear()

    // Remove existing layers and sources
    const layersToRemove = ['jobs-circles', 'jobs-labels', 'resources-circles']
    layersToRemove.forEach(id => {
      if (map.current?.getLayer(id)) {
        map.current.removeLayer(id)
      }
    })

    const sourcesToRemove = ['jobs', 'resources']
    sourcesToRemove.forEach(id => {
      if (map.current?.getSource(id)) {
        map.current.removeSource(id)
      }
    })

    if (!responseData) return

    const resourceColors = createResourceColorMap(responseData.trips)
    const bounds = new maplibregl.LngLatBounds()

    // Build job features
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

    // Add jobs source and layers
    if (jobFeatures.length > 0 && map.current) {
      map.current.addSource('jobs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: jobFeatures }
      })

      // Circle layer for job markers
      map.current.addLayer({
        id: 'jobs-circles',
        type: 'circle',
        source: 'jobs',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 12,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Text layer for sequence numbers
      map.current.addLayer({
        id: 'jobs-labels',
        type: 'symbol',
        source: 'jobs',
        layout: {
          'text-field': ['get', 'sequence'],
          'text-size': 11,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold']
        },
        paint: {
          'text-color': '#ffffff'
        }
      })

      // Click handler for popups
      map.current.on('click', 'jobs-circles', (e) => {
        if (!e.features?.[0]) return
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
          .addTo(map.current!)
      })

      // Cursor pointer on hover
      map.current.on('mouseenter', 'jobs-circles', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'jobs-circles', () => {
        if (map.current) map.current.getCanvas().style.cursor = ''
      })

      // Fit bounds
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 })
      }

      // Render routes
      routeRenderer.current?.renderRoutes(responseData.trips, requestData, resourceColors)
    }
  }, [requestData, responseData])

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
        Optimized (circle layers)
      </div>
    </div>
  )
}
