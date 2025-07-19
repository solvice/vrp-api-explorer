# VRP Assistant Implementation Plan

## Overview
This plan breaks down the VRP Assistant feature into small, testable increments that build upon each other. Each step includes comprehensive testing and follows TDD principles.

## Architecture Overview

### Core Components
1. **VrpAssistantButton** - Floating AI button with state management
2. **VrpAssistantPane** - Resizable chatbot interface
3. **ChatbotInterface** - Message handling and UI (based on shadcn-chatbot-kit)
4. **OpenAIService** - API integration with VRP schema context
5. **JsonHighlighter** - Monaco Editor change highlighting
6. **ChatPersistence** - Local storage management
7. **VrpAnalyzer** - JSON analysis for contextual suggestions

### State Management Architecture
- React Context for assistant state (open/closed, processing)
- Local state for chat messages and highlighting
- Integration with existing VRP validation system

## Implementation Phases

### Phase 1: Foundation & Basic UI (Steps 1-3)
Build the basic UI components with proper state management and testing infrastructure.

### Phase 2: Chat Interface & Persistence (Steps 4-6)
Implement the chatbot interface with message handling and local storage.

### Phase 3: AI Integration (Steps 7-9)
Add OpenAI API integration with VRP schema context and error handling.

### Phase 4: JSON Modification & Highlighting (Steps 10-12)
Implement JSON change detection, modification, and Monaco Editor highlighting.

### Phase 5: Advanced Features & Polish (Steps 13-15)
Add contextual suggestions, advanced error handling, and final integration.

---

## Step-by-Step Implementation

### Step 1: VRP Assistant State Management & Button Foundation
**Goal**: Create the basic state management and floating button component.

**Deliverables**:
- VrpAssistantContext with state management
- Basic VrpAssistantButton component with positioning
- Test infrastructure for assistant state

**Tests**:
- Context provider state management
- Button rendering and positioning
- State transitions (closed → open → closed)

### Step 2: Resizable Pane Layout Integration
**Goal**: Add the resizable pane that appears below the JSON editor.

**Deliverables**:
- VrpAssistantPane component using shadcn ResizablePanelGroup
- Integration with existing VrpJsonEditor layout
- Proper height management (50% initial)

**Tests**:
- Pane visibility based on state
- Resizing functionality
- Layout preservation with JSON editor

### Step 3: Basic Chat Interface Foundation
**Goal**: Create the basic chat UI structure without AI functionality.

**Deliverables**:
- ChatInterface component with message list and input
- Message components (user/assistant messages)
- Basic styling matching shadcn-chatbot-kit

**Tests**:
- Chat UI rendering
- Message display and formatting
- Input field functionality

### Step 4: Chat Message Management
**Goal**: Implement message state management and basic chat flow.

**Deliverables**:
- Message state management in context
- Add message functionality
- Message types (user, assistant, system, error)

**Tests**:
- Message addition and state updates
- Different message type rendering
- Message list scrolling and behavior

### Step 5: Local Storage Persistence
**Goal**: Add chat history persistence with local storage.

**Deliverables**:
- ChatPersistence service
- Save/load chat history from localStorage
- Clear chat functionality

**Tests**:
- Chat history saving and loading
- Persistence across component remounts
- Clear chat functionality
- Storage error handling

### Step 6: OpenAI Service Foundation
**Goal**: Create the OpenAI API integration service with basic error handling.

**Deliverables**:
- OpenAIService class with API integration
- Environment variable configuration
- Basic error handling and retries

**Tests**:
- API service initialization
- Error handling for network issues
- Retry logic testing
- API key validation

### Step 7: VRP Schema Integration
**Goal**: Add VRP schema context to OpenAI calls.

**Deliverables**:
- VRP schema integration with OpenAI prompts
- Prompt engineering for VRP context
- Token optimization strategies

**Tests**:
- Schema inclusion in API calls
- Prompt formatting validation
- Token counting and optimization

### Step 8: JSON Modification Pipeline
**Goal**: Implement the AI JSON modification with validation.

