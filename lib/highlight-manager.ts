import * as monaco from 'monaco-editor'
import { JsonDiffService, HighlightableChange } from './json-diff-service'
import { MonacoHighlighter, HighlightTheme, HighlightOptions } from './monaco-highlighter'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export interface HighlightSession {
  id: string
  timestamp: Date
  changes: HighlightableChange[]
  originalData: Vrp.VrpSyncSolveParams
  modifiedData: Vrp.VrpSyncSolveParams
  description?: string
}

export interface SmartHighlightOptions extends HighlightOptions {
  autoFade?: boolean
  persistSessions?: boolean
  maxSessions?: number
  smartGrouping?: boolean
  contextualTooltips?: boolean
  animateTransitions?: boolean
}

export class HighlightManager {
  private editor: monaco.editor.IStandaloneCodeEditor
  private highlighter: MonacoHighlighter
  private sessions: Map<string, HighlightSession> = new Map()
  private currentSession: HighlightSession | null = null
  private options: Required<SmartHighlightOptions>
  private disposables: monaco.IDisposable[] = []

  constructor(editor: monaco.editor.IStandaloneCodeEditor, options: SmartHighlightOptions = {}) {
    this.editor = editor
    this.options = {
      ...options,
      autoFade: options.autoFade ?? true,
      persistSessions: options.persistSessions ?? true,
      maxSessions: options.maxSessions ?? 10,
      smartGrouping: options.smartGrouping ?? true,
      contextualTooltips: options.contextualTooltips ?? true,
      animateTransitions: options.animateTransitions ?? true,
      fadeDelayMs: options.fadeDelayMs ?? 5000,
      fadeDurationMs: options.fadeDurationMs ?? 1000,
      showTooltips: options.showTooltips ?? true,
      priority: options.priority ?? 1000,
      theme: options.theme
    } as Required<SmartHighlightOptions>

    this.highlighter = new MonacoHighlighter(editor, this.options)
    this.setupEditorListeners()
    this.loadPersistedSessions()
  }

  /**
   * Create a new highlight session from VRP data changes
   */
  createSession(
    originalData: Vrp.VrpSyncSolveParams,
    modifiedData: Vrp.VrpSyncSolveParams,
    description?: string
  ): string {
    const sessionId = this.generateSessionId()
    
    // Detect changes between the data
    const changes = JsonDiffService.detectChanges(originalData, modifiedData)
    
    // Get current JSON text for mapping
    const jsonText = this.editor.getValue()
    
    // Map changes to text positions
    const highlightableChanges = JsonDiffService.mapChangesToText(changes, jsonText)
    
    // Apply smart grouping if enabled
    const processedChanges = this.options.smartGrouping 
      ? this.applySmartGrouping(highlightableChanges)
      : highlightableChanges

    const session: HighlightSession = {
      id: sessionId,
      timestamp: new Date(),
      changes: processedChanges,
      originalData,
      modifiedData,
      description
    }

    // Store session
    this.sessions.set(sessionId, session)
    this.currentSession = session

    // Manage session limit
    this.pruneOldSessions()

    // Apply highlights
    this.highlighter.highlightChanges(processedChanges)

    // Persist if enabled
    if (this.options.persistSessions) {
      this.persistSessions()
    }

    return sessionId
  }

