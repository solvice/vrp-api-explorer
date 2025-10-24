'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook to detect mobile viewport using media queries
 *
 * @param breakpoint - The maximum width in pixels to consider as mobile (default: 768)
 * @returns boolean indicating if the current viewport is mobile
 *
 * @example
 * ```tsx
 * const isMobile = useMobileDetection() // Uses default 768px breakpoint
 * const isSmallScreen = useMobileDetection(640) // Custom breakpoint
 * ```
 */
export function useMobileDetection(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.matchMedia(`(max-width: ${breakpoint}px)`).matches)
    }

    // Check on mount
    checkIsMobile()

    // Listen for viewport changes
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    mediaQuery.addEventListener('change', checkIsMobile)

    // Cleanup listener on unmount
    return () => {
      mediaQuery.removeEventListener('change', checkIsMobile)
    }
  }, [breakpoint])

  return isMobile
}