**Deliverables**:
- AI request processing with current JSON context
- JSON validation integration
- Retry logic for invalid JSON

**Tests**:
- JSON modification requests
- Schema validation integration
- Retry behavior on validation failures
- Error message handling

### Step 9: Monaco Editor Change Detection
**Goal**: Implement change detection and highlighting in Monaco Editor.

**Deliverables**:
- JsonDiffService for detecting changes
- Change highlighting utilities
- Monaco Editor decoration management

**Tests**:
- Change detection algorithms
- Highlighting application and removal
- Different change types (add/modify/delete)

### Step 10: Smart Highlighting System
**Goal**: Implement smart highlighting that persists correctly.

**Deliverables**:
- Smart highlighting that fades on user edit
- Color scheme implementation (green/yellow/red)
- Highlight persistence management

**Tests**:
- Highlight behavior on user edits
- Color application for different change types
- Highlight cleanup and persistence

### Step 11: VRP Analyzer for Contextual Suggestions
**Goal**: Create intelligent analysis of VRP JSON for suggestions.

**Deliverables**:
- VrpAnalyzer service for JSON analysis
- Dynamic suggestion generation
- Fallback generic suggestions

**Tests**:
- VRP structure analysis
- Suggestion generation logic
- Edge cases and empty JSON handling

### Step 12: Complete AI Chat Flow
**Goal**: Wire together the complete AI interaction flow.

**Deliverables**:
- Complete user request → AI response → JSON update flow
- Processing states and loading indicators
- Error recovery and user feedback

**Tests**:
- End-to-end chat flow
- Loading state management
- Error scenarios and recovery
- User experience validation

### Step 13: Advanced Error Handling
**Goal**: Implement comprehensive error handling and user feedback.

**Deliverables**:
- Transparent retry messaging
- API failure handling
- Validation error translation

**Tests**:
- All error scenarios
- User feedback accuracy
- Recovery mechanisms

### Step 14: Integration & State Synchronization
**Goal**: Ensure proper integration with existing VRP components.

**Deliverables**:
- VrpJsonEditor integration
- State synchronization with validation
- Existing feature compatibility

**Tests**:
- Integration with existing validation
- State consistency across components
- No regressions in existing features

### Step 15: Performance Optimization & Final Polish
**Goal**: Optimize performance and add final polish features.

**Deliverables**:
- Performance optimization
- Accessibility improvements
- Final UI polish and animations

**Tests**:
- Performance benchmarks
- Accessibility compliance
- Cross-browser compatibility

---

## TDD Prompts for Implementation

### Prompt 1: VRP Assistant State Management & Button Foundation

```
Implement the VRP Assistant state management and floating button component using Test-Driven Development.

Requirements:
1. Create a VrpAssistantContext that manages:
   - isOpen: boolean (chatbot pane visibility)
   - isProcessing: boolean (AI request in progress)
   - togglePane: function to open/close chatbot
   - setProcessing: function to update processing state

2. Create a VrpAssistantButton component:
   - Floating button positioned in top-right of JSON editor pane
   - AI icon (use Lucide's Bot icon)
   - Three states: default, processing (spinner), active (when pane open)
   - Click handler to toggle pane visibility

3. Write comprehensive tests for:
   - Context state management and transitions
   - Button rendering in all states
   - Click handling and state updates
   - Button positioning and styling

Start with failing tests, then implement the minimal code to make them pass. Use TypeScript and follow the existing project conventions.

Existing imports you can use:
- React hooks and context
- Lucide icons (Bot, Loader2)
- Tailwind CSS classes
- @/components/ui/* components

File structure:
- components/VrpAssistant/VrpAssistantContext.tsx
- components/VrpAssistant/VrpAssistantButton.tsx
- __tests__/VrpAssistant/VrpAssistantButton.test.tsx
```

### Prompt 2: Resizable Pane Layout Integration

