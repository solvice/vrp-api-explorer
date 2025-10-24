# Quick Refactoring Guide

## Code Examples: Before & After

### 1. Duplication: Mobile Detection

#### Current (3 places with identical code)
```typescript
// VrpLayout.tsx
useEffect(() => {
  const checkIsMobile = () => {
    setIsMobile(window.matchMedia('(max-width: 768px)').matches)
  }
  checkIsMobile()
  const mediaQuery = window.matchMedia('(max-width: 768px)')
  mediaQuery.addEventListener('change', checkIsMobile)
  return () => mediaQuery.removeEventListener('change', checkIsMobile)
}, [])
```

#### Refactored: Create Custom Hook
```typescript
// lib/hooks/useMobileDetection.ts
export function useMobileDetection(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.matchMedia(`(max-width: ${breakpoint}px)`).matches)
    }
    
    checkIsMobile()
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`)
    mediaQuery.addEventListener('change', checkIsMobile)
    
    return () => mediaQuery.removeEventListener('change', checkIsMobile)
  }, [breakpoint])
  
  return isMobile
}
```

**Usage:**
```typescript
// VrpLayout.tsx
const isMobile = useMobileDetection(768)
```

---

### 2. Duplication: Keyboard Shortcuts

#### Current (2 places with similar code)
```typescript
// VrpAssistantContainer.tsx
useEffect(() => {
  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'k' && !event.shiftKey) {
      event.preventDefault()
      toggleAssistant()
    }
    if (event.key === 'Escape' && isOpen) {
      closeAssistant()
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isOpen, toggleAssistant, closeAssistant])
```

#### Refactored: Create Custom Hook
```typescript
// lib/hooks/useKeyboardShortcut.ts
export function useKeyboardShortcut(
  shortcuts: Array<{
    key: string | string[]
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
    callback: (event: KeyboardEvent) => void
  }>,
  dependencies: any[] = []
) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keys = Array.isArray(shortcut.key) ? shortcut.key : [shortcut.key]
        const keyMatches = keys.includes(event.key)
        const ctrlMatches = (shortcut.ctrl ?? false) === (event.ctrlKey || event.metaKey)
        const shiftMatches = (shortcut.shift ?? false) === event.shiftKey
        const altMatches = (shortcut.alt ?? false) === event.altKey
        
        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          event.preventDefault()
          shortcut.callback(event)
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, dependencies)
}
```

**Usage:**
```typescript
// VrpAssistantContainer.tsx
useKeyboardShortcut([
  {
    key: 'k',
    ctrl: true,
    callback: toggleAssistant
  },
  {
    key: 'Escape',
    callback: closeAssistant
  }
], [isOpen, toggleAssistant, closeAssistant])
```

---

### 3. Service Bloat: openai-service.ts

#### Current: 5 Concerns in 1 File (783 LOC)
```typescript
export class OpenAIService {
  // 1. Model selection logic
  private selectOptimalModel(context: ModelSelectionContext): ModelConfig { ... }
  
  // 2. Cost calculation
  private calculateCost(usage, model): number { ... }
  
  // 3. CSV conversion
  async convertCsvToVrp(csvContent, filename): Promise<CsvToVrpResponse> { ... }
  async convertCsvToVrpWithCodeInterpreter(files): Promise<CsvToVrpResponse> { ... }
  
  // 4. VRP modification
  async modifyVrpData(request): Promise<VrpModificationResponse> { ... }
  
  // 5. General chat
  async sendMessage(message, systemPrompt): Promise<string> { ... }
}
```

#### Refactored: 4 Focused Services

```typescript
// lib/model-selection-service.ts
export class ModelSelectionService {
  selectOptimalModel(context: ModelSelectionContext): ModelConfig { ... }
  calculateCost(usage, model): number { ... }
}

// lib/prompt-engineering-service.ts
export class PromptEngineeringService {
  buildModificationPrompt(data, request): string { ... }
  buildAnalysisPrompt(data, question): string { ... }
}

// lib/csv-conversion-service.ts
export class CsvConversionService {
  async convertCsvToVrp(content, filename): Promise<CsvToVrpResponse> { ... }
  async convertCsvToVrpWithCodeInterpreter(files): Promise<CsvToVrpResponse> { ... }
}

// lib/vrp-modification-service.ts
export class VrpModificationService {
  async modifyVrpData(request): Promise<VrpModificationResponse> { ... }
  async analyzeVrpData(request): Promise<string> { ... }
}

