import { render, screen } from '@testing-library/react'
import { VrpLayout } from '../components/VrpLayout'

// Mock the resizable component since it uses DOM APIs
jest.mock('../components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children, direction, className }: any) => 
    <div data-testid="resizable-group" data-direction={direction} className={className}>{children}</div>,
  ResizablePanel: ({ children, defaultSize, minSize, maxSize }: any) => 
    <div data-testid="resizable-panel" defaultSize={defaultSize} data-min={minSize} data-max={maxSize}>{children}</div>,
  ResizableHandle: ({ withHandle }: any) => 
    <div data-testid="resizable-handle" data-with-handle={withHandle} />
}))

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

describe('VrpLayout', () => {
  const mockLeftContent = <div data-testid="left-content">Left Panel</div>
  const mockRightContent = <div data-testid="right-content">Right Panel</div>

  beforeEach(() => {
    // Reset window.matchMedia mock
    ;(window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query === '(max-width: 768px)' ? false : true, // Default to desktop
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }))
  })

  describe('Desktop Layout', () => {
    it('should render resizable split pane on desktop', () => {
      render(
        <VrpLayout leftPanel={mockLeftContent} rightPanel={mockRightContent} />
      )

      expect(screen.getByTestId('resizable-group')).toBeInTheDocument()
      expect(screen.getAllByTestId('resizable-panel')).toHaveLength(2)
      expect(screen.getByTestId('resizable-handle')).toBeInTheDocument()
    })

    it('should render both panels in desktop mode', () => {
      render(
        <VrpLayout leftPanel={mockLeftContent} rightPanel={mockRightContent} />
      )

      expect(screen.getByTestId('left-content')).toBeInTheDocument()
      expect(screen.getByTestId('right-content')).toBeInTheDocument()
    })

    it('should use 40/60 split ratio by default', () => {
      render(
        <VrpLayout leftPanel={mockLeftContent} rightPanel={mockRightContent} />
      )

      const panels = screen.getAllByTestId('resizable-panel')
      expect(panels[0]).toHaveAttribute('defaultSize', '40')
      expect(panels[1]).toHaveAttribute('defaultSize', '60')
    })

    it('should allow custom split ratio', () => {
      render(
        <VrpLayout 
          leftPanel={mockLeftContent} 
          rightPanel={mockRightContent} 
          leftPanelSize={50}
        />
      )

      const panels = screen.getAllByTestId('resizable-panel')
      expect(panels[0]).toHaveAttribute('defaultSize', '50')
      expect(panels[1]).toHaveAttribute('defaultSize', '50')
    })
  })

  describe('Mobile Layout', () => {
    beforeEach(() => {
      // Mock mobile viewport
      ;(window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(max-width: 768px)' ? true : false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))
    })

    it('should render tabs on mobile', () => {
      render(
        <VrpLayout leftPanel={mockLeftContent} rightPanel={mockRightContent} />
      )

      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /editor/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /map/i })).toBeInTheDocument()
    })

    it('should show left panel content by default on mobile', () => {
      render(
        <VrpLayout leftPanel={mockLeftContent} rightPanel={mockRightContent} />
      )

      expect(screen.getByTestId('left-content')).toBeInTheDocument()
      // Right panel should not be visible initially
      expect(screen.queryByTestId('right-content')).not.toBeInTheDocument()
    })

    it('should not render resizable components on mobile', () => {
      render(
        <VrpLayout leftPanel={mockLeftContent} rightPanel={mockRightContent} />
      )

      expect(screen.queryByTestId('resizable-group')).not.toBeInTheDocument()
      expect(screen.queryByTestId('resizable-handle')).not.toBeInTheDocument()
    })
  })


  describe('Accessibility', () => {
    it('should have proper ARIA labels for tabs', () => {
      // Mock mobile viewport
      ;(window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(max-width: 768px)' ? true : false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }))

      render(
        <VrpLayout leftPanel={mockLeftContent} rightPanel={mockRightContent} />
      )

      expect(screen.getByRole('tab', { name: /editor/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /map/i })).toBeInTheDocument()
    })

    it('should have proper keyboard navigation support', () => {
      render(
        <VrpLayout leftPanel={mockLeftContent} rightPanel={mockRightContent} />
      )

      // Resizable panels should be focusable for keyboard navigation
      const resizableGroup = screen.getByTestId('resizable-group')
      expect(resizableGroup).toBeInTheDocument()
    })
  })
})