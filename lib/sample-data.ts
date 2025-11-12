import { Vrp } from "solvice-vrp-solver/resources/vrp/vrp";

export type SampleType =
  | "simple"
  | "lastMile"
  | "fieldService"
  | "homeHealth"
  | "wasteLogistics"
  | "solarMaintenance";

export interface SampleInfo {
  id: SampleType;
  name: string;
  description: string;
  getData: () => Vrp.VrpSyncSolveParams;
}

/**
 * Available sample datasets
 */
export const SAMPLE_DATASETS: SampleInfo[] = [
  {
    id: "simple",
    name: "Simple TSP",
    description: "20 deliveries, 1 vehicle - Basic traveling salesman problem",
    getData: getSimpleTspData,
  },
  {
    id: "lastMile",
    name: "Last Mile Delivery",
    description:
      "100 packages, 2 vehicles - Urban last mile delivery optimization",
    getData: getLastMileDeliveryData,
  },
  {
    id: "fieldService",
    name: "Field Service",
    description:
      "50 jobs, 2 vehicles, 3 shifts - Multi-shift service scheduling",
    getData: getFieldServiceData,
  },
  {
    id: "homeHealth",
    name: "Home Healthcare",
    description:
      "40 patient visits, 3 caregivers - Healthcare scheduling with skills and time windows",
    getData: getHomeHealthData,
  },
  {
    id: "wasteLogistics",
    name: "Waste Collection",
    description:
      "60 collection points, 3 trucks - Municipal waste management with capacity and waste type constraints",
    getData: getWasteLogisticsData,
  },
  {
    id: "solarMaintenance",
    name: "Solar Maintenance",
    description:
      "24 solar installations, 8 technicians - Boston area solar maintenance with skills, priorities, and time windows",
    getData: getSolarMaintenanceData,
  },
];

/**
 * Get sample data by type
 */
export function getSampleVrpData(
  type: SampleType = "simple",
): Vrp.VrpSyncSolveParams {
  const sample = SAMPLE_DATASETS.find((s) => s.id === type);
  return sample ? sample.getData() : getSimpleTspData();
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
 * Last Mile Delivery: Urban package delivery optimization
 * Scenario: 100 packages across Ghent area with 2 delivery vans
 */
function getLastMileDeliveryData(): Vrp.VrpSyncSolveParams {
  // Generate 100 package deliveries spread around Ghent area
  const jobs = [];
  const packageTypes = ["small", "medium", "large"];
  const packageLoads = { small: 1, medium: 3, large: 5 }; // Load units per package type

  for (let i = 1; i <= 100; i++) {
    const packageType =
      packageTypes[Math.floor(Math.random() * packageTypes.length)];
    jobs.push({
      name: `package_${String(i).padStart(3, "0")}`,
      duration: 180 + Math.floor(Math.random() * 240), // 3-7 minutes per delivery
      location: {
        latitude: 51.0 + (Math.random() - 0.5) * 0.2, // Tighter urban area
        longitude: 3.72 + (Math.random() - 0.5) * 0.2, // Around Ghent center
      },
      load: [packageLoads[packageType as keyof typeof packageLoads]],
    });
  }

  return {
    jobs,
    resources: [
      {
        name: "van_east",
        capacity: [150], // Can carry ~50 medium packages
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T18:00:00Z",
            start: { latitude: 51.0538, longitude: 3.725 }, // Ghent depot
            end: { latitude: 51.0538, longitude: 3.725 },
          },
        ],
      },
      {
        name: "van_west",
        capacity: [150], // Can carry ~50 medium packages
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T18:00:00Z",
            start: { latitude: 51.0538, longitude: 3.725 }, // Ghent depot
            end: { latitude: 51.0538, longitude: 3.725 },
          },
        ],
      },
    ],
    options: {
      partialPlanning: true, // Deliver all packages
      minimizeResources: false, // Use both vans efficiently
      polylines: true,
    },
  };
}

/**
 * Field Service: Multi-shift service scheduling with time windows
 * Scenario: 50 service appointments with 2 technicians working 3 shifts each
 */