// Simplified openai-service.ts
export class OpenAIService {
  private modelService = new ModelSelectionService()
  private promptService = new PromptEngineeringService()
  private csvService = new CsvConversionService()
  private modifyService = new VrpModificationService()
  
  async sendMessage(message, systemPrompt): Promise<string> { ... }
}
```

---

### 4. Complex State Management: VrpAssistantContext

#### Current: 422 LOC with 22 methods mixing 4 concerns
```typescript
export function VrpAssistantProvider({ children }) {
  // Message management (custom hook)
  const { messages, addMessage, clearMessages } = useVrpMessages()
  
  // Processing state
  const [isProcessing, setIsProcessingState] = useState(false)
  
  // VRP data state
  const [vrpData, setVrpDataState] = useState<Vrp.VrpSyncSolveParams | null>(null)
  const [onVrpDataUpdate, setOnVrpDataUpdateState] = useState(...)
  
  // Chat mode state
  const [chatMode, setChatModeState] = useState<ChatMode>('modify')
  
  // AI service
  const [openAIService] = useState<OpenAIService | null>(null)
  
  // ALL logic mixed together:
  // - processUserMessage() - routes to 3 handlers
  // - handleModifyMode() - modifies VRP data
  // - handleAnalyzeMode() - analyzes VRP data
  // - processCsvUpload() - handles CSV with fallback
  // - processMultipleCsvUpload() - handles multiple CSVs
  // - handleConversionResult() - processes result
  // - handleConversionError() - error handling
  // - Keyboard shortcuts
  // - Toggle/open/close functions
}
```

#### Refactored: Split into 3 Focused Services

```typescript
// VrpAssistantProvider - Only manages state
export function VrpAssistantProvider({ children }) {
  const { messages, addMessage, clearMessages } = useVrpMessages()
  const [isProcessing, setIsProcessing] = useState(false)
  const [vrpData, setVrpData] = useState<Vrp.VrpSyncSolveParams | null>(null)
  const [chatMode, setChatMode] = useState<ChatMode>('modify')
  const [isOpen, setIsOpen] = useState(false)
  const [onVrpDataUpdate, setOnVrpDataUpdate] = useState(...)
  
  // Delegates to services instead of implementing logic
  const handler = new VrpAssistantMessageHandler(...)
  
  const context = {
    messages, addMessage, clearMessages,
    isProcessing, setProcessing,
    vrpData, setVrpData,
    chatMode, setChatMode,
    isOpen, toggleAssistant,
    onVrpDataUpdate, setOnVrpDataUpdate,
    // Delegate message processing
    processUserMessage: (msg) => handler.processUserMessage(msg),
    processCsvUpload: (csv, name) => handler.processCsvUpload(csv, name),
  }
  
  return <VrpAssistantContext.Provider value={context}>{children}</VrpAssistantContext.Provider>
}

// lib/vrp-assistant-message-handler.ts
export class VrpAssistantMessageHandler {
  async processUserMessage(message: string, mode: ChatMode) {
    // Route based on mode
    switch(mode) {
      case 'modify': return this.handleModifyMode(message)
      case 'analyze': return this.handleAnalyzeMode(message)
      case 'convert': return this.handleConvertMode(message)
    }
  }
  
  private async handleModifyMode(message: string) { ... }
  private async handleAnalyzeMode(message: string) { ... }
  private async handleConvertMode(message: string) { ... }
}

// lib/csv-upload-handler.ts
export class CsvUploadHandler {
  async processCsvUpload(csv: string, filename: string) { ... }
  async processMultipleCsvUpload(files: Array<...>) { ... }
}
```

---

### 5. Component Size: VrpJsonEditor (701 LOC)

#### Current: 6 Concerns Mixed
```typescript
export function VrpJsonEditor(props) {
  // 1. Monaco editor state & config
  const [jsonString, setJsonString] = useState(...)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const handleMonacoChange = (value) => { ... }
  const handleEditorDidMount = (editor) => { ... }
  
  // 2. Validation logic
  const [validationResult, setValidationResult] = useState(...)
  const validateData = useCallback((data) => { ... }, [])
  const renderValidationErrors = () => { ... }
  
  // 3. Highlighting logic
  const [parseError, setParseError] = useState(null)
  function highlightChangesAndScroll(editor, oldJson, newJson) { ... }
  injectAIHighlightStyles()
  
  // 4. AI integration
  const { setVrpData, setOnVrpDataUpdate } = useVrpAssistant()
  useEffect(() => { setVrpData(...) }, [...])
  useEffect(() => { setOnVrpDataUpdate((newData) => { ... }) }, [...])
  
  // 5. API key management
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const handleApiKeySubmit = () => { ... }
  
  // 6. Sample & job loading
  const handleSampleChange = (sample) => { ... }
  const [isLoadJobDialogOpen, setIsLoadJobDialogOpen] = useState(false)
  
  return <div>...</div>
}
```

#### Refactored: Extract into Focused Components

```typescript
// components/VrpJsonEditor/VrpJsonEditor.tsx (container)
export function VrpJsonEditor(props) {
  const [validation, setValidation] = useState(...)
  const [isLoading, setIsLoading] = useState(false)
  
  return (
    <div>
      <EditorToolbar {...props} />
      <JsonEditorCore 
        {...props}
        onValidationChange={setValidation}
      />
      <EditorValidationPanel errors={validation.errors} />
    </div>
  )
}