```
Implement the resizable pane layout for the VRP Assistant using shadcn ResizablePanelGroup, following TDD principles.

Requirements:
1. Create VrpAssistantPane component:
   - Only renders when isOpen is true
   - Uses ResizablePanelGroup for layout
   - Initial height of 50% of available space
   - Smooth transitions when opening/closing

2. Modify VrpJsonEditor to integrate the resizable layout:
   - JSON editor in top panel
   - Assistant pane in bottom panel (when open)
   - Maintain existing functionality

3. Write tests for:
   - Pane visibility based on context state
   - Resizing functionality
   - Layout preservation and transitions
   - Integration with existing JSON editor

The pane should be a placeholder for now (just show "VRP Assistant Chat" text).

Use:
- @/components/ui/resizable components
- VrpAssistantContext from previous step
- Existing VrpJsonEditor structure

Files:
- components/VrpAssistant/VrpAssistantPane.tsx
- Update components/VrpJsonEditor.tsx
- __tests__/VrpAssistant/VrpAssistantPane.test.tsx
```

### Prompt 3: Basic Chat Interface Foundation

```
Create the basic chat interface structure following the shadcn-chatbot-kit design patterns, using TDD.

Requirements:
1. Create ChatInterface component:
   - Message list area with scroll
   - Message input field at bottom
   - Send button with proper states
   - Basic styling matching shadcn-chatbot-kit aesthetic

2. Create message components:
   - UserMessage component
   - AssistantMessage component  
   - SystemMessage component (for errors/info)
   - Proper avatar/icon handling

3. Write tests for:
   - Chat interface rendering
   - Message display and formatting
   - Input field functionality and validation
   - Send button states (enabled/disabled)

For now, use mock data and basic message handling (no AI integration yet).

References:
- https://shadcn-chatbot-kit.vercel.app/ for design patterns
- Use Tailwind CSS for styling
- Lucide icons for avatars and buttons

Files:
- components/VrpAssistant/ChatInterface.tsx
- components/VrpAssistant/messages/UserMessage.tsx
- components/VrpAssistant/messages/AssistantMessage.tsx
- components/VrpAssistant/messages/SystemMessage.tsx
- __tests__/VrpAssistant/ChatInterface.test.tsx
```

### Prompt 4: Chat Message Management

```
Implement chat message state management and flow control using TDD principles.

Requirements:
1. Extend VrpAssistantContext with message management:
   - messages: ChatMessage[] array
   - addMessage: function to add new messages
   - clearMessages: function to clear chat history
   - ChatMessage type definition with id, type, content, timestamp

2. Implement message flow:
   - User types message and hits send/enter
   - Message added to state with proper type
   - Input field clears after sending
   - Auto-scroll to latest message

3. Message types to support:
   - user: User input messages
   - assistant: AI responses
   - system: System notifications
   - error: Error messages

4. Write comprehensive tests:
   - Message state management
   - Message addition and state updates
   - Message type handling and rendering
   - Input field behavior and validation
   - Auto-scroll functionality

Connect the ChatInterface to use the real state management instead of mock data.

Files:
- Update components/VrpAssistant/VrpAssistantContext.tsx
- Update components/VrpAssistant/ChatInterface.tsx
- types/VrpAssistant.ts (for type definitions)
- __tests__/VrpAssistant/ChatMessage.test.tsx
```

### Prompt 5: Local Storage Persistence

```
Implement chat history persistence using localStorage, following TDD principles.

Requirements:
1. Create ChatPersistence service:
   - saveChatHistory(messages): Save to localStorage
   - loadChatHistory(): Load from localStorage
   - clearChatHistory(): Remove from localStorage
   - Error handling for storage quota/access issues

2. Integrate with VrpAssistantContext:
   - Load chat history on context initialization
   - Save chat history when messages change
   - Add clearChat function that updates both state and storage

3. Add Clear Chat button to ChatInterface:
   - Button in chat header area
   - Confirmation dialog before clearing
   - Updates both UI and persistence

4. Write comprehensive tests:
   - localStorage save/load operations
   - Error handling for storage issues
   - Chat history persistence across component remounts
   - Clear functionality validation
   - Edge cases (corrupted data, quota exceeded)

Use localStorage key: 'vrp-assistant-chat-history'

Files:
- lib/ChatPersistence.ts
- Update components/VrpAssistant/VrpAssistantContext.tsx
- Update components/VrpAssistant/ChatInterface.tsx
- __tests__/lib/ChatPersistence.test.ts
```