function getFieldServiceData(): Vrp.VrpSyncSolveParams {
  // Generate 50 service jobs with time windows
  const jobs = [];
  const serviceTypes = [
    { type: "hvac_maintenance", tag: "hvac", hard: true },
    { type: "plumbing_repair", tag: "plumbing", hard: true },
    { type: "electrical_install", tag: "electrical", hard: true },
    { type: "appliance_service", tag: "appliance", hard: false },
    { type: "security_install", tag: "security", hard: true },
    { type: "network_setup", tag: "network", hard: true },
    { type: "solar_maintenance", tag: "solar", hard: true },
    { type: "heating_repair", tag: "hvac", hard: true },
  ];

  for (let i = 1; i <= 50; i++) {
    const service = serviceTypes[i % serviceTypes.length];
    const dayOffset = Math.floor(i / 17); // Distribute jobs across 3 days (Jan 15, 16, 17)
    const startHour = 8 + Math.floor(Math.random() * 9); // 8 AM to 5 PM start times
    const timeWindow = {
      from: `2024-01-${String(15 + dayOffset).padStart(2, "0")}T${String(startHour).padStart(2, "0")}:00:00Z`,
      to: `2024-01-${String(15 + dayOffset).padStart(2, "0")}T${String(startHour + 2).padStart(2, "0")}:00:00Z`, // 2-hour window
    };

    jobs.push({
      name: `${service.type}_${String(i).padStart(2, "0")}`,
      duration: 1800 + Math.floor(Math.random() * 5400), // 30 minutes - 2 hours
      location: {
        latitude: 51.0 + (Math.random() - 0.5) * 0.4, // Larger service area
        longitude: 3.72 + (Math.random() - 0.5) * 0.3,
      },
      windows: [timeWindow],
      tags: [
        {
          name: service.tag,
          hard: service.hard,
          weight: service.hard ? undefined : 3600, // 1 hour penalty for soft constraints
        },
      ],
    });
  }

  return {
    jobs,
    resources: [
      {
        name: "technician_alice",
        tags: ["hvac", "plumbing", "electrical", "appliance"], // Multi-skilled technician
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T17:00:00Z",
            start: { latitude: 50.99, longitude: 3.81 },
            end: { latitude: 50.99, longitude: 3.81 },
          }, // Day 1
          {
            from: "2024-01-16T08:00:00Z",
            to: "2024-01-16T17:00:00Z",
            start: { latitude: 50.99, longitude: 3.81 },
            end: { latitude: 50.99, longitude: 3.81 },
          }, // Day 2
          {
            from: "2024-01-17T08:00:00Z",
            to: "2024-01-17T17:00:00Z",
            start: { latitude: 50.99, longitude: 3.81 },
            end: { latitude: 50.99, longitude: 3.81 },
          }, // Day 3
        ],
      },
      {
        name: "technician_bob",
        tags: ["electrical", "network", "security", "solar", "appliance"], // Tech specialist
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T17:00:00Z",
            start: { latitude: 50.99, longitude: 3.81 },
            end: { latitude: 50.99, longitude: 3.81 },
          }, // Day 1
          {
            from: "2024-01-16T08:00:00Z",
            to: "2024-01-16T17:00:00Z",
            start: { latitude: 50.99, longitude: 3.81 },
            end: { latitude: 50.99, longitude: 3.81 },
          }, // Day 2
          {
            from: "2024-01-17T08:00:00Z",
            to: "2024-01-17T17:00:00Z",
            start: { latitude: 50.99, longitude: 3.81 },
            end: { latitude: 50.99, longitude: 3.81 },
          }, // Day 3
        ],
      },
    ],
    options: {
      partialPlanning: true, // Try to schedule all jobs
      minimizeResources: false,
      polylines: true,
    },
  };
}

/**
 * Home Healthcare: Patient visit scheduling with caregiver skills
 * Scenario: 40 patient visits with 3 caregivers providing different types of care
 */
