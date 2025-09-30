import { useState, useEffect, useCallback } from 'react'
import maplibregl from 'maplibre-gl'

// Map style configurations
export const MAP_STYLES = [
  { id: 'white', name: 'White', url: 'https://cdn.solvice.io/styles/white.json', preview: '#ffffff' },
  { id: 'light', name: 'Light', url: 'https://cdn.solvice.io/styles/light.json', preview: '#f8fafc' },
  { id: 'gray', name: 'Gray', url: 'https://cdn.solvice.io/styles/grayscale.json', preview: '#9ca3af' },
  { id: 'dark', name: 'Dark', url: 'https://cdn.solvice.io/styles/dark.json', preview: '#374151' },
  { id: 'black', name: 'Black', url: 'https://cdn.solvice.io/styles/black.json', preview: '#111827' }
] as const

export type MapStyleId = typeof MAP_STYLES[number]['id']

// Retrieve saved style from localStorage or default to white
const getSavedMapStyle = (): MapStyleId => {
  if (typeof window === 'undefined') return 'white'
  try {
    const saved = localStorage.getItem('vrp-map-style') as MapStyleId
    return MAP_STYLES.find(s => s.id === saved) ? saved : 'white'
  } catch {
    return 'white'
  }
}

// Save map style to localStorage
const saveMapStyle = (styleId: MapStyleId) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('vrp-map-style', styleId)
  } catch {
    // Ignore localStorage errors
  }
}

interface UseMapStyleOptions {
  map: maplibregl.Map | null
  onStyleChange?: () => void
}

/**
 * Hook to manage map style switching with persistence
 */
export function useMapStyle({ map, onStyleChange }: UseMapStyleOptions) {
  const [currentStyle, setCurrentStyle] = useState<MapStyleId>(getSavedMapStyle)
  const [isStyleChanging, setIsStyleChanging] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  /**
   * Switch to a different map style
   */
  const switchMapStyle = useCallback((styleId: MapStyleId) => {
    if (!map || isStyleChanging || styleId === currentStyle) return

    const newStyle = MAP_STYLES.find(s => s.id === styleId)
    if (!newStyle) return

    setIsStyleChanging(true)
    setCurrentStyle(styleId)
    saveMapStyle(styleId)

    // Store current map state
    const currentCenter = map.getCenter()
    const currentZoom = map.getZoom()
    const currentBearing = map.getBearing()
    const currentPitch = map.getPitch()

    // Set new style
    map.setStyle(newStyle.url)

    // Handle style load completion
    const handleStyleLoad = () => {
      if (!map) return

      // Restore map state
      map.jumpTo({
        center: currentCenter,
        zoom: currentZoom,
        bearing: currentBearing,
        pitch: currentPitch
      })

      setIsStyleChanging(false)

      // Re-apply data after style loads
      setTimeout(() => {
        if (onStyleChange) {
          onStyleChange()
        }
      }, 100)

      // Remove event listener
      map.off('styledata', handleStyleLoad)
    }

    map.on('styledata', handleStyleLoad)
  }, [map, isStyleChanging, currentStyle, onStyleChange])

  return {
    currentStyle,
    isStyleChanging,
    mounted,
    switchMapStyle,
    MAP_STYLES
  }
}