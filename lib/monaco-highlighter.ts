import * as monaco from 'monaco-editor'
import { HighlightableChange, ChangeType } from './json-diff-service'

export interface HighlightTheme {
  added: {
    backgroundColor: string
    border: string
    textColor?: string
  }
  modified: {
    backgroundColor: string
    border: string
    textColor?: string
  }
  removed: {
    backgroundColor: string
    border: string
    textColor?: string
  }
}

export interface HighlightOptions {
  theme?: HighlightTheme
  fadeDelayMs?: number
  fadeDurationMs?: number
  showTooltips?: boolean
  priority?: number
}

export class MonacoHighlighter {
  private editor: monaco.editor.IStandaloneCodeEditor
  private decorations: string[] = []
  private hoverProviders: monaco.IDisposable[] = []
  private theme: HighlightTheme
  private options: Required<HighlightOptions>

  constructor(editor: monaco.editor.IStandaloneCodeEditor, options: HighlightOptions = {}) {
    this.editor = editor
    this.theme = options.theme || this.getDefaultTheme()
    this.options = {
      theme: this.theme,
      fadeDelayMs: options.fadeDelayMs ?? 3000,
      fadeDurationMs: options.fadeDurationMs ?? 1000,
      showTooltips: options.showTooltips ?? true,
      priority: options.priority ?? 1000
    }
    
    this.registerCustomDecorationTypes()
  }

  /**
   * Highlight changes in the Monaco editor
   */
  highlightChanges(changes: HighlightableChange[]): void {
    // Clear existing decorations
    this.clearHighlights()
    
    // Create new decorations for changes
    const decorationOptions: monaco.editor.IModelDeltaDecoration[] = []
    
    for (const change of changes) {
      if (change.highlightRange) {
        const decoration = this.createDecoration(change)
        if (decoration) {
          decorationOptions.push(decoration)
        }
      }
    }
    
    // Apply decorations to the editor
    this.decorations = this.editor.deltaDecorations([], decorationOptions)
    
    // Set up hover providers for tooltips
    if (this.options.showTooltips) {
      this.setupTooltips(changes)
    }
    
    // Set up auto-fade if configured
    if (this.options.fadeDelayMs > 0) {
      setTimeout(() => {
        this.fadeHighlights()
      }, this.options.fadeDelayMs)
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    if (this.decorations.length > 0) {
      this.decorations = this.editor.deltaDecorations(this.decorations, [])
    }
    
    // Dispose hover providers
    this.hoverProviders.forEach(provider => provider.dispose())
    this.hoverProviders = []
  }

  /**
   * Fade highlights gradually
   */
  fadeHighlights(): void {
    if (this.options.fadeDurationMs <= 0) {
      this.clearHighlights()
      return
    }
    
    // For now, just clear after fade duration
    // In a full implementation, you could animate the opacity
    setTimeout(() => {
      this.clearHighlights()
    }, this.options.fadeDurationMs)
  }

  /**
   * Jump to a specific change
   */
  jumpToChange(change: HighlightableChange): void {
    if (!change.highlightRange) return
    
    const { startLine, startColumn } = change.highlightRange
    
    // Reveal the line and set cursor position
    this.editor.revealLineInCenter(startLine)
    this.editor.setPosition({ lineNumber: startLine, column: startColumn })
    
    // Optionally focus the editor
    this.editor.focus()
  }

  /**
   * Update the highlight theme
   */
  updateTheme(theme: HighlightTheme): void {
    this.theme = theme
    this.options.theme = theme
    this.registerCustomDecorationTypes()
  }

  /**
   * Get default color theme for highlights
   */
  private getDefaultTheme(): HighlightTheme {
    return {
      added: {
        backgroundColor: 'rgba(46, 160, 67, 0.15)', // Green background
        border: '2px solid rgba(46, 160, 67, 0.4)',
        textColor: '#2ea043'
      },
      modified: {
        backgroundColor: 'rgba(251, 189, 8, 0.15)', // Yellow background
        border: '2px solid rgba(251, 189, 8, 0.4)',
        textColor: '#bf8700'
      },
      removed: {
        backgroundColor: 'rgba(248, 81, 73, 0.15)', // Red background
        border: '2px solid rgba(248, 81, 73, 0.4)',
        textColor: '#da3633'
      }
    }
  }

  /**
   * Register custom decoration types with Monaco
   */
  private registerCustomDecorationTypes(): void {
    // Register decoration types for each change type
    const changeTypes: (keyof HighlightTheme)[] = ['added', 'modified', 'removed']
    
    changeTypes.forEach(type => {
      const theme = this.theme[type]
      if (theme) {
        // Monaco will automatically register these when used
        // The class names will be used in createDecoration
      }
    })
  }

  /**
   * Create a decoration for a change
   */
  private createDecoration(change: HighlightableChange): monaco.editor.IModelDeltaDecoration | null {
    if (!change.highlightRange || change.type === 'unchanged') return null
    
    const { startLine, startColumn, endLine, endColumn } = change.highlightRange
    const theme = this.theme[change.type]
    
    if (!theme) return null
    
    return {
      range: new monaco.Range(startLine, startColumn, endLine, endColumn),
      options: {
        className: `vrp-highlight-${change.type}`,
        hoverMessage: {
          value: this.formatTooltipMessage(change)
        },
        minimap: {
          color: theme.border.replace('rgba', 'rgb').replace(/,\s*[\d.]+\)/, ')'),
          position: monaco.editor.MinimapPosition.Inline
        },
        overviewRuler: {
          color: theme.border.replace('rgba', 'rgb').replace(/,\s*[\d.]+\)/, ')'),
          position: monaco.editor.OverviewRulerLane.Right
        },
        inlineClassName: `vrp-highlight-${change.type}-inline`,
        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
      }
    }
  }

  /**
   * Setup tooltip hover providers
   */
  private setupTooltips(changes: HighlightableChange[]): void {
    changes.forEach(change => {
      if (!change.highlightRange) return
      
      const provider = monaco.languages.registerHoverProvider('json', {
        provideHover: (model, position) => {
          const { startLine, startColumn, endLine, endColumn } = change.highlightRange!
          
          // Check if the hover position is within this change's range
          if (
            position.lineNumber >= startLine &&
            position.lineNumber <= endLine &&
            position.column >= startColumn &&
            position.column <= endColumn
          ) {
            return {
              range: new monaco.Range(startLine, startColumn, endLine, endColumn),
              contents: [
                { value: this.formatTooltipMessage(change) }
              ]
            }
          }
          
          return null
        }
      })
      
      this.hoverProviders.push(provider)
    })
  }

  /**
   * Format tooltip message for a change
   */
  private formatTooltipMessage(change: HighlightableChange): string {
    const typeIcon = this.getChangeIcon(change.type)
    const typeName = change.type.charAt(0).toUpperCase() + change.type.slice(1)
    
    return `**${typeIcon} ${typeName}**\n\n${change.description}`
  }

  /**
   * Get icon for change type
   */
  private getChangeIcon(type: ChangeType): string {
    switch (type) {
      case 'added': return '✅'
      case 'modified': return '✏️'
      case 'removed': return '❌'
      default: return '📄'
    }
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearHighlights()
  }
}

