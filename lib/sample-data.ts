import { Vrp } from "solvice-vrp-solver/resources/vrp/vrp";

export type SampleType = 'simple' | 'big' | 'fieldService' | 'polylines'

export interface SampleInfo {
  id: SampleType
  name: string
  description: string
  getData: () => Vrp.VrpSyncSolveParams
}

/**
 * Available sample datasets
 */
export const SAMPLE_DATASETS: SampleInfo[] = [
  {
    id: 'simple',
    name: 'Simple TSP',
    description: '20 deliveries, 1 vehicle - Basic traveling salesman problem',
    getData: getSimpleTspData
  },
  {
    id: 'big',
    name: 'Big Request',
    description: '100 jobs, 3 vehicles - Large-scale routing optimization',
    getData: getBigRequestData
  },
  {
    id: 'fieldService',
    name: 'Field Service',
    description: '50 jobs, 2 vehicles, 3 shifts - Multi-shift service scheduling',
    getData: getFieldServiceData
  },
  {
    id: 'polylines',
    name: 'Route Polylines',
    description: '15 deliveries, 1 vehicle with actual road geometry',
    getData: getPolylinesData
  }
]

/**
 * Get sample data by type
 */
export function getSampleVrpData(type: SampleType = 'simple'): Vrp.VrpSyncSolveParams {
  const sample = SAMPLE_DATASETS.find(s => s.id === type)
  return sample ? sample.getData() : getSimpleTspData()
}

/**
 * Simple TSP: Basic traveling salesman problem
 * Scenario: Ghent delivery service with 1 vehicle and 20 delivery locations
 */
function getSimpleTspData(): Vrp.VrpSyncSolveParams {
  return {
    jobs: [
      {
        name: "delivery_gravensteen",
        duration: 900,
        location: {
          latitude: 51.0573,
          longitude: 3.7197,
        },
      },
      {
        name: "delivery_belfry_ghent",
        duration: 600,
        location: {
          latitude: 51.0538,
          longitude: 3.725,
        },
      },
      {
        name: "delivery_saint_bavos_cathedral",
        duration: 1200,
        location: {
          latitude: 51.0536,
          longitude: 3.7264,
        },
      },
      {
        name: "delivery_korenlei",
        duration: 900,
        location: {
          latitude: 51.0565,
          longitude: 3.7206,
        },
      },
      {
        name: "delivery_ghent_university",
        duration: 800,
        location: {
          latitude: 51.0524,
          longitude: 3.7286,
        },
      },
      {
        name: "delivery_vrijdagmarkt",
        duration: 700,
        location: {
          latitude: 51.059,
          longitude: 3.718,
        },
      },
      {
        name: "delivery_citadel_park",
        duration: 1000,
        location: {
          latitude: 51.0355,
          longitude: 3.7176,
        },
      },
      {
        name: "delivery_patershol",
        duration: 600,
        location: {
          latitude: 51.0602,
          longitude: 3.7145,
        },
      },
      {
        name: "delivery_portus_ganda",
        duration: 850,
        location: {
          latitude: 51.0434,
          longitude: 3.7102,
        },
      },
      {
        name: "delivery_muinkpark",
        duration: 750,
        location: {
          latitude: 51.0339,
          longitude: 3.7298,
        },
      },
      {
        name: "delivery_kouter_square",
        duration: 650,
        location: {
          latitude: 51.0475,
          longitude: 3.7289,
        },
      },
      {
        name: "delivery_saint_peters_abbey",
        duration: 900,
        location: {
          latitude: 51.0326,
          longitude: 3.7226,
        },
      },
      {
        name: "delivery_sint_jacobs_church",
        duration: 550,
        location: {
          latitude: 51.0548,
          longitude: 3.7175,
        },
      },
      {
        name: "delivery_ghent_station",
        duration: 800,
        location: {
          latitude: 51.0357,
          longitude: 3.7098,
        },
      },
      {
        name: "delivery_bijloke_site",
        duration: 950,
        location: {
          latitude: 51.0423,
          longitude: 3.7054,
        },
      },
      {
        name: "delivery_dampoort_station",
        duration: 700,
        location: {
          latitude: 51.0686,
          longitude: 3.7464,
        },
      },
    ],
    resources: [
      {
        name: "vehicle_north",
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T18:00:00Z",
            start: {
              latitude: 50.99,
              longitude: 3.81,
            },
            end: {
              latitude: 50.99,
              longitude: 3.81,
            },
          },
        ],
      },
    ],
    options: {
      partialPlanning: true,
      minimizeResources: true,
      polylines: true,
    },
  };
}

/**
 * Big Request: Large-scale routing optimization
 * Scenario: 100 jobs across greater Ghent area with 3 vehicles
 */
