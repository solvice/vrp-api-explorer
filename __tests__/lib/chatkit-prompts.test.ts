/**
 * Tests for ChatKit dynamic start screen prompt generation
 */

import { generateStartScreen } from '@/lib/chatkit-prompts';
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp';

describe('chatkit-prompts', () => {
  describe('generateStartScreen', () => {
    it('should generate default prompts when no data provided', () => {
      const result = generateStartScreen();

      expect(result.greeting).toBe(
        'I can help you analyze and optimize vehicle routing problems. What would you like to explore?'
      );
      expect(result.prompts).toHaveLength(4);
      expect(result.prompts.some((p) => p.label === 'What can you do?')).toBe(true);
    });

    it('should generate pre-solve prompts when VRP data exists but no solution', () => {
      const vrpData: Vrp.VrpSyncSolveParams = {
        jobs: [
          { id: '1', location: { lat: 0, lon: 0 } },
          { id: '2', location: { lat: 1, lon: 1 } },
        ],
        resources: [{ id: 'v1', start: { lat: 0, lon: 0 } }],
      };

      const result = generateStartScreen(vrpData);

      expect(result.greeting).toContain('2 jobs');
      expect(result.greeting).toContain('1 vehicle');
      expect(result.prompts.some((p) => p.label === 'Analyze problem')).toBe(true);
      expect(result.prompts.some((p) => p.label === 'What constraints?')).toBe(true);
    });

    it('should generate solution-specific prompts when solution exists', () => {
      const vrpData: Vrp.VrpSyncSolveParams = {
        jobs: [
          { id: '1', location: { lat: 0, lon: 0 } },
          { id: '2', location: { lat: 1, lon: 1 } },
        ],
        resources: [{ id: 'v1', start: { lat: 0, lon: 0 } }],
      };

      const solution: Vrp.OnRouteResponse = {
        id: 'test-solution',
        trips: [],
      };

      const result = generateStartScreen(vrpData, solution);

      expect(result.greeting).toContain('routing solution');
      expect(result.prompts.some((p) => p.label === 'Explain solution')).toBe(true);
      expect(result.prompts.some((p) => p.label === 'Improve solution')).toBe(true);
    });

    it('should suggest reducing travel time for large problems with solution', () => {
      const vrpData: Vrp.VrpSyncSolveParams = {
        jobs: Array.from({ length: 10 }, (_, i) => ({
          id: `job-${i}`,
          location: { lat: i, lon: i },
        })),
        resources: [{ id: 'v1', start: { lat: 0, lon: 0 } }],
      };

      const solution: Vrp.OnRouteResponse = {
        id: 'test-solution',
        trips: [],
      };

      const result = generateStartScreen(vrpData, solution);

      expect(result.prompts.some((p) => p.label === 'Reduce travel time')).toBe(true);
    });

    it('should suggest balancing workload for multiple vehicles with solution', () => {
      const vrpData: Vrp.VrpSyncSolveParams = {
        jobs: [{ id: '1', location: { lat: 0, lon: 0 } }],
        resources: [
          { id: 'v1', start: { lat: 0, lon: 0 } },
          { id: 'v2', start: { lat: 1, lon: 1 } },
        ],
      };

      const solution: Vrp.OnRouteResponse = {
        id: 'test-solution',
        trips: [],
      };

      const result = generateStartScreen(vrpData, solution);

      expect(result.prompts.some((p) => p.label === 'Balance workload')).toBe(true);
    });

    it('should suggest adding constraints when none exist', () => {
      const vrpData: Vrp.VrpSyncSolveParams = {
        jobs: [{ id: '1', location: { lat: 0, lon: 0 } }],
        resources: [{ id: 'v1', start: { lat: 0, lon: 0 } }],
      };

      const result = generateStartScreen(vrpData);

      expect(result.prompts.some((p) => p.label === 'Add constraints')).toBe(true);
    });

    it('should suggest simplifying for very large problems', () => {
      const vrpData: Vrp.VrpSyncSolveParams = {
        jobs: Array.from({ length: 15 }, (_, i) => ({
          id: `job-${i}`,
          location: { lat: i, lon: i },
        })),
        resources: [{ id: 'v1', start: { lat: 0, lon: 0 } }],
      };

      const result = generateStartScreen(vrpData);

      expect(result.prompts.some((p) => p.label === 'Simplify problem')).toBe(true);
    });

    it('should limit prompts to 4 items', () => {
      const vrpData: Vrp.VrpSyncSolveParams = {
        jobs: Array.from({ length: 20 }, (_, i) => ({
          id: `job-${i}`,
          location: { lat: i, lon: i },
        })),
        resources: [
          { id: 'v1', start: { lat: 0, lon: 0 } },
          { id: 'v2', start: { lat: 1, lon: 1 } },
        ],
      };

      const solution: Vrp.OnRouteResponse = {
        id: 'test-solution',
        trips: [],
      };

      const result = generateStartScreen(vrpData, solution);

      expect(result.prompts).toHaveLength(4);
    });

    it('should handle plural vs singular correctly in greeting', () => {
      const singleJob: Vrp.VrpSyncSolveParams = {
        jobs: [{ id: '1', location: { lat: 0, lon: 0 } }],
        resources: [{ id: 'v1', start: { lat: 0, lon: 0 } }],
      };

      const multiJob: Vrp.VrpSyncSolveParams = {
        jobs: [
          { id: '1', location: { lat: 0, lon: 0 } },
          { id: '2', location: { lat: 1, lon: 1 } },
        ],
        resources: [
          { id: 'v1', start: { lat: 0, lon: 0 } },
          { id: 'v2', start: { lat: 1, lon: 1 } },
        ],
      };

      const singleResult = generateStartScreen(singleJob);
      expect(singleResult.greeting).toContain('1 job');
      expect(singleResult.greeting).toContain('1 vehicle');

      const multiResult = generateStartScreen(multiJob);
      expect(multiResult.greeting).toContain('2 jobs');
      expect(multiResult.greeting).toContain('2 vehicles');
    });
  });
});
