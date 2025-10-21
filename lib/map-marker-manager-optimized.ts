import maplibregl from 'maplibre-gl'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import Supercluster from 'supercluster'

export interface MarkerMetadata {
  resource: string
  job: string
}

interface JobFeature {
  type: 'Feature'
  properties: {
    type: 'job' | 'resource'
    name: string
    sequence?: number
    arrival?: string
    serviceTime?: number
    resourceName?: string
    color: string
    cluster?: boolean
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

/**
 * Optimized MapLibre marker manager using symbol layers and clustering
 * for high-performance rendering of thousands of markers
 */
export class MapMarkerManagerOptimized {
  private map: maplibregl.Map | null = null
  private cluster: Supercluster | null = null
  private jobFeatures: JobFeature[] = []
  private resourceFeatures: JobFeature[] = []
  private highlightedJob: { resource: string; job: string } | null = null
  private popup: maplibregl.Popup | null = null

  // Layer IDs for cleanup
  private readonly JOBS_SOURCE = 'jobs-source'
  private readonly JOBS_CLUSTER_LAYER = 'jobs-clusters'
  private readonly JOBS_CLUSTER_COUNT_LAYER = 'jobs-cluster-count'
  private readonly JOBS_UNCLUSTERED_LAYER = 'jobs-unclustered'
  private readonly RESOURCES_SOURCE = 'resources-source'
  private readonly RESOURCES_LAYER = 'resources-layer'

  /**
   * Clear all markers and layers from the map
   */
  clear(): void {
    if (!this.map) return

    // Remove layers
    const layersToRemove = [
      this.JOBS_CLUSTER_COUNT_LAYER,
      this.JOBS_CLUSTER_LAYER,
      this.JOBS_UNCLUSTERED_LAYER,
      this.RESOURCES_LAYER
    ]

    layersToRemove.forEach(layerId => {
      if (this.map?.getLayer(layerId)) {
        try {
          this.map.removeLayer(layerId)
        } catch (error) {
          console.warn(`Failed to remove layer ${layerId}:`, error)
        }
      }
    })

    // Remove sources
    const sourcesToRemove = [this.JOBS_SOURCE, this.RESOURCES_SOURCE]
    sourcesToRemove.forEach(sourceId => {
      if (this.map?.getSource(sourceId)) {
        try {
          this.map.removeSource(sourceId)
        } catch (error) {
          console.warn(`Failed to remove source ${sourceId}:`, error)
        }
      }
    })

    // Close any open popup
    if (this.popup) {
      this.popup.remove()
      this.popup = null
    }

    this.jobFeatures = []
    this.resourceFeatures = []
    this.cluster = null
  }

  /**
   * Add resource depot markers using symbol layer
   */
  addResourceMarkers(
    resources: Array<{ name?: string; shifts?: Array<{ start?: { longitude: number; latitude: number } }> }> | undefined,
    map: maplibregl.Map,
    bounds?: maplibregl.LngLatBounds
  ): void {
    this.map = map
    if (!resources) return

    this.resourceFeatures = []

    resources.forEach((resource) => {
      resource.shifts?.forEach((shift) => {
        if (shift.start) {
          this.resourceFeatures.push({
            type: 'Feature',
            properties: {
              type: 'resource',
              name: resource.name || 'Resource',
              color: '#10B981' // green-600
            },
            geometry: {
              type: 'Point',
              coordinates: [shift.start.longitude, shift.start.latitude]
            }
          })

          if (bounds) {
            bounds.extend([shift.start.longitude, shift.start.latitude])
          }
        }
      })
    })

    this.renderResourceLayer()
  }

  /**
   * Add job markers with clustering support for high performance
   */
  addJobMarkers(
    trips: Vrp.OnRouteResponse['trips'],
    jobs: Array<Record<string, unknown>> | undefined,
    resourceColors: Map<string, string>,
    map: maplibregl.Map,
    bounds?: maplibregl.LngLatBounds
  ): void {
    this.map = map
    if (!trips || !jobs) return

    this.jobFeatures = []

    trips.forEach((trip) => {
      const resourceName = trip.resource || 'Unknown'
      const color = resourceColors.get(resourceName) || '#3B82F6'

      trip.visits?.forEach((visit, visitIndex) => {
        const job = jobs.find((j) => j.name === visit.job)
        if (job?.location && typeof job.location === 'object' && job.location !== null) {
          const location = job.location as { longitude?: number; latitude?: number }
          if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
            this.jobFeatures.push({
              type: 'Feature',
              properties: {
                type: 'job',
                name: typeof job.name === 'string' ? job.name : 'Job',
                sequence: visitIndex + 1,
                arrival: visit.arrival,
                serviceTime: visit.serviceTime,
                resourceName,
                color
              },
              geometry: {
                type: 'Point',
                coordinates: [location.longitude, location.latitude]
              }
            })

            if (bounds) {
              bounds.extend([location.longitude, location.latitude])
            }
          }
        }
      })
    })

    // Initialize clustering
    this.cluster = new Supercluster({
      radius: 60,
      maxZoom: 16,
      minZoom: 0,
      minPoints: 5
    })

    this.cluster.load(this.jobFeatures as any)
    this.renderJobLayer()
  }

  /**
   * Add simple job markers (without clustering, for small datasets)
   */
  addSimpleJobMarkers(
    jobs: Array<Record<string, unknown>> | undefined,
    map: maplibregl.Map,
    bounds?: maplibregl.LngLatBounds
  ): void {
    this.map = map
    if (!jobs) return

    this.jobFeatures = []

    jobs.forEach((job) => {
      if (job.location && typeof job.location === 'object' && job.location !== null) {
        const location = job.location as { longitude?: number; latitude?: number }
        if (typeof location.longitude === 'number' && typeof location.latitude === 'number') {
          this.jobFeatures.push({
            type: 'Feature',
            properties: {
              type: 'job',
              name: typeof job.name === 'string' ? job.name : 'Job',
              color: '#3B82F6'
            },
            geometry: {
              type: 'Point',
              coordinates: [location.longitude, location.latitude]
            }
          })

          if (bounds) {
            bounds.extend([location.longitude, location.latitude])
          }
        }
      }
    })

    this.renderJobLayer()
  }

  /**
   * Render resource markers using symbol layer
   */
  private renderResourceLayer(): void {
    if (!this.map || this.resourceFeatures.length === 0) return

    // Add source
    if (!this.map.getSource(this.RESOURCES_SOURCE)) {
      this.map.addSource(this.RESOURCES_SOURCE, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: this.resourceFeatures
        }
      })
    }

