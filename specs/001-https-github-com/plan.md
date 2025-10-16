# Implementation Plan: ChatKit-based VRP Analysis Chat Component

**Branch**: `001-https-github-com` | **Date**: 2025-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/Users/cvh/src/vrp-api-explorer/specs/001-https-github-com/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Project Type: web (Next.js frontend)
   → Structure Decision: Next.js app directory structure
3. Fill the Constitution Check section
   → ✅ Completed
4. Evaluate Constitution Check section
   → ✅ No violations detected
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → ✅ Complete
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md
   → ✅ Complete
7. Re-evaluate Constitution Check section
   → ✅ No new violations
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach
   → ✅ Complete
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 9. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Replace the existing VRP Assistant with OpenAI's ChatKit web component to provide expert-level VRP analysis through natural language conversation. The chat interface will offer read-only analysis capabilities including Q&A, optimization recommendations, scenario comparison, constraint debugging, what-if analysis, and solution validation. Chat sessions persist for browser session duration only and connect to OpenAI Agent Builder workflows.

**Key Technical Approach**:
- Integrate `@openai/chatkit-react` (already installed in dependencies)
- Remove existing VRP Assistant components (VrpAssistantProvider, VrpAssistantPane, ShadcnChatInterface)
- Create new ChatKit component using `<openai-chatkit>` web component
- Configure Agent Builder workflow with VRP-specific system prompts
- Implement API endpoint for ChatKit session creation
- Maintain VRP context passing to chat for analysis capabilities

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15.5.4, React 19.1.1
**Primary Dependencies**:
- `@openai/chatkit-react` (v1.1.0) - OpenAI ChatKit web component
- `openai` (v5.22.1) - OpenAI API client
- `solvice-vrp-solver` (v0.6.0) - VRP SDK types and validation
- Shadcn/ui with Radix UI primitives
- MapLibre GL for visualization
- Tailwind CSS v4 for styling

**Storage**: Browser sessionStorage for chat session state (no localStorage persistence)
**Testing**: Jest with Testing Library, Puppeteer for E2E, custom hydration tests
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) with Next.js SSR
**Project Type**: web - Next.js app directory structure
**Performance Goals**: <300ms chat response time, <100ms UI interaction feedback, 60fps animations
**Constraints**:
- No localStorage persistence (browser session only)
- Read-only analysis (no VRP data modification)
- Expert-level responses with technical terminology
- Must integrate with existing VRP Explorer layout (split-pane design)
- Server-side API key management (no client exposure)

**Scale/Scope**:
- Single-user browser sessions
- VRP problems: 1-50 vehicles, 10-500 jobs
- Chat history: ~100 messages per session
- API: OpenAI Agent Builder workflows

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Type Safety**: All new types defined with TypeScript strict mode? Runtime validation planned?
  - ✅ ChatKit types from `@openai/chatkit-react` package
  - ✅ VRP context types from existing `solvice-vrp-solver` SDK
  - ✅ Session configuration types for Agent Builder workflow
  - ✅ Runtime validation for VRP data before passing to chat context

- [x] **Test-First**: TDD workflow outlined? All three test categories (unit, integration, E2E) planned?
  - ✅ Unit tests: ChatKit component rendering, session management, VRP context formatting
  - ✅ Integration tests: API session creation, VRP context passing, error handling
  - ✅ E2E tests: Complete chat workflows with real Agent Builder (no mocks)

- [x] **SDK Compliance**: Using official Solvice SDK types? API calls routed through server proxy?
  - ✅ Solvice SDK types for VRP data structures
  - ✅ OpenAI API calls routed through `/app/api/chatkit/session/route.ts`
  - ✅ Agent Builder workflow ID configured server-side
  - N/A: No VRP API calls from chat (read-only analysis)

- [x] **AI Standards**: (If applicable) Schema validation and error recovery included?
  - ✅ VRP context validated before passing to ChatKit
  - ✅ Error handling for session creation failures
  - ✅ User-friendly error messages (no raw API errors)
  - ✅ Retry logic with exponential backoff for transient failures
  - N/A: No AI-generated VRP modifications (read-only)

- [x] **Minimal Dependencies**: New dependencies justified? Simpler alternatives considered?
  - ✅ `@openai/chatkit-react` already installed (required for feature)
  - ✅ No additional dependencies needed
  - ✅ Removing existing VRP Assistant dependencies reduces complexity
  - ✅ Agent Builder handles AI orchestration (no custom prompt engineering)

- [x] **Component Isolation**: Components self-contained? Clear props interfaces?
  - ✅ `VrpChatKit` component with clear props (vrpData, solution, onError)
  - ✅ No side effects in render logic
  - ✅ Session management isolated in component state
  - ✅ Testable in isolation using Testing Library

- [x] **Security**: API keys server-side only? User input sanitized?
  - ✅ OpenAI API key in server-side environment variables only
  - ✅ Agent Builder workflow ID server-side only
  - ✅ Session creation API route handles authentication
  - ✅ VRP data sanitized before passing to chat context
  - ✅ No direct user control over system prompts

