import { decodePolyline, isEncodedPolyline } from '@/lib/polyline-decoder'

describe('Polyline Decoder', () => {
  describe('decodePolyline', () => {
    it('should decode a simple polyline correctly', () => {
      // Test polyline from Brussels to Antwerp (simplified)
      const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'
      const coordinates = decodePolyline(encoded)

      expect(coordinates).toBeDefined()
      expect(coordinates.length).toBeGreaterThan(0)
      expect(Array.isArray(coordinates)).toBe(true)

      // Each coordinate should be [longitude, latitude]
      coordinates.forEach(coord => {
        expect(coord).toHaveLength(2)
        expect(typeof coord[0]).toBe('number') // longitude
        expect(typeof coord[1]).toBe('number') // latitude
      })
    })

    it('should handle empty string', () => {
      const coordinates = decodePolyline('')
      expect(coordinates).toEqual([])
    })

    it('should decode real polyline data correctly', () => {
      // A simple 3-point polyline
      const encoded = 'u{~vFvyys@fS]'
      const coordinates = decodePolyline(encoded)

      expect(coordinates.length).toBeGreaterThan(1)

      // Should return coordinates in reasonable European range
      coordinates.forEach(([lng, lat]) => {
        expect(lng).toBeGreaterThan(-10) // Western Europe
        expect(lng).toBeLessThan(20)     // Eastern Europe
        expect(lat).toBeGreaterThan(40)  // Southern Europe
        expect(lat).toBeLessThan(70)     // Northern Europe
      })
    })
  })

  describe('isEncodedPolyline', () => {
    it('should identify valid polyline strings', () => {
      expect(isEncodedPolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toBe(true)
      expect(isEncodedPolyline('abcDEF123_@?`~|-')).toBe(true)
      expect(isEncodedPolyline('simple123')).toBe(true)
      expect(isEncodedPolyline('{|}~`@?')).toBe(true) // curly braces and other valid chars
    })

    it('should reject invalid polyline strings', () => {
      expect(isEncodedPolyline('')).toBe(false)
      expect(isEncodedPolyline('hello world!')).toBe(false) // space not allowed
      expect(isEncodedPolyline('spaces not allowed')).toBe(false)
      expect(isEncodedPolyline('invalid\ttab')).toBe(false) // tab not allowed
      expect(isEncodedPolyline('invalid\nnewline')).toBe(false) // newline not allowed
    })

    it('should handle non-string input', () => {
      expect(isEncodedPolyline(null as any)).toBe(false)
      expect(isEncodedPolyline(undefined as any)).toBe(false)
      expect(isEncodedPolyline(123 as any)).toBe(false)
      expect(isEncodedPolyline({} as any)).toBe(false)
    })
  })
})