function getHomeHealthData(): Vrp.VrpSyncSolveParams {
  const jobs = [];
  const careTypes = [
    { type: "wound_care", tag: "nursing", duration: 2400, hard: true },
    { type: "medication_admin", tag: "nursing", duration: 1800, hard: true },
    {
      type: "physical_therapy",
      tag: "physical_therapy",
      duration: 3600,
      hard: true,
    },
    {
      type: "occupational_therapy",
      tag: "occupational_therapy",
      duration: 3000,
      hard: true,
    },
    { type: "vital_check", tag: "nursing", duration: 1200, hard: false },
    { type: "companionship", tag: "basic_care", duration: 3600, hard: false },
    { type: "meal_prep", tag: "basic_care", duration: 1800, hard: false },
    { type: "bathing_assist", tag: "basic_care", duration: 2400, hard: false },
  ];

  for (let i = 1; i <= 40; i++) {
    const care = careTypes[i % careTypes.length];
    const startHour = 8 + Math.floor(Math.random() * 8); // 8 AM to 4 PM start times
    const preferredCaregiver =
      i % 3 === 0
        ? "caregiver_alice"
        : i % 3 === 1
          ? "caregiver_bob"
          : "caregiver_carol";

    jobs.push({
      name: `patient_${String(i).padStart(2, "0")}_${care.type}`,
      duration: care.duration,
      location: {
        latitude: 51.0 + (Math.random() - 0.5) * 0.15, // Residential area spread
        longitude: 3.72 + (Math.random() - 0.5) * 0.12,
      },
      windows: [
        {
          from: `2024-01-15T${String(startHour).padStart(2, "0")}:00:00Z`,
          to: `2024-01-15T${String(startHour + 3).padStart(2, "0")}:00:00Z`, // 3-hour window
        },
      ],
      tags: [
        {
          name: care.tag,
          hard: care.hard,
          weight: care.hard ? undefined : 1800, // 30 min penalty for soft constraints
        },
      ],
      rankings: [
        {
          name: preferredCaregiver,
          ranking: 10, // Preferred caregiver
        },
      ],
      priority: care.hard ? 2 : 1, // Higher priority for skilled nursing care
    });
  }

  return {
    jobs,
    resources: [
      {
        name: "caregiver_alice",
        tags: ["nursing", "basic_care"], // Registered nurse
        hourlyCost: 45,
        shifts: [
          {
            from: "2024-01-15T07:00:00Z",
            to: "2024-01-15T15:00:00Z",
            start: { latitude: 51.05, longitude: 3.72 },
            end: { latitude: 51.05, longitude: 3.72 },
          },
        ],
      },
      {
        name: "caregiver_bob",
        tags: ["physical_therapy", "basic_care"], // Physical therapist
        hourlyCost: 50,
        shifts: [
          {
            from: "2024-01-15T08:00:00Z",
            to: "2024-01-15T16:00:00Z",
            start: { latitude: 51.04, longitude: 3.73 },
            end: { latitude: 51.04, longitude: 3.73 },
          },
        ],
      },
      {
        name: "caregiver_carol",
        tags: ["occupational_therapy", "nursing", "basic_care"], // Multi-skilled OT/nurse
        hourlyCost: 52,
        shifts: [
          {
            from: "2024-01-15T09:00:00Z",
            to: "2024-01-15T17:00:00Z",
            start: { latitude: 51.06, longitude: 3.71 },
            end: { latitude: 51.06, longitude: 3.71 },
          },
        ],
      },
    ],
    options: {
      partialPlanning: true, // Visit all patients
      minimizeResources: false,
      polylines: true,
    },
    weights: {
      rankingWeight: 1.5, // Consider patient-caregiver preferences
      priorityWeight: 2.0, // Prioritize skilled nursing care
      travelTimeWeight: 1.0,
    },
  };
}

/**
 * Waste Collection: Municipal waste management with capacity constraints
 * Scenario: 60 collection points with 3 specialized waste trucks
 */
