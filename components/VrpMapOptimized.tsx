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
    console.log('🗺️ VrpMapOptimized: renderMapData called', {
      hasMap: !!map.current,
      isStyleLoaded: map.current?.isStyleLoaded(),
      hasResponseData: !!responseData
    })

    if (!map.current || !map.current.isStyleLoaded()) {
      console.log('⚠️ VrpMapOptimized: Skipping render - map not ready')
      return
    }

    routeRenderer.current?.clear()

    // Remove existing layers and sources
    const layersToRemove = ['jobs-circles', 'clusters', 'cluster-count', 'resources-circles']
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

    console.log('🗺️ VrpMapOptimized: Building job features', {
      hasResponseData: !!responseData,
      tripsCount: responseData.trips?.length,
      jobsCount: jobs?.length
    })

    responseData.trips?.forEach((trip, tripIdx) => {
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

    console.log(`🗺️ VrpMapOptimized: Built ${jobFeatures.length} job features`)

    // Render routes FIRST (so they appear under markers)
    if (responseData) {
      routeRenderer.current?.renderRoutes(responseData.trips, requestData, resourceColors, {
        simplified: true
      })
    }

    // Add jobs source with clustering enabled
    if (jobFeatures.length > 0 && map.current) {
      console.log(`🗺️ VrpMapOptimized: Adding ${jobFeatures.length} job features`)

      map.current.addSource('jobs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: jobFeatures },
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50 // Radius of each cluster when clustering points
      })

      // Cluster circles layer
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'jobs',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#51bbd6',
            100,
            '#f1f075',
            750,
            '#f28cb1'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            100,
            30,
            750,
            40
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Cluster count labels
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'jobs',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      })

      // Individual unclustered job circles (no sequence numbers - too expensive)
      map.current.addLayer({
        id: 'jobs-circles',
        type: 'circle',
        source: 'jobs',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Click handler for individual jobs - show popup
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

      // Click handler for clusters - zoom in
      map.current.on('click', 'clusters', (e) => {
        if (!e.features?.[0] || !map.current) return
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        })
        const clusterId = features[0]?.properties?.cluster_id
        const source = map.current.getSource('jobs') as maplibregl.GeoJSONSource

        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return
          map.current.easeTo({
            center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoom
          })
        })
      })

      // Cursor pointer on hover - jobs
      map.current.on('mouseenter', 'jobs-circles', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'jobs-circles', () => {
        if (map.current) map.current.getCanvas().style.cursor = ''
      })

      // Cursor pointer on hover - clusters
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = ''
      })

      // Fit bounds
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 })
      }
    }
  }, [requestData, responseData])

  useEffect(() => {
    console.log('🗺️ VrpMapOptimized: useEffect triggered', {
      hasMap: !!map.current,
      isStyleLoaded: map.current?.isStyleLoaded(),
      hasRequestData: !!requestData,
      hasResponseData: !!responseData
    })

    if (!map.current) {
      console.log('⚠️ VrpMapOptimized: No map yet')
      return
    }

    if (!map.current.isStyleLoaded()) {
      console.log('⏳ VrpMapOptimized: Waiting for style to load')
      map.current.once('styledata', renderMapData)
      return
    }

    console.log('✅ VrpMapOptimized: Calling renderMapData directly')
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