## Project Structure

### Documentation (this feature)
```
specs/001-https-github-com/
├── spec.md              # Feature specification with clarifications
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (ChatKit, Agent Builder research)
├── data-model.md        # Phase 1 output (chat session, VRP context model)
├── quickstart.md        # Phase 1 output (manual testing guide)
├── contracts/           # Phase 1 output (API contracts)
│   └── chatkit-session-api.yaml  # OpenAPI spec for session creation
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
app/
├── api/
│   └── chatkit/
│       └── session/
│           └── route.ts         # NEW: Session creation API endpoint
├── layout.tsx                   # UPDATE: Remove VRP Assistant imports
└── page.tsx                     # No changes needed

components/
├── VrpChatKit.tsx              # NEW: ChatKit integration component
├── VrpExplorer.tsx             # UPDATE: Replace VrpAssistantButton with VrpChatKit
├── VrpLayout.tsx               # No changes needed
├── VrpMap.tsx                  # No changes needed
├── VrpJsonEditor.tsx           # No changes needed
├── VrpGantt.tsx                # No changes needed
└── [REMOVE ALL]:
    ├── VrpAssistant/
    │   ├── VrpAssistantProvider.tsx    # DELETE
    │   ├── VrpAssistantButton.tsx      # DELETE
    │   ├── VrpAssistantPane.tsx        # DELETE
    │   ├── ShadcnChatInterface.tsx     # DELETE
    │   ├── ChatPersistence.tsx         # DELETE
    │   ├── ProcessingIndicator.tsx     # DELETE
    │   └── ChatModeSelector.tsx        # DELETE

lib/
├── vrp-api.ts                  # No changes needed
├── vrp-schema.ts               # No changes needed
├── chatkit-config.ts           # NEW: ChatKit configuration
├── vrp-context-formatter.ts    # NEW: Format VRP data for chat context
└── [REMOVE]:
    ├── openai-service.ts       # DELETE (replaced by Agent Builder)
    ├── error-handling-service.ts  # DELETE (ChatKit handles errors)
    ├── rate-limiter.ts         # DELETE (Agent Builder handles rate limiting)
    └── telemetry-service.ts    # DELETE (not needed for ChatKit)

__tests__/
├── VrpChatKit.test.tsx         # NEW: Unit tests for ChatKit component
├── api/
│   └── chatkit-session.test.ts # NEW: API endpoint tests
├── lib/
│   ├── chatkit-config.test.ts  # NEW: Configuration tests
│   └── vrp-context-formatter.test.ts  # NEW: Context formatting tests
├── e2e/
│   └── vrp-chatkit-workflow.test.ts   # NEW: E2E chat workflow tests
└── [REMOVE ALL]:
    ├── VrpAssistant/           # DELETE all assistant tests
    └── lib/
        ├── error-handling-service.test.ts  # DELETE
        ├── rate-limiter.test.ts            # DELETE
        └── json-modification-service.test.ts  # DELETE
```

**Structure Decision**: Next.js app directory structure with server-side API routes. ChatKit component integrates into existing split-pane layout. Removed VRP Assistant components reduce codebase complexity by ~1500 lines. New ChatKit integration adds ~400 lines (net reduction of ~1100 lines).

## Phase 0: Outline & Research

**Objective**: Research ChatKit integration patterns, Agent Builder workflows, and VRP context formatting strategies.

### Research Tasks Completed:

1. **ChatKit Web Component Integration**
   - Decision: Use `@openai/chatkit-react` React wrapper
   - Rationale: TypeScript support, React hooks integration, better Next.js SSR compatibility
   - Alternatives considered: Direct `<openai-chatkit>` web component (lacks TypeScript types)

2. **Agent Builder Configuration**
   - Decision: Create dedicated VRP analysis workflow in Agent Builder
   - Rationale: Centralized prompt management, versioning, monitoring capabilities
   - Alternatives considered: Custom GPT-4 prompts (less maintainable, no UI for non-devs)

3. **VRP Context Passing**
   - Decision: Pass VRP data as structured JSON in chat session context
   - Rationale: Agent Builder supports context injection, maintains type safety
   - Alternatives considered: Encoding VRP data in chat messages (token inefficient, loses structure)

4. **Session Management**
   - Decision: Server-side session creation with workflow ID
   - Rationale: Keeps API keys secure, enables workflow versioning
   - Alternatives considered: Client-side initialization (exposes API key)

5. **Migration Strategy**
   - Decision: Complete replacement of VRP Assistant (not gradual migration)
   - Rationale: Clarification specified "replace entirely", reduces maintenance burden
   - Alternatives considered: Feature flag toggle (unnecessary complexity per spec)

**Output**: [research.md](./research.md) with all decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### 1. Data Model Generated

**Output**: [data-model.md](./data-model.md)

**Key Entities**:

