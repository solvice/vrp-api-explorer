import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'

export type ChangeType = 'added' | 'modified' | 'removed' | 'unchanged'

export interface JsonChange {
  type: ChangeType
  path: string[]
  oldValue?: unknown
  newValue?: unknown
  description: string
}

export interface TextPosition {
  line: number
  column: number
  length: number
}

export interface HighlightableChange extends JsonChange {
  textPosition?: TextPosition
  highlightRange?: {
    startLine: number
    startColumn: number
    endLine: number
    endColumn: number
  }
}

export class JsonDiffService {
  /**
   * Compare two VRP JSON objects and detect changes
   */
  static detectChanges(
    original: Vrp.VrpSyncSolveParams,
    modified: Vrp.VrpSyncSolveParams
  ): JsonChange[] {
    const changes: JsonChange[] = []
    
    // Compare jobs array
    this.compareArrays(
      original.jobs || [],
      modified.jobs || [],
      ['jobs'],
      changes,
      this.compareJobs.bind(this)
    )
    
    // Compare resources array
    this.compareArrays(
      original.resources || [],
      modified.resources || [],
      ['resources'],
      changes,
      this.compareResources.bind(this)
    )
    
    // Compare options
    if (original.options || modified.options) {
      this.compareObjects(
        (original.options as Record<string, unknown>) || {},
        (modified.options as Record<string, unknown>) || {},
        ['options'],
        changes
      )
    }
    
    // Compare relations
    if (original.relations || modified.relations) {
      this.compareArrays(
        original.relations || [],
        modified.relations || [],
        ['relations'],
        changes,
        this.compareRelations.bind(this)
      )
    }
    
    // Compare weights
    if (original.weights || modified.weights) {
      this.compareObjects(
        (original.weights as Record<string, unknown>) || {},
        (modified.weights as Record<string, unknown>) || {},
        ['weights'],
        changes
      )
    }
    
    return changes
  }

  /**
   * Map changes to their positions in the JSON text
   */
  static mapChangesToText(
    changes: JsonChange[],
    jsonText: string
  ): HighlightableChange[] {
    const lines = jsonText.split('\n')
    const highlightableChanges: HighlightableChange[] = []
    
    for (const change of changes) {
      const textPosition = this.findTextPosition(change.path, lines)
      
      highlightableChanges.push({
        ...change,
        textPosition,
        highlightRange: textPosition ? this.calculateHighlightRange(textPosition, change, lines) : undefined
      })
    }
    
    return highlightableChanges
  }

  /**
   * Compare two arrays and detect changes
   */
  private static compareArrays<T>(
    originalArray: T[],
    modifiedArray: T[],
    basePath: string[],
    changes: JsonChange[],
    itemComparer?: (original: T, modified: T, path: string[], changes: JsonChange[]) => void
  ): void {
    const maxLength = Math.max(originalArray.length, modifiedArray.length)
    
    for (let i = 0; i < maxLength; i++) {
      const currentPath = [...basePath, i.toString()]
      const originalItem = originalArray[i]
      const modifiedItem = modifiedArray[i]
      
      if (originalItem === undefined && modifiedItem !== undefined) {
        // Item added
        changes.push({
          type: 'added',
          path: currentPath,
          newValue: modifiedItem,
          description: `Added ${this.getItemDescription(modifiedItem, basePath)} at index ${i}`
        })
      } else if (originalItem !== undefined && modifiedItem === undefined) {
        // Item removed
        changes.push({
          type: 'removed',
          path: currentPath,
          oldValue: originalItem,
          description: `Removed ${this.getItemDescription(originalItem, basePath)} at index ${i}`
        })
      } else if (originalItem !== undefined && modifiedItem !== undefined) {
        // Item potentially modified
        if (itemComparer) {
          itemComparer(originalItem, modifiedItem, currentPath, changes)
        } else {
          this.compareValues(originalItem, modifiedItem, currentPath, changes)
        }
      }
    }
  }

  /**
   * Compare two objects and detect changes
   */
  private static compareObjects(
    original: Record<string, unknown>,
    modified: Record<string, unknown>,
    basePath: string[],
    changes: JsonChange[]
  ): void {
    const allKeys = new Set([...Object.keys(original), ...Object.keys(modified)])
    
    for (const key of allKeys) {
      const currentPath = [...basePath, key]
      const originalValue = original[key]
      const modifiedValue = modified[key]
      
      if (originalValue === undefined && modifiedValue !== undefined) {
        changes.push({
          type: 'added',
          path: currentPath,
          newValue: modifiedValue,
          description: `Added ${key}: ${this.formatValue(modifiedValue)}`
        })
      } else if (originalValue !== undefined && modifiedValue === undefined) {
        changes.push({
          type: 'removed',
          path: currentPath,
          oldValue: originalValue,
          description: `Removed ${key}: ${this.formatValue(originalValue)}`
        })
      } else if (originalValue !== undefined && modifiedValue !== undefined) {
        this.compareValues(originalValue, modifiedValue, currentPath, changes)
      }
    }
  }