// components/VrpJsonEditor/EditorToolbar.tsx
export function EditorToolbar({ onApiKeyChange, onSampleChange, ... }) {
  return (
    <div>
      <ApiKeySettings {...} />
      <SampleSelector {...} />
      <LoadJobButton {...} />
    </div>
  )
}

// components/VrpJsonEditor/JsonEditorCore.tsx
export function JsonEditorCore({ ... }) {
  const [jsonString, setJsonString] = useState(...)
  const editorRef = useRef(...)
  const handleMonacoChange = (value) => { ... }
  const handleEditorDidMount = (editor) => { ... }
  
  return <Editor {...} />
}

// components/VrpJsonEditor/EditorValidationPanel.tsx
export function EditorValidationPanel({ errors, parseError }) {
  return <div>{/* Validation display */}</div>
}

// lib/hooks/useEditorHighlighting.ts
export function useEditorHighlighting(editor) {
  const highlightChanges = (oldJson, newJson) => { ... }
  const clearHighlights = () => { ... }
  return { highlightChanges, clearHighlights }
}
```

---

## Quick Wins (Do These First!)

### Priority 1: Extract Hooks (2-3 hours)
- [ ] `useMobileDetection()` - removes 3 duplication points
- [ ] `useKeyboardShortcut()` - removes 2 duplication points
- [ ] `useEditorHighlighting()` - simplifies VrpJsonEditor

### Priority 2: Add Tests (4-6 hours)
- [ ] Test `highlight-manager.ts` (466 LOC with 0 tests)
- [ ] Test `monaco-highlighter.ts` (398 LOC with 0 tests)
- [ ] Test map services (484 LOC combined with 0 tests)

### Priority 3: Split Services (2-3 days)
- [ ] Split `openai-service.ts` into 4 services
- [ ] Extract highlighting from `VrpJsonEditor`
- [ ] Split `json-diff-service.ts`

---

## Effort Estimate Summary

| Task | Effort | Risk | Impact |
|------|--------|------|--------|
| Extract hooks | 2-3 hrs | Low | High (removes duplication) |
| Add visualization tests | 4-6 hrs | Low | Medium (improves coverage) |
| Split openai-service | 2-3 days | Medium | High (reduces complexity) |
| Refactor VrpJsonEditor | 1-2 days | Medium | High (improves maintainability) |
| Simplify VrpAssistantContext | 2-3 days | High | High (improves state clarity) |
| Extract Context layer | 1-2 days | Medium | Medium (reduces prop drilling) |

**Total: 12-20 days**

---

## File-by-File Refactoring Checklist

```
CRITICAL (>700 LOC):
[ ] openai-service.ts (783) → 4 services
[ ] VrpJsonEditor.tsx (701) → 3 components + hooks

HIGH (500-700 LOC):
[ ] json-diff-service.ts (512) → 2 focused services
[ ] VrpGantt.tsx (510) → split timeline & drag-drop

MEDIUM (400-500 LOC):
[ ] highlight-manager.ts (466) → extract concerns + add tests
[ ] vrp-analyzer.ts (456) → review concerns
[ ] message-input.tsx (464) → extract audio & file handling
[ ] monaco-highlighter.ts (398) → extract animations + add tests

REFACTORING OPPORTUNITIES:
[ ] VrpKpiPanel.tsx (445) → extract KPI calculation logic
[ ] VrpAssistantContext.tsx (422) → split into services
[ ] ShadcnChatInterface.tsx (380) → extract suggestions & mode logic
```

---

**Generated for VRP Explorer Codebase**  
**Analysis Date:** October 21, 2025
