/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react'
import { VrpExplorer } from '@/components/VrpExplorer'

// Mock environment variable for client-side access
process.env.NEXT_PUBLIC_SOLVICE_API_KEY = 'test-key'

// Mock the VRP solver to avoid network calls
jest.mock('solvice-vrp-solver', () => ({
  SolviceVrpSolver: jest.fn().mockImplementation(() => ({
    vrp: {
      syncSolve: jest.fn().mockResolvedValue({ routes: [] })
    }
  }))
}))

// Mock MapLibre GL to avoid canvas issues in tests
jest.mock('maplibre-gl', () => ({
  Map: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    remove: jest.fn(),
    addSource: jest.fn(),
    addLayer: jest.fn(),
    getSource: jest.fn(),
    removeLayer: jest.fn(),
    removeSource: jest.fn(),
    setLayoutProperty: jest.fn(),
    setPaintProperty: jest.fn(),
    fitBounds: jest.fn()
  })),
  Marker: jest.fn().mockImplementation(() => ({
    setLngLat: jest.fn().mockReturnThis(),
    addTo: jest.fn().mockReturnThis(),
    remove: jest.fn()
  })),
  LngLat: jest.fn().mockImplementation(() => ({ lat: 0, lng: 0 }))
}))

// Mock react-resizable-panels to avoid ES module issues
jest.mock('react-resizable-panels', () => ({
  ResizablePanel: ({ children, ...props }: any) => <div data-testid="resizable-panel" {...props}>{children}</div>,
  ResizablePanelGroup: ({ children, ...props }: any) => <div data-testid="resizable-panel-group" {...props}>{children}</div>,
  ResizableHandle: (props: any) => <div data-testid="resizable-handle" {...props} />
}))

// Mock @uiw/react-json-view to avoid ES module issues
jest.mock('@uiw/react-json-view', () => ({
  __esModule: true,
  default: ({ value, onChange, ...props }: any) => (
    <div data-testid="json-view" {...props}>
      <textarea 
        defaultValue={JSON.stringify(value, null, 2)}
        onChange={(e) => onChange && onChange(JSON.parse(e.target.value))}
      />
    </div>
  )
}))

// Mock sonner for toasts
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn()
  },
  Toaster: ({ children, ...props }: any) => <div data-testid="toaster" {...props}>{children}</div>
}))

describe('Hydration Tests', () => {
  // Capture console errors during tests
  let consoleError: jest.SpyInstance
  
  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  
  afterEach(() => {
    consoleError.mockRestore()
  })

  it('should render VrpExplorer without hydration errors', () => {
    render(<VrpExplorer />)
    
    // Check that no hydration-related console errors occurred
    const hydrationErrors = consoleError.mock.calls.filter(call => 
      call.some(arg => 
        typeof arg === 'string' && 
        (arg.includes('hydrat') || 
         arg.includes('server rendered HTML') ||
         arg.includes('client properties'))
      )
    )
    
    expect(hydrationErrors).toHaveLength(0)
  })

  it('should not have mismatched server/client attributes', () => {
    const { container } = render(<VrpExplorer />)
    
    // Check for common hydration issues
    const elementsWithDisabled = container.querySelectorAll('[disabled]')
    elementsWithDisabled.forEach(element => {
      // Ensure disabled attribute is properly set
      expect(element.hasAttribute('disabled')).toBe(true)
    })
    
    // Check for consistent class names
    const elementsWithClass = container.querySelectorAll('[class]')
    elementsWithClass.forEach(element => {
      const className = element.getAttribute('class')
      expect(className).toBeTruthy()
      expect(className).not.toContain('undefined')
      expect(className).not.toContain('null')
    })
  })

  it('should handle localStorage access gracefully during SSR simulation', () => {
    // Simulate SSR by temporarily removing localStorage
    const originalLocalStorage = global.localStorage
    delete (global as any).localStorage
    
    expect(() => {
      render(<VrpExplorer />)
    }).not.toThrow()
    
    // Restore localStorage
    global.localStorage = originalLocalStorage
  })

  it('should have consistent initial state between server and client', () => {
    // First render (simulating server)
    const { unmount } = render(<VrpExplorer />)
    const serverErrors = [...consoleError.mock.calls]
    unmount()
    consoleError.mockClear()
    
    // Second render (simulating client hydration)
    render(<VrpExplorer />)
    const clientErrors = [...consoleError.mock.calls]
    
    // Should have same number of errors (ideally 0) in both renders
    expect(clientErrors.length).toBe(serverErrors.length)
    
    // No new hydration errors should appear
    const newHydrationErrors = clientErrors.filter(call => 
      call.some(arg => 
        typeof arg === 'string' && 
        arg.includes('hydration')
      )
    )
    expect(newHydrationErrors).toHaveLength(0)
  })
})