'use client'

import { useEffect, useCallback } from 'react'

/**
 * Configuration for a keyboard shortcut
 */
export interface KeyboardShortcutConfig {
  /** The key to listen for (e.g., 'k', 'Enter', 'Escape') */
  key: string
  /** Whether Ctrl (Windows/Linux) or Cmd (Mac) should be pressed */
  ctrlOrCmd?: boolean
  /** Whether Shift should be pressed */
  shift?: boolean
  /** Whether Alt should be pressed */
  alt?: boolean
  /** Whether to prevent the default browser behavior */
  preventDefault?: boolean
  /** Whether the shortcut is enabled (default: true) */
  enabled?: boolean
}

/**
 * Custom hook to handle keyboard shortcuts with modifier keys
 *
 * @param config - Configuration for the keyboard shortcut
 * @param callback - Function to call when the shortcut is triggered
 * @param deps - Dependencies array for the callback function
 *
 * @example
 * ```tsx
 * // Ctrl/Cmd + K shortcut
 * useKeyboardShortcut(
 *   { key: 'k', ctrlOrCmd: true, preventDefault: true },
 *   () => togglePanel(),
 *   [togglePanel]
 * )
 *
 * // Shift + Tab shortcut
 * useKeyboardShortcut(
 *   { key: 'Tab', shift: true, preventDefault: true, enabled: isOpen },
 *   () => switchMode(),
 *   [switchMode, isOpen]
 * )
 *
 * // Simple Escape key
 * useKeyboardShortcut(
 *   { key: 'Escape', enabled: isOpen },
 *   () => close(),
 *   [close, isOpen]
 * )
 * ```
 */
export function useKeyboardShortcut(
  config: KeyboardShortcutConfig,
  callback: () => void,
  deps: React.DependencyList = []
) {
  const {
    key,
    ctrlOrCmd = false,
    shift = false,
    alt = false,
    preventDefault = false,
    enabled = true,
  } = config

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedCallback = useCallback(callback, deps)

  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the key matches
      const keyMatches = event.key.toLowerCase() === key.toLowerCase()
      if (!keyMatches) return

      // Check modifier keys
      const ctrlOrCmdPressed = ctrlOrCmd ? (event.ctrlKey || event.metaKey) : true
      const shiftPressed = shift ? event.shiftKey : true
      const altPressed = alt ? event.altKey : true

      // Also ensure that if ctrlOrCmd is NOT required, neither ctrl nor cmd should be pressed
      // (unless they are explicitly required by another modifier)
      const noUnwantedCtrlOrCmd = !ctrlOrCmd ? !(event.ctrlKey || event.metaKey) : true
      const noUnwantedShift = !shift ? !event.shiftKey : true
      const noUnwantedAlt = !alt ? !event.altKey : true

      if (
        keyMatches &&
        ctrlOrCmdPressed &&
        shiftPressed &&
        altPressed &&
        noUnwantedCtrlOrCmd &&
        noUnwantedShift &&
        noUnwantedAlt
      ) {
        if (preventDefault) {
          event.preventDefault()
        }
        memoizedCallback()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [key, ctrlOrCmd, shift, alt, preventDefault, enabled, memoizedCallback])
}

/**
 * Helper hook to handle multiple keyboard shortcuts at once
 *
 * @param shortcuts - Array of shortcut configurations and their callbacks
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     config: { key: 'k', ctrlOrCmd: true, preventDefault: true },
 *     callback: () => togglePanel(),
 *     deps: [togglePanel]
 *   },
 *   {
 *     config: { key: 'Escape', enabled: isOpen },
 *     callback: () => close(),
 *     deps: [close, isOpen]
 *   }
 * ])
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: Array<{
    config: KeyboardShortcutConfig
    callback: () => void
    deps?: React.DependencyList
  }>
) {
  shortcuts.forEach(({ config, callback, deps = [] }) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useKeyboardShortcut(config, callback, deps)
  })
}