### Prompt 6: OpenAI Service Foundation

```
Create the OpenAI API integration service with proper error handling, using TDD.

Requirements:
1. Create OpenAIService class:
   - Initialize with API key from environment
   - sendChatRequest(messages, context): Send request to OpenAI
   - Proper error handling for network/API issues
   - Retry logic with exponential backoff (max 3 retries)

2. Environment configuration:
   - NEXT_PUBLIC_OPENAI_API_KEY environment variable
   - Validation that API key is provided
   - Development vs production considerations

3. Error handling:
   - Network errors
   - API rate limits
   - Invalid API key
   - Malformed responses

4. Write comprehensive tests:
   - Service initialization and validation
   - API request formatting
   - Error handling for different failure scenarios
   - Retry logic behavior
   - Mock API responses for testing

Don't integrate with the chat flow yet - focus on the service foundation and testing.

Files:
- lib/OpenAIService.ts
- Update next.config.js if needed for env vars
- __tests__/lib/OpenAIService.test.ts
```

### Prompt 7: VRP Schema Integration

```
Integrate VRP schema context with OpenAI API calls, using TDD principles.

Requirements:
1. Create VRP schema context for AI:
   - Extract VRP schema from existing validation
   - Format schema for OpenAI system prompt
   - Create VRP-specific prompt templates

2. Enhance OpenAIService:
   - Add sendVrpRequest method that includes schema context
   - Optimize token usage while maintaining schema accuracy
   - Format system prompts for VRP understanding

3. Prompt engineering:
   - System prompt explaining VRP concepts
   - Schema definitions and constraints
   - Examples of valid modifications
   - Error handling instructions for AI

4. Write comprehensive tests:
   - Schema extraction and formatting
   - Prompt template generation
   - Token optimization validation
   - API request formatting with VRP context
   - Mock responses for different VRP scenarios

Use the existing VRP schema from lib/vrp-schema.ts as the source.

Files:
- lib/VrpSchemaContext.ts
- Update lib/OpenAIService.ts
- __tests__/lib/VrpSchemaContext.test.ts
- Update __tests__/lib/OpenAIService.test.ts
```

### Prompt 8: JSON Modification Pipeline

```
Implement the AI JSON modification pipeline with validation, using TDD.

Requirements:
1. Create JsonModificationService:
   - processModificationRequest(currentJson, userRequest): Main pipeline
   - Integration with OpenAI for JSON generation
   - VRP schema validation of AI responses
   - Retry logic for invalid JSON (max 3 attempts)

2. Error handling and feedback:
   - Clear error messages for validation failures
   - Transparent retry messaging
   - Fallback suggestions when retries fail

3. Integration with chat flow:
   - Update VrpAssistantContext with processing state
   - Add handleUserMessage function that triggers AI processing
   - Update chat messages with AI responses or errors

4. Write comprehensive tests:
   - JSON modification pipeline end-to-end
   - Schema validation integration
   - Retry behavior on validation failures
   - Error message generation and formatting
   - Chat state updates during processing

Connect this to the existing chat interface so user messages trigger AI processing.

Files:
- lib/JsonModificationService.ts
- Update components/VrpAssistant/VrpAssistantContext.tsx
- Update components/VrpAssistant/ChatInterface.tsx
- __tests__/lib/JsonModificationService.test.ts
```

### Prompt 9: Monaco Editor Change Detection