/**
 * CSS classes for highlighting - these should be added to the global CSS
 */
export const HighlightStyles = `
.vrp-highlight-added {
  background-color: rgba(46, 160, 67, 0.15);
  border-left: 3px solid rgba(46, 160, 67, 0.6);
  padding-left: 4px;
}

.vrp-highlight-modified {
  background-color: rgba(251, 189, 8, 0.15);
  border-left: 3px solid rgba(251, 189, 8, 0.6);
  padding-left: 4px;
}

.vrp-highlight-removed {
  background-color: rgba(248, 81, 73, 0.15);
  border-left: 3px solid rgba(248, 81, 73, 0.6);
  padding-left: 4px;
  text-decoration: line-through;
}

.vrp-highlight-added-inline {
  color: #2ea043;
  font-weight: 500;
}

.vrp-highlight-modified-inline {
  color: #bf8700;
  font-weight: 500;
}

.vrp-highlight-removed-inline {
  color: #da3633;
  font-weight: 500;
}

/* Animation for highlights */
@keyframes vrp-highlight-flash {
  0% { background-color: rgba(255, 255, 0, 0.4); }
  100% { background-color: transparent; }
}

.vrp-highlight-flash {
  animation: vrp-highlight-flash 0.5s ease-out;
}
`

/**
 * Utility functions for working with highlights
 */
export class HighlightUtils {
  /**
   * Inject highlight styles into the document
   */
  static injectStyles(): void {
    if (typeof document === 'undefined') return
    
    const existingStyle = document.getElementById('vrp-highlight-styles')
    if (existingStyle) return
    
    const style = document.createElement('style')
    style.id = 'vrp-highlight-styles'
    style.textContent = HighlightStyles
    document.head.appendChild(style)
  }

  /**
   * Create a highlight manager for an editor
   */
  static createHighlighter(
    editor: monaco.editor.IStandaloneCodeEditor,
    options?: HighlightOptions
  ): MonacoHighlighter {
    // Inject styles if not already present
    this.injectStyles()
    
    return new MonacoHighlighter(editor, options)
  }

  /**
   * Get theme based on user preferences (light/dark mode)
   */
  static getThemeForMode(isDarkMode: boolean): HighlightTheme {
    if (isDarkMode) {
      return {
        added: {
          backgroundColor: 'rgba(56, 139, 69, 0.2)',
          border: '2px solid rgba(56, 139, 69, 0.5)',
          textColor: '#4caf50'
        },
        modified: {
          backgroundColor: 'rgba(255, 193, 7, 0.2)',
          border: '2px solid rgba(255, 193, 7, 0.5)',
          textColor: '#ffc107'
        },
        removed: {
          backgroundColor: 'rgba(244, 67, 54, 0.2)',
          border: '2px solid rgba(244, 67, 54, 0.5)',
          textColor: '#f44336'
        }
      }
    }
    
    // Light mode theme (default)
    return {
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
}