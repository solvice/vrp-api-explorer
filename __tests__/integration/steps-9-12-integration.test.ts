import { JsonDiffService, HighlightableChange } from '../../lib/json-diff-service'
import { MonacoHighlighter, HighlightUtils } from '../../lib/monaco-highlighter'
import { HighlightManager } from '../../lib/highlight-manager'
import { VrpAnalyzer } from '../../lib/vrp-analyzer'
import { getSampleVrpData } from '../../lib/sample-data'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

// Mock Monaco Editor for testing
const mockMonaco = {
  Range: jest.fn().mockImplementation((startLine, startColumn, endLine, endColumn) => ({
    startLineNumber: startLine,
    startColumn,
    endLineNumber: endLine,
    endColumn
  })),
  editor: {
    MinimapPosition: { Inline: 1 },
    OverviewRulerLane: { Right: 1 },
    TrackedRangeStickiness: { NeverGrowsWhenTypingAtEdges: 1 },
    ColorScheme: { DARK: 'dark', LIGHT: 'light' },
    getColorScheme: jest.fn().mockReturnValue('light'),
    onDidChangeColorScheme: jest.fn().mockReturnValue({ dispose: jest.fn() })
  },
  languages: {
    registerHoverProvider: jest.fn().mockReturnValue({ dispose: jest.fn() })
  }
}

jest.mock('monaco-editor', () => mockMonaco)

