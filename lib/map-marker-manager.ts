import maplibregl from 'maplibre-gl'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export interface MarkerMetadata {
  resource: string
  job: string
}

/**
 * Manages MapLibre markers for VRP visualization
 */
export class MapMarkerManager {
  private markers: maplibregl.Marker[] = []
  private metadata = new Map<maplibregl.Marker, MarkerMetadata>()

  /**
   * Clear all markers from the map
   */
  clear(): void {
    this.markers.forEach(marker => marker.remove())
    this.markers = []
    this.metadata.clear()
  }

  /**
   * Get all markers
   */
  getMarkers(): maplibregl.Marker[] {
    return this.markers
  }

  /**
   * Get metadata for a marker
   */
  getMetadata(marker: maplibregl.Marker): MarkerMetadata | undefined {
    return this.metadata.get(marker)
  }

  /**
   * Get all marker metadata
   */
  getAllMetadata(): Map<maplibregl.Marker, MarkerMetadata> {
    return this.metadata
  }

  /**
   * Create a marker element with custom styling and hover interactions
   */
  createMarkerElement(
    type: 'job' | 'resource',
    name: string,
    options: {
      sequence?: number
      visit?: Record<string, unknown>
      vehicleColor?: string
      resourceName?: string
      onHover?: (job: { resource: string; job: string } | null) => void
    } = {}
  ): HTMLDivElement {
    const { sequence, visit, vehicleColor, resourceName, onHover } = options
    const el = document.createElement('div')
    el.className = `${type}-marker cursor-pointer relative`

    if (type === 'job') {
      const markerColor = vehicleColor || '#3B82F6'
      el.innerHTML = `
        <div class="marker-icon flex items-center justify-center w-8 h-8 text-white rounded-full border-2 border-white shadow-lg text-xs font-bold transition-all hover:scale-110" style="background-color: ${markerColor}">
          ${sequence || '•'}
        </div>
        <div class="marker-tooltip absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-3 py-2 bg-white rounded-lg shadow-lg border text-xs whitespace-nowrap opacity-0 invisible transition-all duration-200 z-10 pointer-events-none">
          <div class="font-semibold text-gray-900">${name}</div>
          ${sequence ? `<div class="text-gray-600">Visit #${sequence}</div>` : ''}
          ${visit?.arrival && typeof visit.arrival === 'string' ? `<div class="text-gray-600">Arrival: ${new Date(visit.arrival).toLocaleTimeString()}</div>` : ''}
          ${visit?.arrival && typeof visit.arrival === 'string' && visit?.serviceTime && typeof visit.serviceTime === 'number' ? `<div class="text-gray-600">Departure: ${new Date(new Date(visit.arrival).getTime() + visit.serviceTime * 1000).toLocaleTimeString()}</div>` : ''}
          <div class="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t rotate-45"></div>
        </div>
      `
    } else {
      el.innerHTML = `
        <div class="marker-icon flex items-center justify-center w-10 h-10 bg-green-600 text-white rounded-full border-2 border-white shadow-lg transition-transform hover:scale-110">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
        </div>
        <div class="marker-tooltip absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-3 py-2 bg-white rounded-lg shadow-lg border text-xs whitespace-nowrap opacity-0 invisible transition-all duration-200 z-10 pointer-events-none">
          <div class="font-semibold text-gray-900">${name}</div>
          <div class="text-gray-600">Vehicle Depot</div>
          <div class="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white border-l border-t rotate-45"></div>
        </div>
      `
    }

    // Add hover interactions
    el.addEventListener('mouseenter', () => {
      const tooltip = el.querySelector('.marker-tooltip')
      if (tooltip) {
        tooltip.classList.remove('opacity-0', 'invisible')
        tooltip.classList.add('opacity-100', 'visible')
      }
      // Notify parent of hover if this is a job marker with resource
      if (type === 'job' && resourceName && onHover) {
        onHover({ resource: resourceName, job: name })
      }
    })

    el.addEventListener('mouseleave', () => {
      const tooltip = el.querySelector('.marker-tooltip')
      if (tooltip) {
        tooltip.classList.remove('opacity-100', 'visible')
        tooltip.classList.add('opacity-0', 'invisible')
      }
      // Clear hover state
      if (type === 'job' && onHover) {
        onHover(null)
      }
    })

    return el
  }

  /**
   * Add resource depot markers to the map
   */
  addResourceMarkers(
    resources: Array<{ name?: string; shifts?: Array<{ start?: { longitude: number; latitude: number } }> }> | undefined,
    map: maplibregl.Map,
    bounds?: maplibregl.LngLatBounds,
    onHover?: (job: { resource: string; job: string } | null) => void
  ): void {
    if (!resources) return

    resources.forEach((resource) => {
      resource.shifts?.forEach((shift) => {
        if (shift.start) {
          const el = this.createMarkerElement('resource', resource.name || 'Resource', { onHover })
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([shift.start.longitude, shift.start.latitude])
            .addTo(map)

          this.markers.push(marker)
          if (bounds) {
            bounds.extend([shift.start.longitude, shift.start.latitude])
          }
        }
      })
    })
  }

  /**
   * Add job markers with sequence numbers and colors
   */
  addJobMarkers(
    trips: Vrp.OnRouteResponse['trips'],
    jobs: Array<Record<string, unknown>> | undefined,
    resourceColors: Map<string, string>,
    map: maplibregl.Map,
    bounds?: maplibregl.LngLatBounds,
    onHover?: (job: { resource: string; job: string } | null) => void
  ): void {
    if (!trips || !jobs) return

    trips.forEach((trip) => {
      const resourceName = trip.resource || 'Unknown'
      const vehicleColor = resourceColors.get(resourceName) || '#3B82F6'

      trip.visits?.forEach((visit, visitIndex) => {
        const job = jobs.find((j) => j.name === visit.job)
        if (job?.location && typeof job.location === 'object' && job.location !== null) {
          const location = job.location as { longitude?: number; latitude?: number }
          if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
            const jobName = typeof job.name === 'string' ? job.name : 'Job'
            const el = this.createMarkerElement('job', jobName, {
              sequence: visitIndex + 1,
              visit: visit as unknown as Record<string, unknown>,
              vehicleColor,
              resourceName,
              onHover
            })
            const marker = new maplibregl.Marker({ element: el })
              .setLngLat([location.longitude, location.latitude])
              .addTo(map)

            this.markers.push(marker)
            this.metadata.set(marker, { resource: resourceName, job: jobName })
            if (bounds) {
              bounds.extend([location.longitude, location.latitude])
            }
          }
        }
      })
    })
  }

  /**
   * Add simple job markers (without sequence numbers, for request-only view)
   */
  addSimpleJobMarkers(
    jobs: Array<Record<string, unknown>> | undefined,
    map: maplibregl.Map,
    bounds?: maplibregl.LngLatBounds,
    onHover?: (job: { resource: string; job: string } | null) => void
  ): void {
    if (!jobs) return

    jobs.forEach((job) => {
      if (job.location && typeof job.location === 'object' && job.location !== null) {
        const location = job.location as { longitude?: number; latitude?: number }
        if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
          const el = this.createMarkerElement('job', typeof job.name === 'string' ? job.name : 'Job', { onHover })
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([location.longitude, location.latitude])
            .addTo(map)

          this.markers.push(marker)
          if (bounds) {
            bounds.extend([location.longitude, location.latitude])
          }
        }
      }
    })
  }

  /**
   * Update marker highlighting based on highlighted job
   */
  updateHighlighting(highlightedJob: { resource: string; job: string } | null): void {
    this.metadata.forEach((metadata, marker) => {
      const el = marker.getElement()
      const icon = el.querySelector('.marker-icon')
      if (!icon) return

      const isHighlighted = highlightedJob &&
        metadata.resource === highlightedJob.resource &&
        metadata.job === highlightedJob.job

      if (isHighlighted) {
        icon.classList.add('scale-125', 'ring-4', 'ring-white', 'ring-opacity-75')
        icon.classList.remove('opacity-40')
      } else if (highlightedJob) {
        icon.classList.add('opacity-40')
        icon.classList.remove('scale-125', 'ring-4', 'ring-white', 'ring-opacity-75')
      } else {
        icon.classList.remove('opacity-40', 'scale-125', 'ring-4', 'ring-white', 'ring-opacity-75')
      }
    })
  }
}