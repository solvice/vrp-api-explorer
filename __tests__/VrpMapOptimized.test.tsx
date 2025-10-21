/**
 * Basic smoke test for VrpMapOptimized
 * Just verifies the component can be imported and doesn't have syntax errors
 */

import { VrpMapOptimized } from '@/components/VrpMapOptimized'

// Mock MapLibre GL
jest.mock('maplibre-gl', () => ({
  Map: jest.fn(() => ({
    on: jest.fn(),
    addControl: jest.fn(),
    remove: jest.fn(),
    getSource: jest.fn(),
    getLayer: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    removeSource: jest.fn(),
    fitBounds: jest.fn(),
    isStyleLoaded: jest.fn(() => true),
    getCanvas: jest.fn(() => ({ style: {} })),
    once: jest.fn()
  })),
  NavigationControl: jest.fn(),
  LngLatBounds: jest.fn(() => ({
    extend: jest.fn(),
    isEmpty: jest.fn(() => false)
  })),
  Popup: jest.fn(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    setHTML: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis()
  }))
}))

describe('VrpMapOptimized', () => {
  it('should import without errors', () => {
    expect(VrpMapOptimized).toBeDefined()
    expect(typeof VrpMapOptimized).toBe('function')
  })

  it('should be a React component', () => {
    expect(VrpMapOptimized.name).toBe('VrpMapOptimized')
  })
})