  /**
   * Switch to an existing session
   */
  switchToSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    this.currentSession = session
    this.highlighter.highlightChanges(session.changes)
    return true
  }

  /**
   * Get all highlight sessions
   */
  getSessions(): HighlightSession[] {
    return Array.from(this.sessions.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Get current session
   */
  getCurrentSession(): HighlightSession | null {
    return this.currentSession
  }

  /**
   * Clear current highlights
   */
  clearCurrentHighlights(): void {
    this.highlighter.clearHighlights()
    this.currentSession = null
  }

  /**
   * Clear all sessions
   */
  clearAllSessions(): void {
    this.sessions.clear()
    this.currentSession = null
    this.highlighter.clearHighlights()
    
    if (this.options.persistSessions) {
      this.persistSessions()
    }
  }

  /**
   * Jump to next change
   */
  jumpToNextChange(): void {
    if (!this.currentSession || this.currentSession.changes.length === 0) return

    const changes = this.currentSession.changes.filter(c => c.highlightRange)
    if (changes.length === 0) return

    // Find current cursor position
    const position = this.editor.getPosition()
    if (!position) {
      // Jump to first change
      this.highlighter.jumpToChange(changes[0])
      return
    }

    // Find next change after current position
    const nextChange = changes.find(change => {
      if (!change.highlightRange) return false
      return change.highlightRange.startLine > position.lineNumber ||
        (change.highlightRange.startLine === position.lineNumber && 
         change.highlightRange.startColumn > position.column)
    })

    if (nextChange) {
      this.highlighter.jumpToChange(nextChange)
    } else {
      // Wrap to first change
      this.highlighter.jumpToChange(changes[0])
    }
  }

  /**
   * Jump to previous change
   */
  jumpToPreviousChange(): void {
    if (!this.currentSession || this.currentSession.changes.length === 0) return

    const changes = this.currentSession.changes
      .filter(c => c.highlightRange)
      .sort((a, b) => {
        if (!a.highlightRange || !b.highlightRange) return 0
        if (a.highlightRange.startLine !== b.highlightRange.startLine) {
          return b.highlightRange.startLine - a.highlightRange.startLine
        }
        return b.highlightRange.startColumn - a.highlightRange.startColumn
      })

    if (changes.length === 0) return

    // Find current cursor position
    const position = this.editor.getPosition()
    if (!position) {
      // Jump to last change
      this.highlighter.jumpToChange(changes[0])
      return
    }

    // Find previous change before current position
    const prevChange = changes.find(change => {
      if (!change.highlightRange) return false
      return change.highlightRange.startLine < position.lineNumber ||
        (change.highlightRange.startLine === position.lineNumber && 
         change.highlightRange.startColumn < position.column)
    })

    if (prevChange) {
      this.highlighter.jumpToChange(prevChange)
    } else {
      // Wrap to last change
      this.highlighter.jumpToChange(changes[0])
    }
  }

  /**
   * Get statistics about current session
   */
  getSessionStats(): { added: number; modified: number; removed: number; total: number } | null {
    if (!this.currentSession) return null

    const summary = JsonDiffService.getChangeSummary(this.currentSession.changes)
    return {
      ...summary,
      total: this.currentSession.changes.length
    }
  }

  /**
   * Filter current highlights by change type
   */
  filterHighlightsByType(types: ('added' | 'modified' | 'removed')[]): void {
    if (!this.currentSession) return

    const filteredChanges = this.currentSession.changes.filter(change => 
      types.includes(change.type as 'added' | 'modified' | 'removed')
    )

    this.highlighter.highlightChanges(filteredChanges)
  }

  /**
   * Show all highlights
   */
  showAllHighlights(): void {
    if (!this.currentSession) return
    this.highlighter.highlightChanges(this.currentSession.changes)
  }

  /**
   * Update highlight theme
   */
  updateTheme(theme: HighlightTheme): void {
    this.highlighter.updateTheme(theme)
    this.options.theme = theme
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.highlighter.dispose()
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
  }

  /**
   * Apply smart grouping to changes
   */
  private applySmartGrouping(changes: HighlightableChange[]): HighlightableChange[] {
    // Group related changes (e.g., same object modifications)
    const grouped = new Map<string, HighlightableChange[]>()
    
    for (const change of changes) {
      // Create grouping key based on path (excluding leaf property)
      const groupKey = change.path.slice(0, -1).join('.')
      
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, [])
      }
      grouped.get(groupKey)!.push(change)
    }

    // Merge groups with multiple changes into summary changes where appropriate
    const result: HighlightableChange[] = []
    
    for (const [groupKey, groupChanges] of grouped) {
      if (groupChanges.length === 1) {
        result.push(groupChanges[0])
      } else {
        // Create a summary change for the group
        const firstChange = groupChanges[0]
        const types = [...new Set(groupChanges.map(c => c.type))]
        
        if (types.length === 1) {
          // All changes are the same type - create a summary
          result.push({
            ...firstChange,
            description: `${types[0]} ${groupChanges.length} properties in ${groupKey || 'root'}`
          })
        } else {
          // Mixed types - keep individual changes but mark as grouped
          result.push(...groupChanges.map(change => ({
            ...change,
            description: `${change.description} (part of ${groupKey} changes)`
          })))
        }
      }
    }

    return result
  }

  /**
   * Setup editor event listeners
   */
  private setupEditorListeners(): void {
    // Listen for content changes to update highlights
    const onModelChange = this.editor.onDidChangeModelContent(() => {
      if (this.currentSession) {
        // Recompute text positions when content changes
        this.updateHighlightPositions()
      }
    })

    // Note: Theme change listening not available in this Monaco version
    // Users can manually update theme using updateTheme() method

    this.disposables.push(onModelChange)
  }

  /**
   * Update highlight positions after text changes
   */
  private updateHighlightPositions(): void {
    if (!this.currentSession) return

    const jsonText = this.editor.getValue()
    const updatedChanges = JsonDiffService.mapChangesToText(this.currentSession.changes, jsonText)
    
    this.currentSession.changes = updatedChanges
    this.highlighter.highlightChanges(updatedChanges)
  }

  /**
   * Get theme for color scheme
   */
  private getThemeForColorScheme(isDark: boolean): HighlightTheme {
    if (this.options.theme) return this.options.theme
    
    // Use different colors for dark/light themes
    return isDark ? {
      added: {
        backgroundColor: 'rgba(56, 139, 69, 0.25)',
        border: '2px solid rgba(56, 139, 69, 0.6)',
        textColor: '#4caf50'
      },
      modified: {
        backgroundColor: 'rgba(255, 193, 7, 0.25)',
        border: '2px solid rgba(255, 193, 7, 0.6)',
        textColor: '#ffc107'
      },
      removed: {
        backgroundColor: 'rgba(244, 67, 54, 0.25)',
        border: '2px solid rgba(244, 67, 54, 0.6)',
        textColor: '#f44336'
      }
    } : {
      added: {
        backgroundColor: 'rgba(46, 160, 67, 0.15)',
        border: '2px solid rgba(46, 160, 67, 0.4)',
        textColor: '#2ea043'
      },
      modified: {
        backgroundColor: 'rgba(251, 189, 8, 0.15)',
        border: '2px solid rgba(251, 189, 8, 0.4)',
        textColor: '#bf8700'
      },
      removed: {
        backgroundColor: 'rgba(248, 81, 73, 0.15)',
        border: '2px solid rgba(248, 81, 73, 0.4)',
        textColor: '#da3633'
      }
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Prune old sessions to maintain limit
   */
  private pruneOldSessions(): void {
    if (this.sessions.size <= this.options.maxSessions) return

    const sortedSessions = Array.from(this.sessions.entries())
      .sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime())

    // Keep only the most recent sessions
    const sessionsToKeep = sortedSessions.slice(0, this.options.maxSessions)
    const sessionsToRemove = sortedSessions.slice(this.options.maxSessions)

    this.sessions.clear()
    sessionsToKeep.forEach(([id, session]) => {
      this.sessions.set(id, session)
    })

    // If current session was removed, clear it
    if (this.currentSession && sessionsToRemove.some(([id]) => id === this.currentSession!.id)) {
      this.currentSession = null
    }
  }

  /**
   * Persist sessions to localStorage
   */
  private persistSessions(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const sessionsData = Array.from(this.sessions.entries()).map(([id, session]) => ({
        id,
        timestamp: session.timestamp.toISOString(),
        description: session.description,
        changesCount: session.changes.length
        // Note: We don't persist the full data to avoid storage bloat
      }))

      localStorage.setItem('vrp-highlight-sessions', JSON.stringify(sessionsData))
    } catch (error) {
      console.warn('Failed to persist highlight sessions:', error)
    }
  }

  /**
   * Load persisted sessions from localStorage
   */
  private loadPersistedSessions(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const data = localStorage.getItem('vrp-highlight-sessions')
      if (!data) return

      // Note: This is a placeholder - in a full implementation,
      // you might want to parse and restore actual session data
      JSON.parse(data)
    } catch (error) {
      console.warn('Failed to load persisted highlight sessions:', error)
    }
  }
}