  /**
   * Compare two jobs
   */
  private static compareJobs(
    original: Vrp.Job,
    modified: Vrp.Job,
    path: string[],
    changes: JsonChange[]
  ): void {
    // Compare name (should be immutable, but check anyway)
    this.compareValues(original.name, modified.name, [...path, 'name'], changes)
    
    // Compare other properties
    const properties = [
      'duration', 'complexity', 'priority', 'urgency', 'padding',
      'plannedArrival', 'plannedDate', 'plannedResource'
    ]
    
    for (const prop of properties) {
      const originalValue = (original as unknown as Record<string, unknown>)[prop]
      const modifiedValue = (modified as unknown as Record<string, unknown>)[prop]
      this.compareValues(originalValue, modifiedValue, [...path, prop], changes)
    }
    
    // Compare location
    if (original.location || modified.location) {
      this.compareObjects(
        (original.location as unknown as Record<string, unknown>) || {},
        (modified.location as unknown as Record<string, unknown>) || {},
        [...path, 'location'],
        changes
      )
    }
    
    // Compare load array
    if (original.load || modified.load) {
      this.compareArrays(
        original.load || [],
        modified.load || [],
        [...path, 'load'],
        changes
      )
    }
    
    // Compare windows array
    if (original.windows || modified.windows) {
      this.compareArrays(
        original.windows || [],
        modified.windows || [],
        [...path, 'windows'],
        changes,
        (origWindow, modWindow, windowPath, windowChanges) => {
          this.compareObjects(origWindow as unknown as Record<string, unknown>, modWindow as unknown as Record<string, unknown>, windowPath, windowChanges)
        }
      )
    }
    
    // Compare tags array
    if (original.tags || modified.tags) {
      this.compareArrays(
        original.tags || [],
        modified.tags || [],
        [...path, 'tags'],
        changes,
        (origTag, modTag, tagPath, tagChanges) => {
          this.compareObjects(origTag as unknown as Record<string, unknown>, modTag as unknown as Record<string, unknown>, tagPath, tagChanges)
        }
      )
    }
  }

  /**
   * Compare two resources
   */
  private static compareResources(
    original: Vrp.Resource,
    modified: Vrp.Resource,
    path: string[],
    changes: JsonChange[]
  ): void {
    // Compare name (should be immutable, but check anyway)
    this.compareValues(original.name, modified.name, [...path, 'name'], changes)
    
    // Compare other properties
    const properties = ['category', 'hourlyCost', 'maxDriveTime', 'maxDriveTimeInSeconds', 'maxDriveTimeJob']
    
    for (const prop of properties) {
      const originalValue = (original as unknown as Record<string, unknown>)[prop]
      const modifiedValue = (modified as unknown as Record<string, unknown>)[prop]
      this.compareValues(originalValue, modifiedValue, [...path, prop], changes)
    }
    
    // Compare capacity array
    if (original.capacity || modified.capacity) {
      this.compareArrays(
        original.capacity || [],
        modified.capacity || [],
        [...path, 'capacity'],
        changes
      )
    }
    
    // Compare tags array
    if (original.tags || modified.tags) {
      this.compareArrays(
        original.tags || [],
        modified.tags || [],
        [...path, 'tags'],
        changes
      )
    }
    
    // Compare shifts array
    this.compareArrays(
      original.shifts || [],
      modified.shifts || [],
      [...path, 'shifts'],
      changes,
      (origShift, modShift, shiftPath, shiftChanges) => {
        this.compareObjects(origShift as unknown as Record<string, unknown>, modShift as unknown as Record<string, unknown>, shiftPath, shiftChanges)
      }
    )
    
    // Compare rules array
    if (original.rules || modified.rules) {
      this.compareArrays(
        original.rules || [],
        modified.rules || [],
        [...path, 'rules'],
        changes,
        (origRule, modRule, rulePath, ruleChanges) => {
          this.compareObjects(origRule as Record<string, unknown>, modRule as Record<string, unknown>, rulePath, ruleChanges)
        }
      )
    }
  }

  /**
   * Compare two relations
   */
  private static compareRelations(
    original: Vrp.Relation,
    modified: Vrp.Relation,
    path: string[],
    changes: JsonChange[]
  ): void {
    this.compareObjects(original as unknown as Record<string, unknown>, modified as unknown as Record<string, unknown>, path, changes)
  }

