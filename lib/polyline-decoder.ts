/**
 * Decode Google Encoded Polyline Algorithm Format
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    // Decode latitude
    let b: number
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    // Decode longitude
    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    // Convert to decimal degrees and add to coordinates
    coordinates.push([lng / 1e5, lat / 1e5])
  }

  return coordinates
}

/**
 * Check if a string appears to be an encoded polyline
 */
export function isEncodedPolyline(str: string): boolean {
  // Basic check: should be a string with valid polyline characters
  // Based on Google Polyline specification, valid characters are ASCII 63-126
  // This includes all printable ASCII characters except space
  return typeof str === 'string' && str.length > 0 && /^[\x3F-\x7E]*$/.test(str)
}