function getWasteLogisticsData(): Vrp.VrpSyncSolveParams {
  const jobs = [];
  const wasteTypes = [
    {
      type: "residential_general",
      tag: "general_waste",
      load: 2,
      duration: 300,
    },
    { type: "residential_recycle", tag: "recyclables", load: 1, duration: 240 },
    {
      type: "commercial_general",
      tag: "general_waste",
      load: 5,
      duration: 600,
      timeWindow: true,
    },
    {
      type: "commercial_recycle",
      tag: "recyclables",
      load: 4,
      duration: 480,
      timeWindow: true,
    },
    {
      type: "industrial_waste",
      tag: "general_waste",
      load: 8,
      duration: 900,
      timeWindow: true,
    },
    { type: "organic_waste", tag: "organic", load: 3, duration: 360 },
  ];

  for (let i = 1; i <= 60; i++) {
    const waste = wasteTypes[i % wasteTypes.length];
    const job: Vrp.Job = {
      name: `collection_${String(i).padStart(3, "0")}_${waste.type}`,
      duration: waste.duration,
      location: {
        latitude: 51.0 + (Math.random() - 0.5) * 0.25,
        longitude: 3.72 + (Math.random() - 0.5) * 0.25,
      },
      load: [waste.load],
      tags: [
        {
          name: waste.tag,
          hard: true,
        },
      ],
    };

    // Add time windows for commercial/industrial pickups
    if (waste.timeWindow) {
      const startHour = 7 + Math.floor(Math.random() * 6); // 7 AM to 1 PM
      job.windows = [
        {
          from: `2024-01-15T${String(startHour).padStart(2, "0")}:00:00Z`,
          to: `2024-01-15T${String(startHour + 4).padStart(2, "0")}:00:00Z`,
        },
      ];
    }

    jobs.push(job);
  }

  return {
    jobs,
    resources: [
      {
        name: "truck_general_1",
        tags: ["general_waste"],
        capacity: [100], // Can handle ~20 residential or 12 commercial pickups
        category: "TRUCK",
        hourlyCost: 60,
        shifts: [
          {
            from: "2024-01-15T06:00:00Z",
            to: "2024-01-15T16:00:00Z",
            start: { latitude: 51.0538, longitude: 3.725 }, // Waste depot
            end: { latitude: 51.0538, longitude: 3.725 },
          },
        ],
      },
      {
        name: "truck_recycle_1",
        tags: ["recyclables"],
        capacity: [80], // Can handle ~20 residential or 16 commercial recyclables
        category: "TRUCK",
        hourlyCost: 55,
        shifts: [
          {
            from: "2024-01-15T06:00:00Z",
            to: "2024-01-15T16:00:00Z",
            start: { latitude: 51.0538, longitude: 3.725 },
            end: { latitude: 51.0538, longitude: 3.725 },
          },
        ],
      },
      {
        name: "truck_organic_1",
        tags: ["organic"],
        capacity: [60], // Can handle ~20 organic pickups
        category: "TRUCK",
        hourlyCost: 58,
        shifts: [
          {
            from: "2024-01-15T06:00:00Z",
            to: "2024-01-15T16:00:00Z",
            start: { latitude: 51.0538, longitude: 3.725 },
            end: { latitude: 51.0538, longitude: 3.725 },
          },
        ],
      },
    ],
    options: {
      partialPlanning: true, // Collect all waste
      minimizeResources: false,
      polylines: true,
    },
    weights: {
      travelTimeWeight: 1.0,
      driveTimeWeight: 0.8, // Slight preference for reducing drive time
    },
  };
}

/**
 * Solar Maintenance: Boston area solar panel maintenance scheduling
 * Scenario: 24 solar installations with 8 technicians demonstrating skills matching,
 * priorities, time windows, and home-based routing
 *
 * Key Features:
 * - Skills matching: Commercial jobs require Level 2 certification, battery jobs need specialists
 * - Priority weighting: High-value contracts ($50K) scheduled before smaller jobs
 * - Time windows: 14 customer availability windows to respect customer schedules
 * - Home-based routing: Technicians start from different home locations across Boston metro
 * - Job types: Residential (1.5-2hrs), Commercial (3-4hrs), Battery systems (2-2.5hrs)
 */