  /**
   * Compare two primitive values
   */
  private static compareValues(
    original: unknown,
    modified: unknown,
    path: string[],
    changes: JsonChange[]
  ): void {
    if (JSON.stringify(original) !== JSON.stringify(modified)) {
      changes.push({
        type: 'modified',
        path,
        oldValue: original,
        newValue: modified,
        description: `Changed ${path[path.length - 1]}: ${this.formatValue(original)} → ${this.formatValue(modified)}`
      })
    }
  }

  /**
   * Find the text position of a JSON path in the formatted text
   */
  private static findTextPosition(path: string[], lines: string[]): TextPosition | undefined {
    let currentIndentLevel = 0
    let pathIndex = 0
    
    // Handle root level paths
    if (path.length === 0) return undefined
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex]
      const trimmedLine = line.trim()
      
      if (trimmedLine === '') continue
      
      // Calculate indent level
      const leadingSpaces = line.length - line.trimStart().length
      const indentLevel = Math.floor(leadingSpaces / 2) // Assuming 2-space indentation
      
      // Check if this line contains the key we're looking for
      if (pathIndex < path.length) {
        const targetKey = path[pathIndex]
        
        // For array indices, look for the array element
        if (/^\d+$/.test(targetKey)) {
          if (indentLevel === currentIndentLevel + 1 && trimmedLine.startsWith('{')) {
            const arrayIndex = parseInt(targetKey)
            let elementCount = 0
            
            // Count array elements to find the right index
            for (let i = lineIndex; i >= 0; i--) {
              const prevLine = lines[i].trim()
              if (prevLine.startsWith('{') || prevLine === '{') {
                if (elementCount === arrayIndex) {
                  return {
                    line: lineIndex + 1, // Monaco uses 1-based line numbers
                    column: leadingSpaces + 1, // Monaco uses 1-based column numbers
                    length: trimmedLine.length
                  }
                }
                elementCount++
              }
            }
          }
        } else {
          // Look for object key
          if (trimmedLine.includes(`"${targetKey}":`)) {
            if (pathIndex === path.length - 1) {
              // This is the final key we're looking for
              const keyStart = line.indexOf(`"${targetKey}":`)
              return {
                line: lineIndex + 1,
                column: keyStart + 1,
                length: trimmedLine.length
              }
            } else {
              // Continue searching deeper
              pathIndex++
              currentIndentLevel = indentLevel
            }
          }
        }
      }
    }
    
    return undefined
  }

  /**
   * Calculate highlight range for a change
   */
  private static calculateHighlightRange(
    textPosition: TextPosition,
    change: JsonChange,
    lines: string[]
  ): { startLine: number; startColumn: number; endLine: number; endColumn: number } {
    const startLine = textPosition.line
    const startColumn = textPosition.column
    
    // For simple changes, highlight the entire line
    const line = lines[startLine - 1] // Convert to 0-based for array access
    const endColumn = startColumn + (line ? line.trim().length : textPosition.length)
    
    return {
      startLine,
      startColumn,
      endLine: startLine,
      endColumn
    }
  }

  /**
   * Get a human-readable description of an item
   */
  private static getItemDescription(item: unknown, basePath: string[]): string {
    if (basePath.includes('jobs') && typeof item === 'object' && item !== null) {
      const job = item as { name?: string }
      return `job "${job.name || 'unnamed'}"`
    }
    
    if (basePath.includes('resources') && typeof item === 'object' && item !== null) {
      const resource = item as { name?: string }
      return `resource "${resource.name || 'unnamed'}"`
    }
    
    return typeof item
  }

  /**
   * Format a value for display
   */
  private static formatValue(value: unknown): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return `"${value}"`
    if (typeof value === 'object') {
      return Array.isArray(value) ? `[${value.length} items]` : '{object}'
    }
    return String(value)
  }

  /**
   * Get a summary of changes by type
   */
  static getChangeSummary(changes: JsonChange[]): { added: number; modified: number; removed: number } {
    return changes.reduce(
      (summary, change) => {
        summary[change.type === 'added' ? 'added' : change.type === 'removed' ? 'removed' : 'modified']++
        return summary
      },
      { added: 0, modified: 0, removed: 0 }
    )
  }

  /**
   * Filter changes by type
   */
  static filterChangesByType(changes: JsonChange[], type: ChangeType): JsonChange[] {
    return changes.filter(change => change.type === type)
  }

  /**
   * Filter changes by path prefix
   */
  static filterChangesByPath(changes: JsonChange[], pathPrefix: string[]): JsonChange[] {
    return changes.filter(change => 
      pathPrefix.every((segment, index) => change.path[index] === segment)
    )
  }
}