describe('Steps 9-12 Integration Tests', () => {
  let originalData: Vrp.VrpSyncSolveParams
  let modifiedData: Vrp.VrpSyncSolveParams

  beforeEach(() => {
    originalData = getSampleVrpData('simple')
    modifiedData = {
      ...originalData,
      jobs: [
        ...originalData.jobs,
        {
          name: 'new_delivery_job',
          duration: 900,
          location: { latitude: 51.0600, longitude: 3.7350 },
          windows: [{ from: '2024-01-15T10:00:00Z', to: '2024-01-15T16:00:00Z' }],
          priority: 3
        }
      ],
      resources: [
        ...originalData.resources,
        {
          name: 'express_vehicle',
          shifts: [{
            from: '2024-01-15T06:00:00Z',
            to: '2024-01-15T22:00:00Z',
            start: { latitude: 50.99, longitude: 3.81 },
            end: { latitude: 50.99, longitude: 3.81 }
          }],
          capacity: [2000, 1000],
          category: 'TRUCK' as const,
          tags: ['express', 'priority']
        }
      ]
    }
  })

  describe('Step 9: Change Detection and Highlighting', () => {
    it('should detect VRP data changes correctly', () => {
      const changes = JsonDiffService.detectChanges(originalData, modifiedData)
      
      expect(changes.length).toBeGreaterThan(0)
      
      // Should detect added job
      const jobChanges = changes.filter(c => c.path.includes('jobs'))
      expect(jobChanges.length).toBeGreaterThan(0)
      
      // Should detect added resource
      const resourceChanges = changes.filter(c => c.path.includes('resources'))
      expect(resourceChanges.length).toBeGreaterThan(0)
      
      // Verify change types
      const addedChanges = changes.filter(c => c.type === 'added')
      expect(addedChanges.length).toBeGreaterThan(0)
    })

    it('should map changes to text positions', () => {
      const changes = JsonDiffService.detectChanges(originalData, modifiedData)
      const jsonText = JSON.stringify(modifiedData, null, 2)
      
      const highlightableChanges = JsonDiffService.mapChangesToText(changes, jsonText)
      
      expect(highlightableChanges.length).toBe(changes.length)
      
      // Some changes should have text positions
      const changesWithPositions = highlightableChanges.filter(c => c.textPosition)
      expect(changesWithPositions.length).toBeGreaterThan(0)
    })

    it('should provide change summary statistics', () => {
      const changes = JsonDiffService.detectChanges(originalData, modifiedData)
      const summary = JsonDiffService.getChangeSummary(changes)
      
      expect(summary).toHaveProperty('added')
      expect(summary).toHaveProperty('modified')
      expect(summary).toHaveProperty('removed')
      expect(summary.added).toBeGreaterThan(0)
    })

    it('should filter changes by type and path', () => {
      const changes = JsonDiffService.detectChanges(originalData, modifiedData)
      
      const addedChanges = JsonDiffService.filterChangesByType(changes, 'added')
      expect(addedChanges.every(c => c.type === 'added')).toBe(true)
      
      const jobChanges = JsonDiffService.filterChangesByPath(changes, ['jobs'])
      expect(jobChanges.every(c => c.path[0] === 'jobs')).toBe(true)
    })
  })

  describe('Step 10: Smart Highlighting System', () => {
    let mockEditor: any

    beforeEach(() => {
      mockEditor = {
        getValue: jest.fn().mockReturnValue(JSON.stringify(modifiedData, null, 2)),
        deltaDecorations: jest.fn().mockReturnValue(['decoration1', 'decoration2']),
        getPosition: jest.fn().mockReturnValue({ lineNumber: 1, column: 1 }),
        revealLineInCenter: jest.fn(),
        setPosition: jest.fn(),
        focus: jest.fn(),
        onDidChangeModelContent: jest.fn().mockReturnValue({ dispose: jest.fn() })
      }
    })

    it('should create highlight manager and manage sessions', () => {
      const manager = new HighlightManager(mockEditor)
      
      const sessionId = manager.createSession(originalData, modifiedData, 'Test modification')
      
      expect(sessionId).toBeDefined()
      expect(manager.getCurrentSession()).toBeTruthy()
      expect(manager.getSessions()).toHaveLength(1)
      
      const stats = manager.getSessionStats()
      expect(stats).toHaveProperty('added')
      expect(stats).toHaveProperty('total')
    })

    it('should provide navigation between changes', () => {
      const manager = new HighlightManager(mockEditor)
      manager.createSession(originalData, modifiedData)
      
      // Should not throw when navigating
      expect(() => manager.jumpToNextChange()).not.toThrow()
      expect(() => manager.jumpToPreviousChange()).not.toThrow()
    })

    it('should filter highlights by type', () => {
      const manager = new HighlightManager(mockEditor)
      manager.createSession(originalData, modifiedData)
      
      expect(() => manager.filterHighlightsByType(['added'])).not.toThrow()
      expect(() => manager.showAllHighlights()).not.toThrow()
    })

    it('should manage multiple sessions', () => {
      const manager = new HighlightManager(mockEditor, { maxSessions: 2 })
      
      const session1 = manager.createSession(originalData, modifiedData, 'First change')
      const session2 = manager.createSession(modifiedData, originalData, 'Second change')
      
      expect(manager.getSessions()).toHaveLength(2)
      expect(manager.switchToSession(session1)).toBe(true)
      expect(manager.getCurrentSession()?.id).toBe(session1)
    })

    it('should clean up resources properly', () => {
      const manager = new HighlightManager(mockEditor)
      manager.createSession(originalData, modifiedData)
      
      expect(() => manager.clearCurrentHighlights()).not.toThrow()
      expect(() => manager.clearAllSessions()).not.toThrow()
      expect(() => manager.dispose()).not.toThrow()
    })
  })

  describe('Step 11: VRP Analyzer', () => {
    it('should analyze VRP data comprehensively', () => {
      const analysis = VrpAnalyzer.analyzeVrpData(originalData)
      
      expect(analysis).toHaveProperty('overview')
      expect(analysis).toHaveProperty('jobs')
      expect(analysis).toHaveProperty('resources')
      expect(analysis).toHaveProperty('constraints')
      expect(analysis).toHaveProperty('suggestions')
      expect(analysis).toHaveProperty('optimizationOpportunities')
      
      // Verify overview metrics
      expect(analysis.overview.jobCount).toBe(originalData.jobs.length)
      expect(analysis.overview.resourceCount).toBe(originalData.resources.length)
      expect(analysis.overview.planningComplexity).toBeDefined()
    })

    it('should generate contextual suggestions', () => {
      const suggestions = VrpAnalyzer.generateContextualSuggestions(originalData)
      
      expect(Array.isArray(suggestions)).toBe(true)
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(5)
      
      // Suggestions should be strings
      expect(suggestions.every(s => typeof s === 'string')).toBe(true)
    })

    it('should provide quick summary', () => {
      const summary = VrpAnalyzer.getQuickSummary(originalData)
      
      expect(typeof summary).toBe('string')
      expect(summary).toContain('jobs')
      expect(summary).toContain('resources')
    })

    it('should analyze different complexity levels', () => {
      // Simple case
      const simpleAnalysis = VrpAnalyzer.analyzeVrpData(originalData)
      expect(simpleAnalysis.overview.planningComplexity).toBe('simple')
      
      // Complex case with more data
      const complexData = {
        ...originalData,
        jobs: Array(100).fill(null).map((_, i) => ({
          name: `job_${i}`,
          duration: 600,
          windows: [{ from: '2024-01-15T08:00:00Z', to: '2024-01-15T18:00:00Z' }],
          tags: [{ name: 'skill1', hard: true }]
        })),
        relations: [
          {
            jobs: ['job_0', 'job_1'],
            type: 'SEQUENCE' as const,
            timeInterval: 'FROM_DEPARTURE' as const
          }
        ],
        weights: {
          travelTimeWeight: 1,
          priorityWeight: 2
        }
      }
      
      const complexAnalysis = VrpAnalyzer.analyzeVrpData(complexData)
      expect(['complex', 'very_complex']).toContain(complexAnalysis.overview.planningComplexity)
    })

    it('should generate actionable suggestions based on data characteristics', () => {
      // Data without time windows
      const noWindowsData = {
        ...originalData,
        jobs: originalData.jobs.map(job => ({ ...job, windows: undefined }))
      }
      
      const analysis = VrpAnalyzer.analyzeVrpData(noWindowsData)
      const timeWindowSuggestion = analysis.suggestions.find(s => 
        s.category === 'time_windows'
      )
      
      expect(timeWindowSuggestion).toBeDefined()
      expect(timeWindowSuggestion?.actionable).toBe(true)
    })
  })

  describe('Step 12: End-to-End Integration', () => {
    it('should work together for complete workflow', () => {
      // 1. Analyze original data
      const originalAnalysis = VrpAnalyzer.analyzeVrpData(originalData)
      expect(originalAnalysis.suggestions.length).toBeGreaterThan(0)
      
      // 2. Detect changes after modification
      const changes = JsonDiffService.detectChanges(originalData, modifiedData)
      expect(changes.length).toBeGreaterThan(0)
      
      // 3. Map to highlightable changes
      const jsonText = JSON.stringify(modifiedData, null, 2)
      const highlightableChanges = JsonDiffService.mapChangesToText(changes, jsonText)
      expect(highlightableChanges.length).toBe(changes.length)
      
      // 4. Analyze modified data
      const modifiedAnalysis = VrpAnalyzer.analyzeVrpData(modifiedData)
      expect(modifiedAnalysis.overview.jobCount).toBeGreaterThan(originalAnalysis.overview.jobCount)
      expect(modifiedAnalysis.overview.resourceCount).toBeGreaterThan(originalAnalysis.overview.resourceCount)
    })

    it('should handle edge cases gracefully', () => {
      // Empty data
      const emptyData: Vrp.VrpSyncSolveParams = { jobs: [], resources: [] }
      
      expect(() => VrpAnalyzer.analyzeVrpData(emptyData)).not.toThrow()
      expect(() => JsonDiffService.detectChanges(emptyData, originalData)).not.toThrow()
      expect(() => VrpAnalyzer.generateContextualSuggestions(emptyData)).not.toThrow()
    })

    it('should maintain performance with large datasets', () => {
      // Large dataset
      const largeData: Vrp.VrpSyncSolveParams = {
        jobs: Array(500).fill(null).map((_, i) => ({
          name: `job_${i}`,
          duration: 600,
          location: { latitude: 51 + Math.random(), longitude: 3.7 + Math.random() }
        })),
        resources: Array(50).fill(null).map((_, i) => ({
          name: `vehicle_${i}`,
          shifts: [{
            from: '2024-01-15T08:00:00Z',
            to: '2024-01-15T18:00:00Z'
          }]
        }))
      }
      
      const startTime = Date.now()
      const analysis = VrpAnalyzer.analyzeVrpData(largeData)
      const endTime = Date.now()
      
      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
      expect(analysis.overview.jobCount).toBe(500)
      expect(analysis.overview.resourceCount).toBe(50)
    })
  })

  describe('Utility Functions', () => {
    it('should inject highlight styles correctly', () => {
      // Mock document
      const mockDocument = {
        getElementById: jest.fn().mockReturnValue(null),
        createElement: jest.fn().mockReturnValue({
          id: '',
          textContent: ''
        }),
        head: {
          appendChild: jest.fn()
        }
      }
      
      Object.defineProperty(global, 'document', {
        value: mockDocument,
        writable: true
      })
      
      HighlightUtils.injectStyles()
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('style')
      expect(mockDocument.head.appendChild).toHaveBeenCalled()
    })

    it('should provide theme variants for different modes', () => {
      const lightTheme = HighlightUtils.getThemeForMode(false)
      const darkTheme = HighlightUtils.getThemeForMode(true)
      
      expect(lightTheme).toHaveProperty('added')
      expect(lightTheme).toHaveProperty('modified')
      expect(lightTheme).toHaveProperty('removed')
      
      expect(darkTheme).toHaveProperty('added')
      expect(darkTheme).toHaveProperty('modified')
      expect(darkTheme).toHaveProperty('removed')
      
      // Themes should be different
      expect(lightTheme.added.backgroundColor).not.toBe(darkTheme.added.backgroundColor)
    })
  })
})