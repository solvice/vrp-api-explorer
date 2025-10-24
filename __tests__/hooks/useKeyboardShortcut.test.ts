import { renderHook } from '@testing-library/react'
import { useKeyboardShortcut, useKeyboardShortcuts } from '@/lib/hooks/useKeyboardShortcut'

describe('useKeyboardShortcut', () => {
  let callback: jest.Mock

  beforeEach(() => {
    callback = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should trigger callback on simple key press', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'k' }, callback, [callback])
    )

    const event = new KeyboardEvent('keydown', { key: 'k' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should trigger callback with Ctrl/Cmd modifier', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlOrCmd: true }, callback, [callback])
    )

    // Test with Ctrl
    const ctrlEvent = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    document.dispatchEvent(ctrlEvent)
    expect(callback).toHaveBeenCalledTimes(1)

    callback.mockClear()

    // Test with Meta (Cmd)
    const metaEvent = new KeyboardEvent('keydown', { key: 'k', metaKey: true })
    document.dispatchEvent(metaEvent)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should NOT trigger without required Ctrl/Cmd modifier', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'k', ctrlOrCmd: true }, callback, [callback])
    )

    const event = new KeyboardEvent('keydown', { key: 'k' })
    document.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should trigger callback with Shift modifier', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'Tab', shift: true }, callback, [callback])
    )

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should NOT trigger without required Shift modifier', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'Tab', shift: true }, callback, [callback])
    )

    const event = new KeyboardEvent('keydown', { key: 'Tab' })
    document.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should trigger callback with Alt modifier', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'k', alt: true }, callback, [callback])
    )

    const event = new KeyboardEvent('keydown', { key: 'k', altKey: true })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should trigger callback with multiple modifiers', () => {
    renderHook(() =>
      useKeyboardShortcut(
        { key: 's', ctrlOrCmd: true, shift: true },
        callback,
        [callback]
      )
    )

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
    })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should prevent default when configured', () => {
    renderHook(() =>
      useKeyboardShortcut(
        { key: 'k', preventDefault: true },
        callback,
        [callback]
      )
    )

    const event = new KeyboardEvent('keydown', { key: 'k' })
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault')
    document.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should NOT trigger when disabled', () => {
    renderHook(() =>
      useKeyboardShortcut(
        { key: 'k', enabled: false },
        callback,
        [callback]
      )
    )

    const event = new KeyboardEvent('keydown', { key: 'k' })
    document.dispatchEvent(event)

    expect(callback).not.toHaveBeenCalled()
  })

  it('should update when enabled changes', () => {
    const { rerender } = renderHook(
      ({ enabled }) => useKeyboardShortcut({ key: 'k', enabled }, callback, [callback]),
      { initialProps: { enabled: false } }
    )

    const event = new KeyboardEvent('keydown', { key: 'k' })
    document.dispatchEvent(event)
    expect(callback).not.toHaveBeenCalled()

    // Enable the shortcut
    rerender({ enabled: true })
    document.dispatchEvent(event)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should be case-insensitive for key matching', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'K' }, callback, [callback])
    )

    const lowerCaseEvent = new KeyboardEvent('keydown', { key: 'k' })
    document.dispatchEvent(lowerCaseEvent)
    expect(callback).toHaveBeenCalledTimes(1)

    callback.mockClear()

    const upperCaseEvent = new KeyboardEvent('keydown', { key: 'K' })
    document.dispatchEvent(upperCaseEvent)
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should handle Escape key', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'Escape' }, callback, [callback])
    )

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event)

    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should clean up event listener on unmount', () => {
    const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')

    const { unmount } = renderHook(() =>
      useKeyboardShortcut({ key: 'k' }, callback, [callback])
    )

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })

  it('should NOT trigger with unwanted modifier keys', () => {
    renderHook(() =>
      useKeyboardShortcut({ key: 'k' }, callback, [callback])
    )

    // Press k with Ctrl (not configured, should not trigger)
    const ctrlEvent = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    document.dispatchEvent(ctrlEvent)
    expect(callback).not.toHaveBeenCalled()

    // Press k with Shift (not configured, should not trigger)
    const shiftEvent = new KeyboardEvent('keydown', { key: 'k', shiftKey: true })
    document.dispatchEvent(shiftEvent)
    expect(callback).not.toHaveBeenCalled()

    // Press k with Alt (not configured, should not trigger)
    const altEvent = new KeyboardEvent('keydown', { key: 'k', altKey: true })
    document.dispatchEvent(altEvent)
    expect(callback).not.toHaveBeenCalled()
  })
})

describe('useKeyboardShortcuts', () => {
  it('should handle multiple shortcuts', () => {
    const callback1 = jest.fn()
    const callback2 = jest.fn()

    renderHook(() =>
      useKeyboardShortcuts([
        {
          config: { key: 'k', ctrlOrCmd: true },
          callback: callback1,
          deps: [callback1],
        },
        {
          config: { key: 'Escape' },
          callback: callback2,
          deps: [callback2],
        },
      ])
    )

    // Trigger first shortcut
    const event1 = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })
    document.dispatchEvent(event1)
    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).not.toHaveBeenCalled()

    // Trigger second shortcut
    const event2 = new KeyboardEvent('keydown', { key: 'Escape' })
    document.dispatchEvent(event2)
    expect(callback1).toHaveBeenCalledTimes(1)
    expect(callback2).toHaveBeenCalledTimes(1)
  })

  it('should handle empty shortcuts array', () => {
    expect(() => {
      renderHook(() => useKeyboardShortcuts([]))
    }).not.toThrow()
  })
})
