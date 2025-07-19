# VRP Assistant Feature Specification

## Overview
The VRP Assistant is an AI-powered chatbot feature that allows users to modify VRP JSON requests using natural language commands. Users can request changes like "add time windows on the job" or "add another resource" and the AI will intelligently modify the JSON while ensuring schema validation.

## Core Functionality

### AI Integration
- **API Provider**: OpenAI API
- **Context**: Include VRP JSON schema definition for structure understanding
- **Validation**: All AI-generated JSON must pass VRP schema validation
- **Error Handling**: Transparent retry with user feedback on validation failures
- **Behavior Mode**: Adaptive - starts simple, provides more detail when needed

### User Interface Design

#### AI Button
- **Location**: Floating button in top-right corner of JSON editor pane
- **Design**: Small rectangular button with AI icon
- **States**:
  - Default: Static AI icon
  - Processing: Loading spinner
  - Active: Pressed/active state when chatbot pane is open
- **Interaction**: Click to toggle chatbot pane open/closed

#### Chatbot Pane
- **Layout**: Appears below the request JSON pane using shadcn resizable components
- **Initial Height**: 50% of available space
- **Resizable**: Users can drag to adjust height between JSON editor and chatbot
- **Component Base**: https://shadcn-chatbot-kit.vercel.app/

### Initial Chatbot Behavior
When the chatbot pane opens, it should:
1. Analyze the current JSON structure
2. Display 2-3 dynamic suggestions based on potential improvements (e.g., "I notice you have 16 jobs but only 1 vehicle - would you like me to add more vehicles?")
3. Show 1-2 generic examples for fallback
4. Wait for user input

### Change Management

#### JSON Modification Flow
1. User submits natural language request
2. AI processes request with current JSON + VRP schema context
3. AI generates modified JSON
4. System validates against VRP schema
5. If valid: Apply changes with highlighting
6. If invalid: Show transparent retry message and attempt again
7. After max retries: Show error and ask for clarification

#### Change Highlighting
- **Behavior**: Smart highlights that disappear when user starts typing in highlighted area but persist elsewhere
- **Color Scheme**:
  - Green background: Additions
  - Yellow background: Modifications  
  - Red background: Deletions
- **Persistence**: Keep chatbot pane open for further modifications

### Data Persistence
- **Chat History**: Stored in browser's local storage
- **Persistence**: Survives page reloads
- **Management**: "Clear Chat" button available in chatbot interface

## Technical Implementation

### State Management
- Chatbot pane open/closed state
- AI processing state (loading indicators)
- Change highlighting state
- Chat conversation history

### API Integration
- OpenAI API calls with VRP schema context
- Error handling for API failures
- Token management and cost optimization

### Validation Pipeline
- Real-time schema validation of AI-generated JSON
- Integration with existing VRP validation system
- Error message translation for user feedback

### Monaco Editor Integration
- Change highlighting with smart persistence
- Seamless integration with existing folding/editing features
- Highlight management (apply, clear, fade behaviors)

## User Experience Flow

### First Use
1. User sees floating AI button in JSON editor
2. Clicks button → chatbot pane opens with contextual suggestions
3. User types natural language request
4. AI modifies JSON with highlighted changes
5. User can make additional requests or continue manual editing

### Typical Session
1. User requests modification via chat
2. AI provides transparent feedback during processing
3. Changes applied with visual highlighting
4. User can immediately see what changed
5. Conversation continues for iterative refinement
6. Chat history persists across page reloads

### Error Scenarios
1. Invalid JSON generated → AI shows "The generated JSON was invalid, let me try again..." and retries
2. API failure → Clear error message with option to retry
3. Unclear request → AI asks for clarification
4. Schema violation → AI explains what went wrong and suggests alternatives

## Examples of AI Interactions

### Dynamic Suggestions (based on current JSON)
- "I notice you have 16 jobs but only 1 vehicle - would you like me to add more vehicles?"
- "Your jobs don't have time windows - shall I add delivery time constraints?"
- "Resource 'vehicle_north' works 10 hours straight - should I add a break?"

### Generic Examples
- "Add time windows to jobs"
- "Add another resource with different working hours"
- "Modify vehicle capacity or speed"

### User Requests
- "Add time windows from 9 AM to 5 PM on all delivery jobs"
- "Create a second vehicle that works evening shifts"
- "Resource John needs another shift tomorrow from 8 AM to 4 PM"
- "Add capacity constraints of 1000kg to all vehicles"

## Success Metrics
- JSON modification accuracy (valid schema compliance)
- User adoption rate (clicks on AI button)
- Session engagement (multiple modifications per session)
- Error recovery rate (successful retries after validation failures)

## Future Enhancements
- Full VRP documentation context if schema-only proves insufficient
- Voice input for hands-free JSON editing
- Preset modification templates
- Undo/redo functionality for AI changes
- Export chat conversations for documentation