    // Add symbol layer for resources
    if (!this.map.getLayer(this.RESOURCES_LAYER)) {
      this.map.addLayer({
        id: this.RESOURCES_LAYER,
        type: 'circle',
        source: this.RESOURCES_SOURCE,
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
          'circle-opacity': 0.9
        }
      })

      // Add hover cursor
      this.map.on('mouseenter', this.RESOURCES_LAYER, () => {
        if (this.map) this.map.getCanvas().style.cursor = 'pointer'
      })
      this.map.on('mouseleave', this.RESOURCES_LAYER, () => {
        if (this.map) this.map.getCanvas().style.cursor = ''
      })

      // Add click handler for popup
      this.map.on('click', this.RESOURCES_LAYER, (e) => {
        if (!e.features || !e.features[0]) return
        const feature = e.features[0]
        const properties = feature.properties

        if (this.popup) this.popup.remove()
        this.popup = new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-2">
              <div class="font-semibold text-gray-900">${properties?.name}</div>
              <div class="text-xs text-gray-600">Vehicle Depot</div>
            </div>
          `)
          .addTo(this.map!)
      })
    }
  }

  /**
   * Render job markers using symbol layer with clustering
   */
  private renderJobLayer(): void {
    if (!this.map) return

    const usesClustering = this.cluster !== null && this.jobFeatures.length > 100

    if (usesClustering && this.cluster) {
      // Get clusters at current zoom
      const zoom = this.map.getZoom()
      const bounds = this.map.getBounds()
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
      ]

      const clusters = this.cluster.getClusters(bbox, Math.floor(zoom))

      // Add or update source
      if (!this.map.getSource(this.JOBS_SOURCE)) {
        this.map.addSource(this.JOBS_SOURCE, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: clusters as any
          },
          cluster: true,
          clusterMaxZoom: 16,
          clusterRadius: 60
        })
      } else {
        const source = this.map.getSource(this.JOBS_SOURCE) as maplibregl.GeoJSONSource
        source.setData({
          type: 'FeatureCollection',
          features: this.jobFeatures
        })
      }

      // Add cluster circles
      if (!this.map.getLayer(this.JOBS_CLUSTER_LAYER)) {
        this.map.addLayer({
          id: this.JOBS_CLUSTER_LAYER,
          type: 'circle',
          source: this.JOBS_SOURCE,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              '#51bbd6',
              10,
              '#f1f075',
              50,
              '#f28cb1',
              100,
              '#ff6b6b'
            ],
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              15,
              10,
              20,
              50,
              25,
              100,
              30
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff'
          }
        })

        // Click to zoom into cluster
        this.map.on('click', this.JOBS_CLUSTER_LAYER, (e) => {
          if (!e.features || !e.features[0] || !this.cluster || !this.map) return
          const feature = e.features[0]
          const clusterId = feature.properties?.cluster_id
          const point_count = feature.properties?.point_count
          const clusterSource = this.map.getSource(this.JOBS_SOURCE) as maplibregl.GeoJSONSource

          // Get cluster expansion zoom
          clusterSource.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err || !this.map) return

            this.map.easeTo({
              center: (feature.geometry as any).coordinates,
              zoom: zoom || this.map.getZoom() + 2
            })
          })
        })

        this.map.on('mouseenter', this.JOBS_CLUSTER_LAYER, () => {
          if (this.map) this.map.getCanvas().style.cursor = 'pointer'
        })
        this.map.on('mouseleave', this.JOBS_CLUSTER_LAYER, () => {
          if (this.map) this.map.getCanvas().style.cursor = ''
        })
      }

      // Add cluster count labels
      if (!this.map.getLayer(this.JOBS_CLUSTER_COUNT_LAYER)) {
        this.map.addLayer({
          id: this.JOBS_CLUSTER_COUNT_LAYER,
          type: 'symbol',
          source: this.JOBS_SOURCE,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 11
          },
          paint: {
            'text-color': '#ffffff'
          }
        })
      }
    } else {
      // No clustering - add source directly
      if (!this.map.getSource(this.JOBS_SOURCE)) {
        this.map.addSource(this.JOBS_SOURCE, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: this.jobFeatures
          }
        })
      }
    }

    // Add unclustered points
    if (!this.map.getLayer(this.JOBS_UNCLUSTERED_LAYER)) {
      this.map.addLayer({
        id: this.JOBS_UNCLUSTERED_LAYER,
        type: 'circle',
        source: this.JOBS_SOURCE,
        filter: usesClustering ? ['!', ['has', 'point_count']] : true,
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['feature-state', 'highlighted'], false],
            10,
            8
          ],
          'circle-color': ['get', 'color'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': [
            'case',
            ['boolean', ['feature-state', 'highlighted'], false],
            3,
            2
          ],
          'circle-opacity': [
            'case',
            ['boolean', ['feature-state', 'dimmed'], false],
            0.4,
            0.9
          ]
        }
      })

      // Add text labels for sequence numbers
      this.map.addLayer({
        id: this.JOBS_UNCLUSTERED_LAYER + '-label',
        type: 'symbol',
        source: this.JOBS_SOURCE,
        filter: usesClustering ? ['!', ['has', 'point_count']] : true,
        layout: {
          'text-field': ['get', 'sequence'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-allow-overlap': false,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#ffffff'
        }
      })

      // Add hover and click interactions
      this.map.on('mouseenter', this.JOBS_UNCLUSTERED_LAYER, () => {
        if (this.map) this.map.getCanvas().style.cursor = 'pointer'
      })
      this.map.on('mouseleave', this.JOBS_UNCLUSTERED_LAYER, () => {
        if (this.map) this.map.getCanvas().style.cursor = ''
      })

      this.map.on('click', this.JOBS_UNCLUSTERED_LAYER, (e) => {
        if (!e.features || !e.features[0]) return
        const feature = e.features[0]
        const properties = feature.properties

        if (this.popup) this.popup.remove()

        const arrivalTime = properties?.arrival
          ? new Date(properties.arrival).toLocaleTimeString()
          : 'N/A'
        const departureTime = properties?.arrival && properties?.serviceTime
          ? new Date(new Date(properties.arrival).getTime() + properties.serviceTime * 1000).toLocaleTimeString()
          : 'N/A'

        this.popup = new maplibregl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="p-2">
              <div class="font-semibold text-gray-900">${properties?.name}</div>
              ${properties?.sequence ? `<div class="text-xs text-gray-600">Visit #${properties.sequence}</div>` : ''}
              ${properties?.resourceName ? `<div class="text-xs text-gray-600">Vehicle: ${properties.resourceName}</div>` : ''}
              ${properties?.arrival ? `<div class="text-xs text-gray-600">Arrival: ${arrivalTime}</div>` : ''}
              ${properties?.arrival && properties?.serviceTime ? `<div class="text-xs text-gray-600">Departure: ${departureTime}</div>` : ''}
            </div>
          `)
          .addTo(this.map!)
      })
    }

    // Update clusters on zoom/move
    if (usesClustering) {
      this.map.on('zoom', () => this.updateClusters())
      this.map.on('move', () => this.updateClusters())
    }
  }

  /**
   * Update cluster visualization based on current map view
   */
  private updateClusters(): void {
    if (!this.map || !this.cluster) return

    const zoom = this.map.getZoom()
    const bounds = this.map.getBounds()
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ]

    const clusters = this.cluster.getClusters(bbox, Math.floor(zoom))
    const source = this.map.getSource(this.JOBS_SOURCE) as maplibregl.GeoJSONSource

    if (source) {
      // Note: For true clustering, we'd update with cluster data
      // For now, keeping full dataset which MapLibre clusters automatically
      source.setData({
        type: 'FeatureCollection',
        features: this.jobFeatures
      })
    }
  }

  /**
   * Update marker highlighting based on highlighted job
   */
  updateHighlighting(highlightedJob: { resource: string; job: string } | null): void {
    this.highlightedJob = highlightedJob

    if (!this.map || !this.map.getSource(this.JOBS_SOURCE)) return

    // Remove all existing feature states
    this.jobFeatures.forEach((feature, index) => {
      this.map?.removeFeatureState({
        source: this.JOBS_SOURCE,
        id: index
      })
    })

    // Apply highlighting using feature state
    this.jobFeatures.forEach((feature, index) => {
      const isHighlighted = highlightedJob &&
        feature.properties.resourceName === highlightedJob.resource &&
        feature.properties.name === highlightedJob.job

      const isDimmed = highlightedJob && !isHighlighted

      if (isHighlighted) {
        this.map?.setFeatureState(
          { source: this.JOBS_SOURCE, id: index },
          { highlighted: true, dimmed: false }
        )
      } else if (isDimmed) {
        this.map?.setFeatureState(
          { source: this.JOBS_SOURCE, id: index },
          { highlighted: false, dimmed: true }
        )
      }
    })
  }

  /**
   * Get marker metadata (for compatibility with existing code)
   */
  getAllMetadata(): Map<any, MarkerMetadata> {
    const metadata = new Map<any, MarkerMetadata>()
    this.jobFeatures.forEach((feature, index) => {
      if (feature.properties.resourceName) {
        metadata.set(index, {
          resource: feature.properties.resourceName,
          job: feature.properties.name
        })
      }
    })
    return metadata
  }

  /**
   * Get all markers (for compatibility)
   */
  getMarkers(): any[] {
    return this.jobFeatures
  }
}
