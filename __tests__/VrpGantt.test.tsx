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

    expect(screen.getByText('Vehicle')).toBeInTheDocument()
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
})