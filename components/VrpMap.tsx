'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { Loader2, Layers3, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MapMarkerManager } from '@/lib/map-marker-manager'
import { MapRouteRenderer } from '@/lib/map-route-renderer'
import { createResourceColorMap } from '@/lib/color-utils'
import { useMapStyle } from '@/lib/hooks/useMapStyle'
import 'maplibre-gl/dist/maplibre-gl.css'

interface VrpMapProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  className?: string
  highlightedJob?: { resource: string; job: string } | null
  onJobHover?: (job: { resource: string; job: string } | null) => void
}

export function VrpMap({ requestData, responseData, className, highlightedJob, onJobHover }: VrpMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markerManager = useRef<MapMarkerManager>(new MapMarkerManager())
  const routeRenderer = useRef<MapRouteRenderer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStyleSwitcherOpen, setIsStyleSwitcherOpen] = useState(false)

  // Use map style hook
  const { currentStyle, isStyleChanging, mounted, switchMapStyle, MAP_STYLES } = useMapStyle({
    map: map.current,
    onStyleChange: () => {
      // Re-render data after style change
      renderMapData()
    }
  })

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    const selectedStyle = MAP_STYLES.find(s => s.id === currentStyle) || MAP_STYLES[0]

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: selectedStyle.url,
      center: [3.7250, 51.0538], // Ghent center
      zoom: 11
    })

    // Initialize route renderer
    routeRenderer.current = new MapRouteRenderer(map.current)

    // Add navigation controls with both zoom and compass disabled
    map.current.addControl(new maplibregl.NavigationControl({ showZoom: false, showCompass: false }), 'top-right')

    // Handle loading state
    map.current.on('load', () => {
      setIsLoading(false)
    })

    // Handle style changes
    map.current.on('styledata', () => {
      setIsLoading(false)
    })

    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [currentStyle, MAP_STYLES])

  // Render map data (markers and routes)
  const renderMapData = useCallback(() => {
    if (!map.current || !map.current.isStyleLoaded()) {
      console.log('⏳ VrpMap: Style not loaded yet, waiting...')
      return
    }

    console.log('🗺️ VrpMap: Rendering data', {
      hasRequestData: !!requestData,
      hasResponseData: !!responseData
    })

    // Clear existing visualizations
    markerManager.current.clear()
    routeRenderer.current?.clear()

    if (responseData) {
      // Render solution data (routes + numbered markers)
      console.log('🗺️ VrpMap: Rendering solution data')

      const resourceColors = createResourceColorMap(responseData.trips)
      const bounds = new maplibregl.LngLatBounds()

      // Add resource markers
      const resources = requestData.resources as Array<{
        name?: string
        shifts?: Array<{ start?: { longitude: number; latitude: number } }>
      }> | undefined

      markerManager.current.addResourceMarkers(resources, map.current, bounds, onJobHover)

      // Add job markers with sequence numbers
      const jobs = requestData.jobs as Array<Record<string, unknown>> | undefined
      markerManager.current.addJobMarkers(
        responseData.trips,
        jobs,
        resourceColors,
        map.current,
        bounds,
        onJobHover
      )

      // Fit map to bounds
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 })
      }

      // Render routes
      routeRenderer.current?.renderRoutes(responseData.trips, requestData, resourceColors)

    } else {
      // Render request data only (markers without routes)
      console.log('🗺️ VrpMap: Rendering request data only')

      const bounds = new maplibregl.LngLatBounds()

      // Add resource markers
      const resources = requestData.resources as Array<Record<string, unknown>> | undefined
      const resourcesTyped = resources as Array<{
        name?: string
        shifts?: Array<{ start?: { longitude: number; latitude: number } }>
      }> | undefined

      markerManager.current.addResourceMarkers(resourcesTyped, map.current, bounds, onJobHover)

      // Add simple job markers
      const jobs = requestData.jobs as Array<Record<string, unknown>> | undefined
      markerManager.current.addSimpleJobMarkers(jobs, map.current, bounds, onJobHover)

      // Fit map to bounds
      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 50 })
      }
    }
  }, [requestData, responseData, onJobHover])

  // Update map when data changes
  useEffect(() => {
    if (!map.current) return

    console.log('🗺️ VrpMap: Data changed, updating...')

    // Check if style is loaded
    if (!map.current.isStyleLoaded()) {
      console.log('⏳ VrpMap: Waiting for style to load')
      const handleStyleLoad = () => {
        console.log('✅ VrpMap: Style loaded, rendering data')
        renderMapData()
      }
      map.current.once('styledata', handleStyleLoad)
      return
    }

    renderMapData()
  }, [requestData, responseData, renderMapData])

  // Handle highlighting when highlightedJob changes
  useEffect(() => {
    markerManager.current.updateHighlighting(highlightedJob ?? null)
  }, [highlightedJob])

  // Style switcher component
  const StyleSwitcher = () => {
    const currentStyleObj = MAP_STYLES.find(s => s.id === currentStyle) || MAP_STYLES[0]

    return (
      <div className="absolute top-4 right-4 z-10">
        <Popover open={isStyleSwitcherOpen} onOpenChange={setIsStyleSwitcherOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 bg-white border shadow-lg hover:bg-gray-50"
                  disabled={isStyleChanging}
                >
                  <div className="flex items-center space-x-2">
                    <Layers3 className="h-3 w-3" />
                    <div
                      className="w-4 h-4 rounded border border-gray-300"
                      style={mounted ? { backgroundColor: currentStyleObj.preview } : {}}
                    />
                    {isStyleChanging ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Map Style</p>
            </TooltipContent>
          </Tooltip>

          <PopoverContent className="w-56 p-2" align="end">
            <div className="space-y-1">
              <div className="px-2 py-1 text-xs font-medium text-gray-600">Map Styles</div>
              {MAP_STYLES.map((style) => (
                <Button
                  key={style.id}
                  variant={currentStyle === style.id ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start h-8 px-2"
                  onClick={() => {
                    switchMapStyle(style.id)
                    setIsStyleSwitcherOpen(false)
                  }}
                  disabled={isStyleChanging}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded border border-gray-300 flex-shrink-0"
                      style={mounted ? { backgroundColor: style.preview } : {}}
                    />
                    <span className="text-xs">{style.name}</span>
                    {currentStyle === style.id && (
                      <div className="ml-auto w-1.5 h-1.5 bg-blue-600 rounded-full" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      <div
        ref={mapContainer}
        data-testid="vrp-map"
        className="w-full h-full"
      />

      {/* Style Switcher */}
      <StyleSwitcher />

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