```
Implement change detection and basic highlighting for Monaco Editor, using TDD.

Requirements:
1. Create JsonDiffService:
   - compareJson(oldJson, newJson): Detect changes
   - generateChangeMap(): Create change metadata
   - Support for additions, modifications, deletions
   - Line-level change tracking for Monaco integration

2. Create MonacoHighlighter service:
   - applyHighlights(editor, changes): Apply decorations
   - removeHighlights(editor): Clear decorations
   - Color scheme: green (add), yellow (modify), red (delete)

3. Change detection algorithm:
   - Deep object comparison
   - Path tracking for nested changes
   - Line number mapping for Monaco

4. Write comprehensive tests:
   - JSON comparison accuracy
   - Change detection for various scenarios
   - Monaco decoration application
   - Highlight removal and cleanup
   - Edge cases (empty objects, arrays, etc.)

Don't integrate with the full pipeline yet - focus on the core change detection and highlighting.

Files:
- lib/JsonDiffService.ts
- lib/MonacoHighlighter.ts
- __tests__/lib/JsonDiffService.test.ts
- __tests__/lib/MonacoHighlighter.test.ts
```

### Prompt 10: Smart Highlighting System

```
Implement the smart highlighting system that integrates with Monaco Editor, using TDD.

Requirements:
1. Enhance MonacoHighlighter with smart behavior:
   - Track user edits and remove highlights when user types in highlighted areas
   - Persist highlights elsewhere until manually cleared
   - Handle multiple highlight layers and updates

2. Create HighlightManager:
   - Manage highlight lifecycle
   - Integration with Monaco Editor events
   - Highlight persistence across JSON updates

3. VrpJsonEditor integration:
   - Connect highlighting to JSON modification pipeline
   - Update onChange handler to manage highlights
   - Add highlight state to component

4. Write comprehensive tests:
   - Smart highlighting behavior on user edits
   - Highlight persistence and cleanup
   - Monaco Editor event handling
   - Multiple highlight management
   - Integration with existing JSON editor functionality

This should complete the highlighting system and integrate it with the JSON modification flow.

Files:
- Update lib/MonacoHighlighter.ts
- lib/HighlightManager.ts
- Update components/VrpJsonEditor.tsx
- __tests__/lib/HighlightManager.test.ts
- Update __tests__/VrpJsonEditor.test.tsx
```

### Prompt 11: VRP Analyzer for Contextual Suggestions

```
Create the VRP analyzer that generates contextual suggestions, using TDD.

Requirements:
1. Create VrpAnalyzer service:
   - analyzeVrpStructure(jsonData): Analyze current VRP setup
   - generateSuggestions(): Create dynamic suggestions
   - getGenericExamples(): Fallback suggestions
   - Understand VRP concepts (jobs, resources, shifts, time windows)

2. Suggestion generation logic:
   - Detect missing time windows
   - Identify resource/job imbalances
   - Suggest capacity improvements
   - Recognize optimization opportunities

3. Integration with chat initialization:
   - Generate suggestions when chat opens
   - Update suggestions when JSON changes
   - Display in ChatInterface as initial messages

4. Write comprehensive tests:
   - VRP structure analysis accuracy
   - Suggestion generation logic
   - Different VRP scenarios and edge cases
   - Integration with chat interface
   - Fallback behavior for invalid JSON

The analyzer should understand the VRP domain deeply enough to provide meaningful suggestions.

Files:
- lib/VrpAnalyzer.ts
- Update components/VrpAssistant/VrpAssistantContext.tsx
- Update components/VrpAssistant/ChatInterface.tsx
- __tests__/lib/VrpAnalyzer.test.ts
```

### Prompt 12: Complete AI Chat Flow Integration

```
Wire together the complete AI interaction flow and finalize the core functionality, using TDD.

Requirements:
1. Complete end-to-end integration:
   - User message → AI processing → JSON update → highlighting
   - Proper state management throughout the flow
   - Error handling and recovery

2. Processing states and UI feedback:
   - Loading indicators during AI processing
   - Processing messages in chat
   - Button state updates (processing spinner)

3. JSON update pipeline:
   - Apply AI-generated changes to Monaco Editor
   - Trigger highlighting system
   - Update validation state
   - Maintain editor focus and cursor position

4. Write comprehensive end-to-end tests:
   - Complete user interaction flows
   - Error scenarios and recovery
   - State consistency across all components
   - Performance and responsiveness

This step should result in a fully functional VRP Assistant feature.

Files:
- Update all integration points
- Comprehensive integration tests
- __tests__/VrpAssistant/Integration.test.tsx
- Performance and usability testing
```