- **ChatSession**
  - Fields: sessionId (string), workflowId (string), createdAt (Date), expiresAt (Date)
  - Validation: sessionId non-empty, workflowId matches Agent Builder format
  - Lifecycle: Created on component mount, destroyed on browser session end

- **VrpChatContext**
  - Fields: problem (VrpRequest), solution (VrpSolution | null), metadata (object)
  - Validation: problem conforms to Solvice SDK schema
  - Relationships: Passed to ChatSession on creation

- **ChatKitConfig**
  - Fields: apiBaseUrl (string), workflowId (string), theme (object)
  - Validation: URLs must be HTTPS, workflowId format validated
  - Usage: Configuration for ChatKit component initialization

### 2. API Contracts Generated

**Output**: [contracts/chatkit-session-api.yaml](./contracts/chatkit-session-api.yaml)

**Endpoint**: `POST /api/chatkit/session`
- Request: `{ vrpContext: VrpChatContext }`
- Response: `{ sessionId: string, expiresAt: string }`
- Errors: 400 (invalid VRP data), 500 (OpenAI API failure), 503 (rate limit)

### 3. Contract Tests Generated

**Output**: Failing tests in `__tests__/api/chatkit-session.test.ts`

Tests assert:
- Valid VRP context returns sessionId
- Invalid VRP data returns 400 error
- Missing API key returns 500 error
- Rate limit returns 503 error
- Session expiration time is reasonable (< 24 hours)

### 4. Integration Test Scenarios

**From User Stories → Integration Tests**:

- Story 1 (Total distance query) → Test: ChatKit receives VRP solution context, responds with distance calculation
- Story 2 (Route explanation) → Test: ChatKit analyzes route sequence considering constraints
- Story 3 (Optimization suggestions) → Test: ChatKit provides actionable recommendations
- Story 6 (Scenario comparison) → Test: ChatKit compares two VRP configurations
- Story 7 (What-if analysis) → Test: ChatKit simulates hypothetical changes
- Story 8 (Constraint debugging) → Test: ChatKit identifies constraint conflicts
- Story 9 (Solution validation) → Test: ChatKit validates solution feasibility

**Output**: [quickstart.md](./quickstart.md) with manual testing steps

### 5. Agent File Updated

**Output**: Updated `/Users/cvh/src/vrp-api-explorer/CLAUDE.md`

Changes:
- Added ChatKit integration section
- Added Agent Builder configuration notes
- Updated VRP Assistant section to reflect removal
- Added testing patterns for ChatKit workflows
- Preserved existing architecture documentation
- Updated recent changes (kept last 3)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Load Base Template**: `.specify/templates/tasks-template.md`

2. **Generate from Phase 1 Artifacts**:
   - Contract → Contract test task (session API) [P]
   - Entity → Model creation tasks:
     * VrpChatContext formatter [P]
     * ChatKitConfig builder [P]
   - User story → Integration test tasks (7 scenarios)
   - Implementation tasks:
     * Remove existing VRP Assistant components (7 files)
     * Create VrpChatKit component
     * Create session API route
     * Update VrpExplorer integration
     * Update app layout

3. **TDD Ordering**:
   - Phase A: Contract tests (session API) [P]
   - Phase B: Unit tests (formatters, config) [P]
   - Phase C: Component removal (safe deletion after tests confirm no dependencies)
   - Phase D: New component implementation (VrpChatKit)
   - Phase E: Integration tests (7 user story scenarios)
   - Phase F: E2E tests (complete workflows)
   - Phase G: Documentation updates

4. **Parallelization Markers [P]**:
   - Contract test + VRP context formatter test [P]
   - Component removal tasks [P] (after dependency check)
   - Integration test scenarios [P] (independent stories)

**Estimated Output**: 28-32 numbered, ordered tasks in tasks.md

**Task Categories**:
- 1 contract test task
- 2 model creation tasks
- 7 component removal tasks
- 4 new component creation tasks
- 7 integration test tasks
- 2 E2E test tasks
- 3 documentation tasks
- 2-4 refactoring/cleanup tasks

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

**Validation Criteria**:
- All tests pass (unit, integration, E2E, hydration)
- ChatKit component renders without console errors
- VRP context passed correctly to Agent Builder
- Session creation API works with real OpenAI credentials
- Existing VRP Explorer features unaffected (map, Gantt, JSON editor)
- No localStorage persistence detected (sessionStorage only)
- Expert-level responses confirmed via manual testing
- Performance: <300ms chat response time, <100ms UI feedback

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

No violations detected. This implementation:
- ✅ Reduces overall complexity (removes ~1100 lines)
- ✅ Simplifies AI integration (Agent Builder vs custom service)
- ✅ Maintains type safety (ChatKit types + VRP SDK types)
- ✅ Follows TDD workflow (tests before implementation)
- ✅ Uses minimal dependencies (ChatKit already installed)
- ✅ Maintains component isolation (clear props interfaces)
- ✅ Enforces security (server-side API keys)

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [x] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (5 of 6 resolved in spec, 1 deferred as low-impact)
- [x] Complexity deviations documented (none - no violations)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*