import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

/**
 * Standard route colors for consistent visualization across map and Gantt
 */
export const ROUTE_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16'  // lime
] as const

/**
 * Create a mapping of resource names to colors for consistent visualization
 * @param trips - Array of trips from VRP solution
 * @returns Map of resource name to color hex code
 */
export function createResourceColorMap(
  trips: Vrp.OnRouteResponse['trips']
): Map<string, string> {
  const colorMap = new Map<string, string>()

  if (!trips?.length) return colorMap

  // Extract unique resource names
  const uniqueResources = Array.from(
    new Set(
      trips
        .map(t => t.resource)
        .filter((r): r is string => r !== null && r !== undefined)
    )
  )

  // Assign colors in order
  uniqueResources.forEach((resource, idx) => {
    colorMap.set(resource, ROUTE_COLORS[idx % ROUTE_COLORS.length])
  })

  return colorMap
}