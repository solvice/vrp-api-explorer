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
  highlightedJob?: { resource: string; job: string } | null
  onJobHover?: (job: { resource: string; job: string } | null) => void
}

/**
 * Optimized map using symbol layers instead of DOM markers
 * Use this for 1000+ jobs
 */
export function VrpMapOptimized({
  requestData,
  responseData,
  className,
  highlightedJob,
  onJobHover
}: VrpMapOptimizedProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const routeRenderer = useRef<MapRouteRenderer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const jobFeatures = useRef<any[]>([])

  const { currentStyle, mounted, MAP_STYLES } = useMapStyle({ map: map.current })

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const style = MAP_STYLES.find(s => s.id === currentStyle) || MAP_STYLES[0]

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: style.url,
      center: [3.7250, 51.0538],
      zoom: 11
    })

    routeRenderer.current = new MapRouteRenderer(map.current)
    map.current.addControl(new maplibregl.NavigationControl({ showZoom: false, showCompass: false }), 'top-right')

    map.current.on('load', () => setIsLoading(false))

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [currentStyle, MAP_STYLES])

  // Render with symbol layers
  const renderMapData = useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) return

    routeRenderer.current?.clear()

    // Clear existing layers
    if (map.current.getLayer('jobs-layer')) map.current.removeLayer('jobs-layer')
    if (map.current.getLayer('jobs-labels')) map.current.removeLayer('jobs-labels')
    if (map.current.getSource('jobs')) map.current.removeSource('jobs')

    if (!responseData) return

    const resourceColors = createResourceColorMap(responseData.trips)
    const bounds = new maplibregl.LngLatBounds()

    // Build GeoJSON features
    jobFeatures.current = []
    const jobs = requestData.jobs as Array<Record<string, unknown>> | undefined

    responseData.trips?.forEach((trip) => {
      const color = resourceColors.get(trip.resource || '') || '#3B82F6'

      trip.visits?.forEach((visit, idx) => {
        const job = jobs?.find((j) => j.name === visit.job)
        if (job?.location && typeof job.location === 'object') {
          const loc = job.location as { longitude: number; latitude: number }

          jobFeatures.current.push({
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

    // Add GeoJSON source
    map.current.addSource('jobs', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: jobFeatures.current },
      cluster: true,
      clusterRadius: 50,
      clusterMaxZoom: 14
    })

    // Cluster circles
    map.current.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'jobs',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['step', ['get', 'point_count'], '#51bbd6', 10, '#f1f075', 50, '#f28cb1'],
        'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 25]
      }
    })

    // Cluster count
    map.current.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'jobs',
      filter: ['has', 'point_count'],
      layout: { 'text-field': '{point_count_abbreviated}', 'text-size': 12 },
      paint: { 'text-color': '#ffffff' }
    })

    // Individual points
    map.current.addLayer({
      id: 'jobs-layer',
      type: 'circle',
      source: 'jobs',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': 8,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff'
      }
    })

    // Sequence numbers
    map.current.addLayer({
      id: 'jobs-labels',
      type: 'symbol',
      source: 'jobs',
      filter: ['!', ['has', 'point_count']],
      layout: { 'text-field': ['get', 'sequence'], 'text-size': 10 },
      paint: { 'text-color': '#fff' }
    })

    if (!bounds.isEmpty()) {
      map.current.fitBounds(bounds, { padding: 50 })
    }

    routeRenderer.current?.renderRoutes(responseData.trips, requestData, resourceColors)

    // Click handler
    map.current.on('click', 'jobs-layer', (e) => {
      if (!e.features?.[0]) return
      const props = e.features[0].properties
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<div class="p-2"><strong>${props?.name}</strong><br/>Visit #${props?.sequence}</div>`)
        .addTo(map.current!)
    })

    map.current.on('click', 'clusters', (e) => {
      const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] })
      const clusterId = features[0]?.properties?.cluster_id
      const source = map.current!.getSource('jobs') as maplibregl.GeoJSONSource

      source.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return
        map.current!.easeTo({
          center: (features[0].geometry as any).coordinates,
          zoom: zoom || map.current!.getZoom() + 2
        })
      })
    })

    map.current.on('mouseenter', 'jobs-layer', () => {
      map.current!.getCanvas().style.cursor = 'pointer'
    })
    map.current.on('mouseleave', 'jobs-layer', () => {
      map.current!.getCanvas().style.cursor = ''
    })

  }, [requestData, responseData, onJobHover])

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
    </div>
  )
}
