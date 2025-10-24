import { renderHook, act } from '@testing-library/react'
import { useMobileDetection } from '@/lib/hooks/useMobileDetection'

describe('useMobileDetection', () => {
  let matchMediaMock: jest.Mock

  beforeEach(() => {
    matchMediaMock = jest.fn()
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return false when viewport is wider than breakpoint', () => {
    const addEventListenerMock = jest.fn()
    const removeEventListenerMock = jest.fn()

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    })

    const { result } = renderHook(() => useMobileDetection())

    expect(result.current).toBe(false)
    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 768px)')
  })

  it('should return true when viewport is narrower than breakpoint', () => {
    const addEventListenerMock = jest.fn()
    const removeEventListenerMock = jest.fn()

    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    })

    const { result } = renderHook(() => useMobileDetection())

    expect(result.current).toBe(true)
  })

  it('should use custom breakpoint when provided', () => {
    const addEventListenerMock = jest.fn()
    const removeEventListenerMock = jest.fn()

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    })

    renderHook(() => useMobileDetection(640))

    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 640px)')
  })

  it('should update state when media query changes', () => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = []
    const addEventListenerMock = jest.fn((_, listener) => {
      listeners.push(listener)
    })
    const removeEventListenerMock = jest.fn()

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    })

    const { result, rerender } = renderHook(() => useMobileDetection())

    expect(result.current).toBe(false)

    // Simulate media query change
    act(() => {
      matchMediaMock.mockReturnValue({
        matches: true,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      })
      listeners.forEach((listener) => {
        listener({ matches: true } as MediaQueryListEvent)
      })
    })

    rerender()
    expect(result.current).toBe(true)
  })

  it('should add event listener on mount', () => {
    const addEventListenerMock = jest.fn()
    const removeEventListenerMock = jest.fn()

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    })

    renderHook(() => useMobileDetection())

    expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('should remove event listener on unmount', () => {
    const addEventListenerMock = jest.fn()
    const removeEventListenerMock = jest.fn()

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    })

    const { unmount } = renderHook(() => useMobileDetection())

    unmount()

    expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('should re-subscribe when breakpoint changes', () => {
    const addEventListenerMock = jest.fn()
    const removeEventListenerMock = jest.fn()

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerMock,
      removeEventListener: removeEventListenerMock,
    })

    const { rerender } = renderHook(
      ({ breakpoint }) => useMobileDetection(breakpoint),
      { initialProps: { breakpoint: 768 } }
    )

    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 768px)')

    // Change breakpoint
    rerender({ breakpoint: 640 })

    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 640px)')
    expect(removeEventListenerMock).toHaveBeenCalled()
  })
})
