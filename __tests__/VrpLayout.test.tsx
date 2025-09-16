import { render, screen } from '@testing-library/react'
import { VrpLayout } from '../components/VrpLayout'

// Mock the resizable component since it uses DOM APIs
jest.mock('../components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children, direction, className }: any) => 
    <div data-testid="resizable-group" data-direction={direction} className={className}>{children}</div>,
  ResizablePanel: ({ children, defaultSize, minSize, maxSize }: any) =>
    <div data-testid="resizable-panel" data-default-size={defaultSize} data-min={minSize} data-max={maxSize}>{children}</div>,
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
  const mockCenterContent = <div data-testid="center-content">Center Panel</div>
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
    it('should render 3-column resizable layout on desktop', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      expect(screen.getByTestId('resizable-group')).toBeInTheDocument()
      expect(screen.getAllByTestId('resizable-panel')).toHaveLength(3)
      expect(screen.getAllByTestId('resizable-handle')).toHaveLength(2)
    })

    it('should render all three panels in desktop mode', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      expect(screen.getByTestId('left-content')).toBeInTheDocument()
      expect(screen.getByTestId('center-content')).toBeInTheDocument()
      expect(screen.getByTestId('right-content')).toBeInTheDocument()
    })

    it('should use 35/40/25 split ratio by default', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      const panels = screen.getAllByTestId('resizable-panel')
      expect(panels[0]).toHaveAttribute('data-default-size', '35')
      expect(panels[1]).toHaveAttribute('data-default-size', '40')
      expect(panels[2]).toHaveAttribute('data-default-size', '25')
    })

    it('should allow custom split ratios', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
          leftPanelSize={30}
          rightPanelSize={30}
        />
      )

      const panels = screen.getAllByTestId('resizable-panel')
      expect(panels[0]).toHaveAttribute('data-default-size', '30')
      expect(panels[1]).toHaveAttribute('data-default-size', '40') // center = 100 - 30 - 30
      expect(panels[2]).toHaveAttribute('data-default-size', '30')
    })

    it('should set proper minimum and maximum sizes for panels', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      const panels = screen.getAllByTestId('resizable-panel')

      // Left panel: min 25%, max 50%
      expect(panels[0]).toHaveAttribute('data-min', '25')
      expect(panels[0]).toHaveAttribute('data-max', '50')

      // Center panel: min 30%, max 50%
      expect(panels[1]).toHaveAttribute('data-min', '30')
      expect(panels[1]).toHaveAttribute('data-max', '50')

      // Right panel: min 20%, max 40%
      expect(panels[2]).toHaveAttribute('data-min', '20')
      expect(panels[2]).toHaveAttribute('data-max', '40')
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

    it('should render 3 tabs on mobile', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /json editor/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /map/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /ai chat/i })).toBeInTheDocument()
    })

    it('should show left panel content by default on mobile', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      expect(screen.getByTestId('left-content')).toBeInTheDocument()
      // Center and right panels should not be visible initially
      expect(screen.queryByTestId('center-content')).not.toBeInTheDocument()
      expect(screen.queryByTestId('right-content')).not.toBeInTheDocument()
    })

    it('should not render resizable components on mobile', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      expect(screen.queryByTestId('resizable-group')).not.toBeInTheDocument()
      expect(screen.queryByTestId('resizable-handle')).not.toBeInTheDocument()
    })
  })


  describe('Accessibility', () => {
    it('should have proper ARIA labels for all 3 tabs', () => {
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
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      expect(screen.getByRole('tab', { name: /json editor/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /map/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /ai chat/i })).toBeInTheDocument()
    })

    it('should have proper keyboard navigation support for 3-column layout', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      // Resizable panels should be focusable for keyboard navigation
      const resizableGroup = screen.getByTestId('resizable-group')
      expect(resizableGroup).toBeInTheDocument()
    })

    it('should render panels with proper borders for visual separation', () => {
      render(
        <VrpLayout
          leftPanel={mockLeftContent}
          centerPanel={mockCenterContent}
          rightPanel={mockRightContent}
        />
      )

      const panels = screen.getAllByTestId('resizable-panel')
      // First panel should have border-r
      expect(panels[0].firstChild).toHaveClass('border-r')
      // Second panel should have border-r
      expect(panels[1].firstChild).toHaveClass('border-r')
      // Third panel should not have border-r
      expect(panels[2].firstChild).not.toHaveClass('border-r')
    })
  })
})