function getSolarMaintenanceData(): Vrp.VrpSyncSolveParams {
  return {
    resources: [
      {
        name: "Mike-T1-Senior",
        tags: ["residential", "commercial", "Level2-certified", "battery-install"],
        shifts: [
          {
            from: "2025-11-07T07:00:00Z",
            to: "2025-11-07T17:00:00Z",
            start: {
              latitude: 42.3736,
              longitude: -71.1097,
            },
            end: {
              latitude: 42.3736,
              longitude: -71.1097,
            },
          },
        ],
      },
      {
        name: "Sarah-T2-Residential",
        tags: ["residential"],
        shifts: [
          {
            from: "2025-11-07T08:00:00Z",
            to: "2025-11-07T16:00:00Z",
            start: {
              latitude: 42.3318,
              longitude: -71.1212,
            },
            end: {
              latitude: 42.3318,
              longitude: -71.1212,
            },
          },
        ],
      },
      {
        name: "Carlos-T3-Commercial",
        tags: ["commercial", "Level2-certified"],
        shifts: [
          {
            from: "2025-11-07T07:00:00Z",
            to: "2025-11-07T17:00:00Z",
            start: {
              latitude: 42.3370,
              longitude: -71.2092,
            },
            end: {
              latitude: 42.3370,
              longitude: -71.2092,
            },
          },
        ],
      },
      {
        name: "Jennifer-T4-Battery",
        tags: ["residential", "battery-install"],
        shifts: [
          {
            from: "2025-11-07T08:00:00Z",
            to: "2025-11-07T17:00:00Z",
            start: {
              latitude: 42.2529,
              longitude: -71.0023,
            },
            end: {
              latitude: 42.2529,
              longitude: -71.0023,
            },
          },
        ],
      },
      {
        name: "David-T5-Residential",
        tags: ["residential"],
        shifts: [
          {
            from: "2025-11-07T07:30:00Z",
            to: "2025-11-07T16:30:00Z",
            start: {
              latitude: 42.3765,
              longitude: -71.2356,
            },
            end: {
              latitude: 42.3765,
              longitude: -71.2356,
            },
          },
        ],
      },
      {
        name: "Lisa-T6-AllRound",
        tags: ["residential", "commercial", "Level2-certified"],
        shifts: [
          {
            from: "2025-11-07T07:00:00Z",
            to: "2025-11-07T17:00:00Z",
            start: {
              latitude: 42.3876,
              longitude: -71.0995,
            },
            end: {
              latitude: 42.3876,
              longitude: -71.0995,
            },
          },
        ],
      },
      {
        name: "Tom-T7-Residential",
        tags: ["residential"],
        shifts: [
          {
            from: "2025-11-07T07:00:00Z",
            to: "2025-11-07T16:00:00Z",
            start: {
              latitude: 42.4184,
              longitude: -71.1062,
            },
            end: {
              latitude: 42.4184,
              longitude: -71.1062,
            },
          },
        ],
      },
      {
        name: "Rachel-T8-Battery",
        tags: ["residential", "battery-install"],
        shifts: [
          {
            from: "2025-11-07T08:00:00Z",
            to: "2025-11-07T17:00:00Z",
            start: {
              latitude: 42.3959,
              longitude: -71.1786,
            },
            end: {
              latitude: 42.3959,
              longitude: -71.1786,
            },
          },
        ],
      },
    ],
    jobs: [
      {
        name: "Commercial-Tech-Campus-Cambridge",
        location: {
          latitude: 42.3736,
          longitude: -71.1097,
        },
        duration: 14400, // 4 hours - Commercial job
        tags: [
          {
            name: "commercial",
            hard: true,
          },
          {
            name: "Level2-certified",
            hard: true,
          },
        ],
        priority: 3, // High-priority $50K contract
        urgency: 5, // Critical - must be done early
        windows: [
          {
            from: "2025-11-07T07:00:00Z",
            to: "2025-11-07T10:00:00Z",
          },
        ],
      },
      {
        name: "Residence-Martinez-Boston",
        location: {
          latitude: 42.3601,
          longitude: -71.0589,
        },
        duration: 7200, // 2 hours - Residential
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],
        urgency: 3, // Moderate - customer has limited availability
        windows: [
          {
            from: "2025-11-07T09:00:00Z",
            to: "2025-11-07T13:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Tesla-Battery-Newton",
        location: {
          latitude: 42.3370,
          longitude: -71.2092,
        },
        duration: 9000, // 2.5 hours - Battery system
        tags: [
          {
            name: "residential",
            hard: true,
          },
          {
            name: "battery-install",
            hard: true,
          },
        ],
        priority: 2,
        urgency: 4, // High urgency - new installation

      },
      {
        name: "Residence-Chen-Brookline",
        location: {
          latitude: 42.3318,
          longitude: -71.1212,
        },
        duration: 5400, // 1.5 hours
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],
        windows: [
          {
            from: "2025-11-07T10:00:00Z",
            to: "2025-11-07T14:00:00Z",
          },
        ],

      },
      {
        name: "Commercial-Warehouse-Quincy",
        location: {
          latitude: 42.2529,
          longitude: -71.0023,
        },
        duration: 12600, // 3.5 hours - Commercial
        tags: [
          {
            name: "commercial",
            hard: true,
          },
          {
            name: "Level2-certified",
            hard: true,
          },
        ],
        priority: 2,
        urgency: 4, // Production facility - needs early service
        windows: [
          {
            from: "2025-11-07T07:00:00Z",
            to: "2025-11-07T11:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Johnson-Somerville",
        location: {
          latitude: 42.3876,
          longitude: -71.0995,
        },
        duration: 7200, // 2 hours
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],
        windows: [
          {
            from: "2025-11-07T08:00:00Z",
            to: "2025-11-07T12:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Battery-Revere",
        location: {
          latitude: 42.4085,
          longitude: -71.0119,
        },
        duration: 7800, // 2.2 hours - Battery
        tags: [
          {
            name: "residential",
            hard: true,
          },
          {
            name: "battery-install",
            hard: true,
          },
        ],
        priority: 2,
        urgency: 3, // Battery backup needed soon

      },
      {
        name: "Residence-Smith-Medford",
        location: {
          latitude: 42.4184,
          longitude: -71.1062,
        },
        duration: 5400,
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],

      },
      {
        name: "Residence-Wong-Malden",
        location: {
          latitude: 42.4251,
          longitude: -71.0662,
        },
        duration: 7200,
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],
        windows: [
          {
            from: "2025-11-07T09:00:00Z",
            to: "2025-11-07T15:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Garcia-Watertown",
        location: {
          latitude: 42.3709,
          longitude: -71.1828,
        },
        duration: 7200,
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],
        windows: [
          {
            from: "2025-11-07T11:00:00Z",
            to: "2025-11-07T16:00:00Z",
          },
        ],

      },
      {
        name: "Commercial-Office-Chelsea",
        location: {
          latitude: 42.3918,
          longitude: -71.0328,
        },
        duration: 10800, // 3 hours - Commercial
        tags: [
          {
            name: "commercial",
            hard: true,
          },
          {
            name: "Level2-certified",
            hard: true,
          },
        ],
        priority: 2,
        urgency: 3, // Office building - minimize business disruption
        windows: [
          {
            from: "2025-11-07T08:00:00Z",
            to: "2025-11-07T12:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Patel-Arlington",
        location: {
          latitude: 42.4154,
          longitude: -71.1565,
        },
        duration: 5400,
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],

      },
      {
        name: "Residence-Battery-Lexington",
        location: {
          latitude: 42.4473,
          longitude: -71.2245,
        },
        duration: 9000, // 2.5 hours - Battery
        tags: [
          {
            name: "residential",
            hard: true,
          },
          {
            name: "battery-install",
            hard: true,
          },
        ],
        priority: 2,
        urgency: 4, // Critical - power outage concerns
        windows: [
          {
            from: "2025-11-07T08:00:00Z",
            to: "2025-11-07T13:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Lee-Waltham",
        location: {
          latitude: 42.3765,
          longitude: -71.2356,
        },
        duration: 5400,
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],

      },
      {
        name: "Residence-Taylor-Belmont",
        location: {
          latitude: 42.3959,
          longitude: -71.1786,
        },
        duration: 7200,
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],
        windows: [
          {
            from: "2025-11-07T10:00:00Z",
            to: "2025-11-07T15:00:00Z",
          },
        ],

      },
      {
        name: "Commercial-Retail-Revere",
        location: {
          latitude: 42.4085,
          longitude: -71.0119,
        },
        duration: 10800, // 3 hours - Commercial
        tags: [
          {
            name: "commercial",
            hard: true,
          },
          {
            name: "Level2-certified",
            hard: true,
          },
        ],
        priority: 1,
        windows: [
          {
            from: "2025-11-07T09:00:00Z",
            to: "2025-11-07T13:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Anderson-Brookline",
        location: {
          latitude: 42.3318,
          longitude: -71.1212,
        },
        duration: 5400,
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],

      },
      {
        name: "Residence-Battery-Cambridge",
        location: {
          latitude: 42.3736,
          longitude: -71.1097,
        },
        duration: 7800, // 2.2 hours - Battery
        tags: [
          {
            name: "residential",
            hard: true,
          },
          {
            name: "battery-install",
            hard: true,
          },
        ],
        priority: 1,
        urgency: 2, // Afternoon window - less urgent
        windows: [
          {
            from: "2025-11-07T13:00:00Z",
            to: "2025-11-07T17:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Rodriguez-Dedham",
        location: {
          latitude: 42.2390,
          longitude: -71.1662,
        },
        duration: 7200, // 2 hours
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],
        windows: [
          {
            from: "2025-11-07T08:00:00Z",
            to: "2025-11-07T14:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Thomas-Newton",
        location: {
          latitude: 42.3370,
          longitude: -71.2092,
        },
        duration: 5400, // 1.5 hours
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],

      },
      {
        name: "Commercial-Manufacturing-Quincy",
        location: {
          latitude: 42.2529,
          longitude: -71.0023,
        },
        duration: 12000, // 3.3 hours - Commercial
        tags: [
          {
            name: "commercial",
            hard: true,
          },
          {
            name: "Level2-certified",
            hard: true,
          },
        ],
        priority: 2,
        urgency: 5, // Critical - manufacturing downtime costs
        windows: [
          {
            from: "2025-11-07T07:00:00Z",
            to: "2025-11-07T10:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Wilson-Milton",
        location: {
          latitude: 42.2493,
          longitude: -71.0662,
        },
        duration: 7200, // 2 hours
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],
        windows: [
          {
            from: "2025-11-07T11:00:00Z",
            to: "2025-11-07T16:00:00Z",
          },
        ],

      },
      {
        name: "Residence-Brown-Somerville",
        location: {
          latitude: 42.3876,
          longitude: -71.0995,
        },
        duration: 5400, // 1.5 hours
        tags: [
          {
            name: "residential",
            hard: true,
          },
        ],

      },
      {
        name: "Residence-Battery-Needham",
        location: {
          latitude: 42.2834,
          longitude: -71.2331,
        },
        duration: 9000, // 2.5 hours - Battery
        tags: [
          {
            name: "residential",
            hard: true,
          },
          {
            name: "battery-install",
            hard: true,
          },
        ],
        priority: 2,
        urgency: 3, // System upgrade needed soon
        windows: [
          {
            from: "2025-11-07T09:00:00Z",
            to: "2025-11-07T14:00:00Z",
          },
        ],

      },
    ],
    options: {
      partialPlanning: false, // Complete all jobs - cannot leave customers unserviced
      polylines: true,
    },
    weights: {
      priorityWeight: 10.0, // Strong preference for high-value contracts
      urgencyWeight: 5.0, // Schedule urgent jobs earlier in the day
      driveTimeWeight: 1.0, // Minimize drive time
    },
  };
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
