import { Entity, Widgets } from '@openai/chatkit-react';
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp';

/**
 * Convert a VRP job to a ChatKit entity for @mentions
 */
export function createJobEntity(
  job: Vrp.Job,
  index: number
): Entity {
  const jobName = job.name || `job_${index}`;
  const location = job.location;
  const lat = location && 'latitude' in location ? location.latitude : undefined;
  const lon = location && 'longitude' in location ? location.longitude : undefined;

  return {
    id: `job_${jobName}`,
    title: jobName,
    icon: 'map-pin',
    interactive: true,
    group: 'Jobs',
    data: {
      type: 'job',
      name: jobName,
      duration: String(job.duration || 0),
      latitude: lat ? String(lat) : '',
      longitude: lon ? String(lon) : '',
      priority: job.priority ? String(job.priority) : '1',
      tags: job.tags ? job.tags.map(t => t.name).join(', ') : '',
      windows: job.windows ? JSON.stringify(job.windows) : '',
    },
  };
}

/**
 * Convert a VRP resource to a ChatKit entity for @mentions
 */
export function createResourceEntity(
  resource: Vrp.Resource,
  index: number
): Entity {
  const resourceName = resource.name || `resource_${index}`;
  const capacity = resource.capacity ? resource.capacity.join(', ') : '';
  const tags = resource.tags ? resource.tags.join(', ') : '';
  const shiftCount = resource.shifts?.length || 0;

  return {
    id: `resource_${resourceName}`,
    title: resourceName,
    icon: 'suitcase',
    interactive: true,
    group: 'Resources',
    data: {
      type: 'resource',
      name: resourceName,
      capacity,
      tags,
      shiftCount: String(shiftCount),
      category: resource.category || '',
      hourlyCost: resource.hourlyCost ? String(resource.hourlyCost) : '',
    },
  };
}

/**
 * Search for entities matching a query string
 */
export function searchEntities(
  query: string,
  vrpData?: Vrp.VrpSyncSolveParams
): Entity[] {
  if (!vrpData) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const entities: Entity[] = [];

  // Search jobs
  if (vrpData.jobs) {
    vrpData.jobs.forEach((job, index) => {
      const jobName = job.name || `job_${index}`;
      if (jobName.toLowerCase().includes(normalizedQuery)) {
        entities.push(createJobEntity(job, index));
      }
    });
  }

  // Search resources
  if (vrpData.resources) {
    vrpData.resources.forEach((resource, index) => {
      const resourceName = resource.name || `resource_${index}`;
      if (resourceName.toLowerCase().includes(normalizedQuery)) {
        entities.push(createResourceEntity(resource, index));
      }
    });
  }

  // Limit results to avoid overwhelming the UI
  return entities.slice(0, 20);
}

/**
 * Format a job entity preview using ChatKit Widget format
 */
export function formatJobPreview(entity: Entity): { preview: Widgets.BasicRoot | null } {
  const data = entity.data || {};

  const children: Widgets.WidgetComponent[] = [
    { type: 'Title', value: `Job: ${entity.title}` },
  ];

  if (data.latitude && data.longitude) {
    children.push({
      type: 'Text',
      value: `📍 Location: ${Number(data.latitude).toFixed(4)}, ${Number(data.longitude).toFixed(4)}`,
    });
  }

  if (data.duration) {
    const durationMin = Math.round(Number(data.duration) / 60);
    children.push({
      type: 'Text',
      value: `⏱️ Duration: ${durationMin} minutes`,
    });
  }

  if (data.priority && data.priority !== '1') {
    children.push({
      type: 'Text',
      value: `⭐ Priority: ${data.priority}`,
    });
  }

  if (data.tags) {
    children.push({
      type: 'Text',
      value: `🏷️ Tags: ${data.tags}`,
    });
  }

  if (data.windows) {
    try {
      const windows = JSON.parse(data.windows);
      if (windows.length > 0) {
        const firstWindow = windows[0];
        children.push({
          type: 'Text',
          value: `🕒 Time Window: ${new Date(firstWindow.from).toLocaleTimeString()} - ${new Date(firstWindow.to).toLocaleTimeString()}`,
        });
      }
    } catch {
      // Ignore parsing errors
    }
  }

  return {
    preview: {
      type: 'Basic',
      children,
    },
  };
}

/**
 * Format a resource entity preview using ChatKit Widget format
 */
export function formatResourcePreview(entity: Entity): { preview: Widgets.BasicRoot | null } {
  const data = entity.data || {};

  const children: Widgets.WidgetComponent[] = [
    { type: 'Title', value: `Resource: ${entity.title}` },
  ];

  if (data.category) {
    children.push({
      type: 'Text',
      value: `🚛 Category: ${data.category}`,
    });
  }

  if (data.capacity) {
    children.push({
      type: 'Text',
      value: `📦 Capacity: ${data.capacity}`,
    });
  }

  if (data.shiftCount) {
    children.push({
      type: 'Text',
      value: `📅 Shifts: ${data.shiftCount}`,
    });
  }

  if (data.tags) {
    children.push({
      type: 'Text',
      value: `🏷️ Tags: ${data.tags}`,
    });
  }

  if (data.hourlyCost) {
    children.push({
      type: 'Text',
      value: `💰 Hourly Cost: $${data.hourlyCost}`,
    });
  }

  return {
    preview: {
      type: 'Basic',
      children,
    },
  };
}

/**
 * Format entity preview based on entity type
 */
export function formatEntityPreview(entity: Entity): { preview: Widgets.BasicRoot | null } {
  const entityType = entity.data?.type;

  if (entityType === 'job') {
    return formatJobPreview(entity);
  } else if (entityType === 'resource') {
    return formatResourcePreview(entity);
  }

  // Fallback for unknown types
  return {
    preview: {
      type: 'Basic',
      children: [
        { type: 'Title', value: entity.title },
        { type: 'Text', value: 'Entity details not available' },
      ],
    },
  };
}