### Prompt 13: Advanced Error Handling & User Feedback

```
Implement comprehensive error handling and user feedback systems, using TDD.

Requirements:
1. Enhanced error handling:
   - OpenAI API failures (rate limits, network, auth)
   - JSON validation errors with specific feedback
   - Retry strategies with user visibility
   - Graceful degradation when services unavailable

2. User feedback improvements:
   - Clear error messages in chat
   - Progress indicators for long operations
   - Suggestion alternatives when requests fail
   - Help and guidance for unclear requests

3. Error recovery mechanisms:
   - Automatic retries with backoff
   - Manual retry options for users
   - Fallback to simpler modification approaches
   - Context preservation during errors

4. Write comprehensive tests:
   - All error scenarios and recovery paths
   - User feedback accuracy and helpfulness
   - Error message clarity and actionability
   - Recovery mechanism effectiveness

Focus on making the system robust and user-friendly even when things go wrong.

Files:
- lib/ErrorHandling.ts
- Update lib/JsonModificationService.ts
- Update components/VrpAssistant/ChatInterface.tsx
- __tests__/lib/ErrorHandling.test.ts
```

### Prompt 14: Integration & State Synchronization

```
Ensure proper integration with existing VRP components and state synchronization, using TDD.

Requirements:
1. VrpJsonEditor integration:
   - Proper state sharing between assistant and editor
   - Validation state synchronization
   - No conflicts with existing features (folding, manual editing)

2. State consistency:
   - JSON changes from assistant reflect in validation
   - Manual JSON edits don't break assistant state
   - Proper cleanup when switching between samples

3. Existing feature compatibility:
   - Ensure folding/unfolding still works
   - Sample selection continues to function
   - API key management unaffected
   - Send button behavior preserved

4. Write comprehensive integration tests:
   - Cross-component state synchronization
   - Regression testing for existing features
   - Edge cases and boundary conditions
   - Performance impact assessment

Ensure the VRP Assistant enhances rather than disrupts the existing workflow.

Files:
- Update components/VrpExplorer.tsx for integration
- Update components/VrpJsonEditor.tsx for compatibility
- __tests__/integration/VrpAssistantIntegration.test.tsx
- Regression tests for existing features
```

### Prompt 15: Performance Optimization & Final Polish

```
Optimize performance and add final polish to the VRP Assistant feature, using TDD.

Requirements:
1. Performance optimization:
   - Lazy loading of assistant components
   - Debounced highlighting updates
   - Efficient re-renders and memoization
   - Bundle size optimization

2. Accessibility improvements:
   - Keyboard navigation for chat interface
   - Screen reader support
   - Focus management when opening/closing panes
   - ARIA labels and descriptions

3. Final UI polish:
   - Smooth animations and transitions
   - Loading states and micro-interactions
   - Responsive design considerations
   - Dark/light theme compatibility

4. Write comprehensive tests:
   - Performance benchmarks and monitoring
   - Accessibility compliance testing
   - Cross-browser compatibility
   - Mobile responsiveness

This final step should deliver a production-ready feature that meets all requirements.

Files:
- Performance optimization across all components
- Accessibility enhancements
- Animation and transition improvements
- __tests__/performance/VrpAssistantPerformance.test.ts
- __tests__/accessibility/VrpAssistantA11y.test.ts
```

---

## Success Criteria

Each step must meet these criteria before proceeding:
1. ✅ All tests pass with good coverage (>90%)
2. ✅ TypeScript compilation without errors
3. ✅ ESLint and formatting compliance
4. ✅ Manual testing of implemented functionality
5. ✅ No regressions in existing features
6. ✅ Performance within acceptable bounds
7. ✅ Code review and documentation complete

## Risk Mitigation

- **API Costs**: Implement token limits and monitoring
- **Performance**: Profile and optimize at each step
- **User Experience**: Continuous user testing and feedback
- **Integration**: Careful state management and testing
- **Accessibility**: Built-in from the start, not retrofitted