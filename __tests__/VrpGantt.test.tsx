import { render, screen } from '@testing-library/react'
import { VrpGantt } from '@/components/VrpGantt'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

// Mock minimal VRP data
const mockRequestData = {
  jobs: [
    { name: 'Job 1', location: { longitude: 3.7, latitude: 51.0 } },
    { name: 'Job 2', location: { longitude: 3.8, latitude: 51.1 } }
  ],
  resources: [
    {
      name: 'Vehicle 1',
      shifts: [
        {
          start: { longitude: 3.7, latitude: 51.0 }
        }
      ]
    }
  ]
}

const mockResponseData: Vrp.OnRouteResponse = {
  trips: [
    {
      resource: 'Vehicle 1',
      visits: [
        {
          job: 'Job 1',
          arrival: '2024-01-01T08:00:00Z',
          departure: '2024-01-01T08:30:00Z',
          serviceTime: 1800
        },
        {
          job: 'Job 2',
          arrival: '2024-01-01T09:00:00Z',
          departure: '2024-01-01T09:15:00Z',
          serviceTime: 900
        }
      ]
    }
  ]
}

describe('VrpGantt', () => {
  it('renders empty state when no response data', () => {
    render(
      <VrpGantt
        requestData={mockRequestData}
        responseData={null}
      />
    )

    expect(screen.getByText(/no route data available/i)).toBeInTheDocument()
  })

  it('renders timeline with vehicle rows when response data exists', () => {
    render(
      <VrpGantt
        requestData={mockRequestData}
        responseData={mockResponseData}
      />
    )

    // Check for date navigation instead of removed title
    expect(screen.getByLabelText('Previous date')).toBeInTheDocument()
    expect(screen.getByLabelText('Next date')).toBeInTheDocument()
    expect(screen.getByText('Vehicle 1')).toBeInTheDocument()
  })

  it('displays job activities on timeline', () => {
    render(
      <VrpGantt
        requestData={mockRequestData}
        responseData={mockResponseData}
      />
    )

    expect(screen.getByText('Job 1')).toBeInTheDocument()
    expect(screen.getByText('Job 2')).toBeInTheDocument()
  })

  it('renders time header with hour markers', () => {
    render(
      <VrpGantt
        requestData={mockRequestData}
        responseData={mockResponseData}
      />
    )

    expect(screen.getByText('Resource')).toBeInTheDocument()
  })

  it('handles empty trips array', () => {
    const emptyResponse: Vrp.OnRouteResponse = {
      trips: []
    }

    render(
      <VrpGantt
        requestData={mockRequestData}
        responseData={emptyResponse}
      />
    )

    expect(screen.getByText(/no route data available/i)).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <VrpGantt
        requestData={mockRequestData}
        responseData={mockResponseData}
        className="custom-class"
      />
    )

    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('handles visits without arrival times gracefully', () => {
    const responseWithoutTimes: Vrp.OnRouteResponse = {
      trips: [
        {
          resource: 'Vehicle 1',
          visits: [
            {
              job: 'Job 1'
            }
          ]
        }
      ]
    }

    render(
      <VrpGantt
        requestData={mockRequestData}
        responseData={responseWithoutTimes}
      />
    )

    expect(screen.getByText(/unable to generate timeline/i)).toBeInTheDocument()
  })

  it('renders multiple vehicle rows', () => {
    const multiVehicleResponse: Vrp.OnRouteResponse = {
      trips: [
        {
          resource: 'Vehicle 1',
          visits: [
            {
              job: 'Job 1',
              arrival: '2024-01-01T08:00:00Z',
              departure: '2024-01-01T08:30:00Z'
            }
          ]
        },
        {
          resource: 'Vehicle 2',
          visits: [
            {
              job: 'Job 2',
              arrival: '2024-01-01T08:00:00Z',
              departure: '2024-01-01T08:45:00Z'
            }
          ]
        }
      ]
    }

    render(
      <VrpGantt
        requestData={mockRequestData}
        responseData={multiVehicleResponse}
      />
    )

    expect(screen.getByText('Vehicle 1')).toBeInTheDocument()
    expect(screen.getByText('Vehicle 2')).toBeInTheDocument()
  })

  describe('Tag Matching', () => {
    it('shows perfect match when all tags are matched', () => {
      const requestWithTags = {
        jobs: [
          {
            name: 'Job 1',
            location: { longitude: 3.7, latitude: 51.0 },
            tags: [
              { name: 'electrical', hard: true },
              { name: 'certified', hard: true }
            ]
          }
        ],
        resources: [
          {
            name: 'Technician 1',
            tags: ['electrical', 'certified', 'plumbing']
          }
        ]
      }

      const responseWithTags: Vrp.OnRouteResponse = {
        trips: [
          {
            resource: 'Technician 1',
            visits: [
              {
                job: 'Job 1',
                arrival: '2024-01-01T08:00:00Z',
                serviceTime: 1800
              }
            ]
          }
        ]
      }

      render(
        <VrpGantt
          requestData={requestWithTags}
          responseData={responseWithTags}
        />
      )

      // Should not show a badge indicator for perfect match
      const badges = screen.queryAllByRole('status')
      const violationBadges = badges.filter(badge =>
        badge.getAttribute('aria-label')?.includes('violation')
      )
      expect(violationBadges).toHaveLength(0)
    })

    it('shows soft constraint violation badge when soft tag is missing', () => {
      const requestWithSoftTag = {
        jobs: [
          {
            name: 'Job 1',
            location: { longitude: 3.7, latitude: 51.0 },
            tags: [
              { name: 'electrical', hard: true },
              { name: 'senior', hard: false } // Soft constraint
            ]
          }
        ],
        resources: [
          {
            name: 'Technician 1',
            tags: ['electrical'] // Missing 'senior' soft tag
          }
        ]
      }

      const responseWithSoftViolation: Vrp.OnRouteResponse = {
        trips: [
          {
            resource: 'Technician 1',
            visits: [
              {
                job: 'Job 1',
                arrival: '2024-01-01T08:00:00Z',
                serviceTime: 1800
              }
            ]
          }
        ]
      }

      render(
        <VrpGantt
          requestData={requestWithSoftTag}
          responseData={responseWithSoftViolation}
        />
      )

      // Should show a badge with soft violation indicator
      const violationBadge = screen.getByLabelText('Soft constraint violation')
      expect(violationBadge).toBeInTheDocument()
    })

    it('shows hard constraint violation badge when hard tag is missing', () => {
      const requestWithHardTag = {
        jobs: [
          {
            name: 'Job 1',
            location: { longitude: 3.7, latitude: 51.0 },
            tags: [
              { name: 'electrical', hard: true },
              { name: 'certified', hard: true }
            ]
          }
        ],
        resources: [
          {
            name: 'Technician 1',
            tags: ['electrical'] // Missing 'certified' hard tag
          }
        ]
      }

      const responseWithHardViolation: Vrp.OnRouteResponse = {
        trips: [
          {
            resource: 'Technician 1',
            visits: [
              {
                job: 'Job 1',
                arrival: '2024-01-01T08:00:00Z',
                serviceTime: 1800
              }
            ]
          }
        ]
      }

      render(
        <VrpGantt
          requestData={requestWithHardTag}
          responseData={responseWithHardViolation}
        />
      )

      // Should show a badge with hard violation indicator
      const violationBadge = screen.getByLabelText('Hard constraint violation')
      expect(violationBadge).toBeInTheDocument()
    })

    it('handles jobs without tag requirements', () => {
      const requestWithoutTags = {
        jobs: [
          {
            name: 'Job 1',
            location: { longitude: 3.7, latitude: 51.0 }
            // No tags
          }
        ],
        resources: [
          {
            name: 'Technician 1',
            tags: ['electrical', 'certified']
          }
        ]
      }

      const responseWithoutTags: Vrp.OnRouteResponse = {
        trips: [
          {
            resource: 'Technician 1',
            visits: [
              {
                job: 'Job 1',
                arrival: '2024-01-01T08:00:00Z',
                serviceTime: 1800
              }
            ]
          }
        ]
      }

      render(
        <VrpGantt
          requestData={requestWithoutTags}
          responseData={responseWithoutTags}
        />
      )

      // Should not show any violation badges
      const badges = screen.queryAllByRole('status')
      const violationBadges = badges.filter(badge =>
        badge.getAttribute('aria-label')?.includes('violation')
      )
      expect(violationBadges).toHaveLength(0)
    })

    it('handles resources without tags', () => {
      const requestResourceNoTags = {
        jobs: [
          {
            name: 'Job 1',
            location: { longitude: 3.7, latitude: 51.0 },
            tags: [{ name: 'electrical', hard: true }]
          }
        ],
        resources: [
          {
            name: 'Technician 1'
            // No tags
          }
        ]
      }

      const responseResourceNoTags: Vrp.OnRouteResponse = {
        trips: [
          {
            resource: 'Technician 1',
            visits: [
              {
                job: 'Job 1',
                arrival: '2024-01-01T08:00:00Z',
                serviceTime: 1800
              }
            ]
          }
        ]
      }

      render(
        <VrpGantt
          requestData={requestResourceNoTags}
          responseData={responseResourceNoTags}
        />
      )

      // Should show hard violation badge since resource has no tags
      const violationBadge = screen.getByLabelText('Hard constraint violation')
      expect(violationBadge).toBeInTheDocument()
    })
  })
})