function getBigRequestData(): Vrp.VrpSyncSolveParams {
  // Generate 100 jobs spread around Ghent area (51.0 ± 0.15, 3.7 ± 0.25)
  const jobs = []
  const baseNames = [
    'delivery', 'pickup', 'service', 'maintenance', 'installation', 'repair',
    'consultation', 'inspection', 'cleaning', 'transport'
  ]
  
  for (let i = 1; i <= 100; i++) {
    const baseName = baseNames[i % baseNames.length]
    jobs.push({
      name: `${baseName}_${String(i).padStart(3, '0')}`,
      duration: 300 + Math.floor(Math.random() * 1200), // 5-25 minutes
      location: {
        latitude: 51.0 + (Math.random() - 0.5) * 0.3, // 50.85 to 51.15
        longitude: 3.7 + (Math.random() - 0.5) * 0.5   // 3.45 to 3.95
      }
    })
  }

  return {
    jobs,
    resources: [
      {
        name: "vehicle_alpha",
        shifts: [{ from: "2024-01-15T06:00:00Z", to: "2024-01-15T20:00:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }]
      },
      {
        name: "vehicle_beta", 
        shifts: [{ from: "2024-01-15T06:00:00Z", to: "2024-01-15T20:00:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }]
      },
      {
        name: "vehicle_gamma",
        shifts: [{ from: "2024-01-15T06:00:00Z", to: "2024-01-15T20:00:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }]
      }
    ],
    options: {
      partialPlanning: true,
      minimizeResources: true,
      polylines: true
    }
  }
}

/**
 * Field Service: Multi-shift service scheduling with time windows
 * Scenario: 50 service appointments with 2 technicians working 3 shifts each
 */
function getFieldServiceData(): Vrp.VrpSyncSolveParams {
  // Generate 50 service jobs with time windows
  const jobs = []
  const serviceTypes = [
    'hvac_maintenance', 'plumbing_repair', 'electrical_install', 'appliance_service',
    'security_install', 'network_setup', 'solar_maintenance', 'heating_repair'
  ]
  
  for (let i = 1; i <= 50; i++) {
    const serviceType = serviceTypes[i % serviceTypes.length]
    const startHour = 8 + Math.floor(Math.random() * 9) // 8 AM to 5 PM start times
    const timeWindow = {
      from: `2024-01-15T${String(startHour).padStart(2, '0')}:00:00Z`,
      to: `2024-01-15T${String(startHour + 2).padStart(2, '0')}:00:00Z` // 2-hour window
    }
    
    jobs.push({
      name: `${serviceType}_${String(i).padStart(2, '0')}`,
      duration: 1800 + Math.floor(Math.random() * 3600), // 30-90 minutes
      location: {
        latitude: 51.0 + (Math.random() - 0.5) * 0.2,   // Closer to city center
        longitude: 3.72 + (Math.random() - 0.5) * 0.15
      },
      timeWindows: [timeWindow]
    })
  }

  return {
    jobs,
    resources: [
      {
        name: "technician_alice",
        shifts: [
          { from: "2024-01-15T07:00:00Z", to: "2024-01-15T15:00:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }, // Morning shift
          { from: "2024-01-15T15:30:00Z", to: "2024-01-15T23:30:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }, // Evening shift  
          { from: "2024-01-16T06:00:00Z", to: "2024-01-16T14:00:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }  // Next day morning
        ]
      },
      {
        name: "technician_bob",
        shifts: [
          { from: "2024-01-15T08:00:00Z", to: "2024-01-15T16:00:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }, // Day shift
          { from: "2024-01-15T16:30:00Z", to: "2024-01-16T00:30:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }, // Night shift
          { from: "2024-01-16T07:00:00Z", to: "2024-01-16T15:00:00Z", start: { latitude: 50.99, longitude: 3.81 }, end: { latitude: 50.99, longitude: 3.81 } }  // Next day shift
        ]
      }
    ],
    options: {
      partialPlanning: false, // Try to schedule all jobs
      minimizeResources: false,
      polylines: true
    }
  }
}

/**
 * Get polylines-enabled sample data - similar to simple TSP but with polylines option
 */
function getPolylinesData(): Vrp.VrpSyncSolveParams {
  return {
    jobs: [
      { name: "Brussels", duration: 900, location: { latitude: 50.8465, longitude: 4.3517 } },
      { name: "Antwerp", duration: 900, location: { latitude: 51.2213, longitude: 4.4051 } },
      { name: "Ghent", duration: 900, location: { latitude: 51.0538, longitude: 3.7250 } },
      { name: "Bruges", duration: 900, location: { latitude: 51.2092, longitude: 3.2244 } },
      { name: "Leuven", duration: 900, location: { latitude: 50.8798, longitude: 4.7005 } },
      { name: "Mechelen", duration: 900, location: { latitude: 51.0281, longitude: 4.4778 } },
      { name: "Aalst", duration: 900, location: { latitude: 50.9365, longitude: 4.0435 } },
      { name: "Sint-Niklaas", duration: 900, location: { latitude: 51.1668, longitude: 4.1437 } },
      { name: "Dendermonde", duration: 900, location: { latitude: 51.0281, longitude: 4.1016 } },
      { name: "Kortrijk", duration: 900, location: { latitude: 50.8275, longitude: 3.2647 } },
      { name: "Ostend", duration: 900, location: { latitude: 51.2172, longitude: 2.9083 } },
      { name: "Roeselare", duration: 900, location: { latitude: 50.9494, longitude: 3.1228 } },
      { name: "Turnhout", duration: 900, location: { latitude: 51.3226, longitude: 4.9447 } },
      { name: "Hasselt", duration: 900, location: { latitude: 50.9307, longitude: 5.3378 } },
      { name: "Genk", duration: 900, location: { latitude: 50.9658, longitude: 5.4978 } }
    ],
    resources: [
      {
        name: "delivery_truck",
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T18:00:00Z",
            start: { latitude: 50.8465, longitude: 4.3517 }, // Start in Brussels
            end: { latitude: 50.8465, longitude: 4.3517 }     // Return to Brussels
          }
        ]
      }
    ],
    options: {
      polylines: true  // Enable polyline geometry in response
    }
  }
}

/**
 * Get a simplified version for quick testing
 */
export function getMinimalSampleData(): Vrp.VrpSyncSolveParams {
  return {
    jobs: [
      {
        name: "simple_delivery_ghent",
        duration: 900,
        location: {
          latitude: 51.0538,
          longitude: 3.725,
        },
      },
    ],
    resources: [
      {
        name: "simple_vehicle",
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T18:00:00Z",
            start: {
              latitude: 50.95,
              longitude: 3.81,
            },
            end: {
              latitude: 50.95,
              longitude: 3.81,
            },
          },
        ],
      },
    ],
  };
}
