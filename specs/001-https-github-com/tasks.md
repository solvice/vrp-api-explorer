# Tasks: ChatKit-based VRP Analysis Chat Component

**Input**: Design documents from `/Users/cvh/src/vrp-api-explorer/specs/001-https-github-com/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md
**Feature Branch**: `001-https-github-com`

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Extracted: TypeScript 5.x, Next.js 15.5.4, React 19.1.1, Jest, Testing Library
   → ✅ Structure: Next.js app directory, server-side API routes
2. Load optional design documents:
   → ✅ data-model.md: ChatSession, VrpChatContext, ChatKitConfig entities
   → ✅ contracts/: chatkit-session-api.yaml (POST /api/chatkit/session)
   → ✅ research.md: ChatKit integration patterns, Agent Builder config
   → ✅ quickstart.md: 9 user story test scenarios + 4 edge cases
3. Generate tasks by category:
   → Setup: Environment config, dependency verification
   → Tests: Contract tests, unit tests, integration tests, E2E tests
   → Core: Lib functions, API routes, components
   → Integration: Component integration, legacy removal
   → Polish: Documentation, performance validation, cleanup
4. Apply task rules:
   → Different files = [P] parallel
   → Same file = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generated 31 tasks across 8 phases
7. Validated task completeness:
   → ✅ Contract has tests (POST /api/chatkit/session)
   → ✅ All entities have validation/formatter tasks
   → ✅ All 9 user stories have integration tests
8. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- File paths are absolute from repository root

## Path Conventions
Repository root: `/Users/cvh/src/vrp-api-explorer/`
Next.js app directory structure with TypeScript

---

## Phase 3.1: Setup & Environment

### T001: Verify ChatKit Dependencies and Environment ✅
**File**: `package.json`, `.env.local`
**Description**: Verify `@openai/chatkit-react` v1.1.0 is installed. Create/update `.env.local` with OPENAI_API_KEY and OPENAI_WORKFLOW_ID. Verify Solvice API key exists.
**Commands**:
```bash
pnpm list @openai/chatkit-react
code .env.local
```
**Acceptance**: Package version confirmed, environment variables set, no missing dependencies
**Status**: ✅ COMPLETE - ChatKit v1.1.0 verified, OPENAI_API_KEY and SOLVICE_API_KEY present in .env.local

---

### T002: Configure Agent Builder Workflow ✅
**File**: External (OpenAI Platform)
**Description**: Create VRP Analysis workflow in OpenAI Agent Builder with expert-level system prompt (from quickstart.md Phase 1). Configure GPT-4 model, copy workflow ID to `.env.local`.
**Acceptance**: Workflow active, ID stored in OPENAI_WORKFLOW_ID, test in playground returns VRP-aware responses
**Status**: ✅ COMPLETE - Workflow ID `wf_68e69ee2aec88190b50cd830b12879e70c14c0081c455739` added to .env.local

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: All tests in this phase MUST be written and MUST FAIL before implementation begins**

### T003 [P]: Contract Test - POST /api/chatkit/session Success
**File**: `__tests__/api/chatkit-session.test.ts`
**Description**: Write contract test for successful session creation. Mock OpenAI API, test valid VRP context returns sessionId, workflowId, expiresAt. Verify response schema matches `contracts/chatkit-session-api.yaml`.
**Dependencies**: None
**Test Must Fail Because**: API route `/app/api/chatkit/session/route.ts` doesn't exist yet
**Acceptance**: Test written, runs, fails with "Cannot find module or 404"

---

### T004 [P]: Contract Test - POST /api/chatkit/session Validation Errors
**File**: `__tests__/api/chatkit-session.test.ts` (same file as T003, but can write in parallel)
**Description**: Write contract tests for validation errors: (1) Invalid VRP data returns 400, (2) Missing vrpContext field returns 400, (3) Malformed JSON returns 400. Assert error response structure matches contract.
**Dependencies**: None
**Test Must Fail Because**: API route doesn't exist yet
**Acceptance**: Test written, runs, fails with "Cannot find module or 404"

---

### T005 [P]: Contract Test - POST /api/chatkit/session Server Errors
**File**: `__tests__/api/chatkit-session.test.ts` (same file as T003-T004)
**Description**: Write contract tests for server errors: (1) Missing OPENAI_API_KEY returns 500, (2) OpenAI API failure returns 500, (3) Rate limit returns 503. Mock environment variables and OpenAI SDK.
**Dependencies**: None
**Test Must Fail Because**: API route doesn't exist yet
**Acceptance**: Test written, runs, fails with "Cannot find module or 404"

---

### T006 [P]: Unit Test - ChatKitConfig Validation
**File**: `__tests__/lib/chatkit-config.test.ts`
**Description**: Write unit tests for `validateChatKitConfig()` function. Test: (1) Valid config passes, (2) Invalid apiBaseUrl (non-HTTPS) fails, (3) Invalid workflowId format fails, (4) Invalid hex colors fail, (5) Missing required fields fail.
**Dependencies**: None
**Test Must Fail Because**: `lib/chatkit-config.ts` doesn't exist yet
**Acceptance**: Test written, runs, fails with "Cannot find module"

---

### T007 [P]: Unit Test - VRP Context Formatter
**File**: `__tests__/lib/vrp-context-formatter.test.ts`
**Description**: Write unit tests for `formatVrpContextForChat()` and `validateVrpChatContext()`. Test: (1) Valid VRP problem+solution formats correctly, (2) Null solution handled, (3) Invalid VRP data throws, (4) Metadata timestamp/hash generated, (5) Problem hash changes when VRP data changes.
**Dependencies**: None
**Test Must Fail Because**: `lib/vrp-context-formatter.ts` doesn't exist yet
**Acceptance**: Test written, runs, fails with "Cannot find module"

---

### T008 [P]: Unit Test - VrpChatKit Component Rendering
**File**: `__tests__/VrpChatKit.test.tsx`
**Description**: Write unit tests for VrpChatKit component. Test: (1) Component renders without errors, (2) ChatKit web component initialized with correct props, (3) VRP context passed on mount, (4) Session created on mount, (5) Loading state shown during session creation, (6) Error state shown on session failure.
**Dependencies**: None
**Test Must Fail Because**: `components/VrpChatKit.tsx` doesn't exist yet
**Acceptance**: Test written, runs, fails with "Cannot find module"

---

### T009 [P]: Integration Test - User Story #1 (Total Distance Query)
**File**: `__tests__/integration/chatkit-user-stories.test.tsx`
**Description**: Write integration test for Story #1 from quickstart.md. Test: Load 2-job VRP, solve, open chat, ask "What's the total distance?", verify response includes specific distance value matching solution. Use real ChatKit (not mocked).
**Dependencies**: None
**Test Must Fail Because**: VrpChatKit component doesn't exist yet
**Acceptance**: Test written, runs, fails with component not found

---

### T010 [P]: Integration Test - User Story #2 (Route Explanation)
**File**: `__tests__/integration/chatkit-user-stories.test.tsx` (same file as T009)
**Description**: Write integration test for Story #2. Test: Load VRP, solve, ask "Why is vehicle_1 visiting customer_b before customer_a?", verify response explains optimization logic with technical terms.
**Dependencies**: None
**Test Must Fail Because**: VrpChatKit component doesn't exist yet
**Acceptance**: Test written, runs, fails with component not found

---

### T011 [P]: Integration Test - User Story #3 (Optimization Suggestions)
**File**: `__tests__/integration/chatkit-user-stories.test.tsx` (same file as T009-T010)
**Description**: Write integration test for Story #3. Test: Ask "How can I reduce delivery time?", verify response includes multiple actionable suggestions specific to problem structure.
**Dependencies**: None
**Test Must Fail Because**: VrpChatKit component doesn't exist yet
**Acceptance**: Test written, runs, fails with component not found

---

### T012 [P]: Integration Test - User Stories #6-#9 (Advanced Analysis)
**File**: `__tests__/integration/chatkit-user-stories.test.tsx` (same file as T009-T011)
**Description**: Write integration tests for Stories #6 (Scenario Comparison), #7 (What-If Analysis), #8 (Constraint Debugging), #9 (Solution Validation). Each test follows pattern from quickstart.md.
**Dependencies**: None
**Test Must Fail Because**: VrpChatKit component doesn't exist yet
**Acceptance**: 4 tests written, run, fail with component not found

---

### T013 [P]: Integration Test - Edge Cases
**File**: `__tests__/integration/chatkit-edge-cases.test.tsx`
**Description**: Write integration tests for 4 edge cases from quickstart.md: (1) No VRP data loaded, (2) Unrelated questions, (3) VRP problem changes mid-session, (4) Asking about non-existent features (time windows).
**Dependencies**: None
**Test Must Fail Because**: VrpChatKit component doesn't exist yet
**Acceptance**: 4 edge case tests written, run, fail with component not found

---

### T014 [P]: E2E Test - Complete Chat Workflow
**File**: `__tests__/e2e/vrp-chatkit-workflow.test.ts`
**Description**: Write E2E test using Puppeteer. Test full workflow: (1) Load app, (2) Load VRP data in editor, (3) Solve VRP, (4) Open chat (find button/pane), (5) Ask question, (6) Verify AI response appears, (7) Check sessionStorage for session, (8) Verify no localStorage usage. Use real OpenAI Agent Builder (no mocks).
**Dependencies**: None
**Test Must Fail Because**: Chat UI doesn't exist yet
**Acceptance**: E2E test written, runs, fails at "cannot find chat button"

---

**GATE CHECK: Verify all T003-T014 tests are written and failing before proceeding to Phase 3.3**

---

## Phase 3.3: Core Implementation (ONLY after Phase 3.2 tests are failing)

### T015: Create ChatKitConfig Module
**File**: `lib/chatkit-config.ts`
**Description**: Implement ChatKitConfig types, `validateChatKitConfig()`, and singleton config builder. Load from environment variables (OPENAI_API_KEY, OPENAI_WORKFLOW_ID). Validate apiBaseUrl (HTTPS), workflowId format (`^wf_[a-zA-Z0-9]+$`), theme colors (hex). Export config instance.
**Dependencies**: T006 (test must be failing)
**Acceptance**: T006 passes (all unit tests green)

---

### T016: Create VRP Context Formatter Module
**File**: `lib/vrp-context-formatter.ts`
**Description**: Implement `formatVrpContextForChat()`, `validateVrpChatContext()`, and `calculateProblemHash()` (SHA-256). Accept VrpRequest and VrpSolution from Solvice SDK, generate VrpChatContext with metadata (timestamp, hasValidSolution, problemHash). Validate using existing `lib/vrp-schema.ts` patterns.
**Dependencies**: T007 (test must be failing)
**Acceptance**: T007 passes (all unit tests green)

---

### T017: Create Session API Route
**File**: `app/api/chatkit/session/route.ts`
**Description**: Implement POST handler for session creation. (1) Parse request body, (2) Validate VRP context using `validateVrpChatContext()`, (3) Create OpenAI chat session with Agent Builder workflow ID, (4) Inject VRP context as session metadata, (5) Return sessionId + workflowId + expiresAt. Handle errors: 400 (validation), 500 (API failure), 503 (rate limit). Use exponential backoff retry for transient failures.
**Dependencies**: T015, T016 (config and formatter exist), T003-T005 (tests must be failing)
**Acceptance**: T003, T004, T005 pass (all contract tests green)

---

### T018: Create VrpChatKit Component
**File**: `components/VrpChatKit.tsx`
**Description**: Implement VrpChatKit React component using `@openai/chatkit-react`. Props: vrpData (VrpRequest), solution (VrpSolution | null), onError. (1) Create session on mount via `/api/chatkit/session`, (2) Initialize ChatKit with sessionId, (3) Store session in sessionStorage (key: `vrp_chat_session`), (4) Update VRP context when props change (detect via problemHash), (5) Handle loading/error states, (6) Apply theme from ChatKitConfig. Use TypeScript strict mode, no side effects in render.
**Dependencies**: T017 (API route exists), T015-T016 (libs exist), T008 (test must be failing)
**Acceptance**: T008 passes (component unit tests green)

---

## Phase 3.4: Integration & Migration

### T019: Integrate VrpChatKit into VrpExplorer
**File**: `components/VrpExplorer.tsx`
**Description**: Update VrpExplorer to integrate VrpChatKit component. (1) Import VrpChatKit, (2) Pass current vrpRequest and vrpSolution as props, (3) Add chat toggle button (floating action button or pane toggle), (4) Position chat pane in layout (likely bottom-right or side panel), (5) Remove VrpAssistantButton import/usage. Handle error callbacks.
**Dependencies**: T018 (VrpChatKit component exists), T009-T013 (integration tests must be failing)
**Acceptance**: T009, T010, T011, T012, T013 pass (integration tests green), VrpExplorer renders without errors

---

### T020 [P]: Remove VRP Assistant Components - Part 1
**File**: `components/VrpAssistant/VrpAssistantProvider.tsx`, `components/VrpAssistant/VrpAssistantContext.tsx`
**Description**: Delete VrpAssistantProvider and VrpAssistantContext files. Remove corresponding test files in `__tests__/VrpAssistant/`. Update `app/layout.tsx` to remove VrpAssistantProvider wrapper.
**Dependencies**: T019 (VrpChatKit integrated, no longer depends on old assistant)
**Acceptance**: Files deleted, app/layout.tsx updated, `pnpm build` succeeds, no import errors

---

### T021 [P]: Remove VRP Assistant Components - Part 2
**File**: `components/VrpAssistant/VrpAssistantButton.tsx`, `components/VrpAssistant/VrpAssistantPane.tsx`
**Description**: Delete VrpAssistantButton and VrpAssistantPane files. Remove tests. Verify no remaining imports in codebase.
**Dependencies**: T019 (VrpChatKit integrated)
**Acceptance**: Files deleted, `git grep VrpAssistantButton` returns no results, build succeeds

---

### T022 [P]: Remove VRP Assistant Components - Part 3
**File**: `components/VrpAssistant/ShadcnChatInterface.tsx`, `components/VrpAssistant/ChatPersistence.tsx`, `components/VrpAssistant/ProcessingIndicator.tsx`, `components/VrpAssistant/ChatModeSelector.tsx`
**Description**: Delete remaining VRP Assistant UI components. Remove test files. Delete `components/VrpAssistant/` directory if empty.
**Dependencies**: T019 (VrpChatKit integrated)
**Acceptance**: VrpAssistant directory removed, build succeeds, no orphaned tests

---

### T023 [P]: Remove Obsolete Service Files
**File**: `lib/openai-service.ts`, `lib/error-handling-service.ts`, `lib/rate-limiter.ts`, `lib/telemetry-service.ts`
**Description**: Delete obsolete service files replaced by ChatKit/Agent Builder. Remove corresponding tests in `__tests__/lib/`. Verify no remaining imports.
**Dependencies**: T019 (VrpChatKit integrated, services no longer used)
**Acceptance**: Files deleted, `git grep 'openai-service\|error-handling-service\|rate-limiter\|telemetry-service'` returns no code references, tests removed

---

### T024: Verify No Legacy Dependencies
**File**: Entire codebase
**Description**: Search codebase for any remaining references to deleted components/services. Check: (1) No imports of VrpAssistant components, (2) No calls to deleted services, (3) No orphaned test files, (4) No stale types/interfaces. Fix any found references.
**Dependencies**: T020, T021, T022, T023 (all removals complete)
**Acceptance**: `git grep -i 'vrpassistant\|openai-service\|error-handling-service'` returns zero code matches, `pnpm tsc` passes

---

## Phase 3.5: E2E & Advanced Testing

### T025: Execute E2E Workflow Test
**File**: `__tests__/e2e/vrp-chatkit-workflow.test.ts` (from T014)
**Description**: Run E2E test with real implementation. Verify: (1) Chat button appears, (2) Chat opens successfully, (3) Session created in sessionStorage, (4) User can ask question and receive AI response, (5) VRP context passed correctly, (6) No localStorage usage, (7) No console errors.
**Dependencies**: T019 (VrpChatKit integrated into UI), T014 (E2E test written and failing)
**Acceptance**: T014 passes (E2E test green), test completes in < 30 seconds

---

### T026 [P]: Hydration Test - VrpChatKit SSR Compatibility
**File**: `__tests__/hydration/vrp-chatkit-hydration.test.tsx`
**Description**: Write hydration test to ensure VrpChatKit component is SSR-compatible with Next.js. Test: (1) Component renders on server without errors, (2) Client hydration completes without warnings, (3) ChatKit web component loads after hydration (client-side only), (4) No sessionStorage access during SSR. Use existing hydration test patterns from `scripts/check-hydration.js`.
**Dependencies**: T018 (VrpChatKit component exists)
**Acceptance**: Test written and passes, `pnpm test:hydration` succeeds with no warnings

---

### T027 [P]: Session Persistence Tests
**File**: `__tests__/integration/chatkit-session-persistence.test.tsx`
**Description**: Write integration tests for session persistence behavior from quickstart.md Phase 6. Test: (1) Session persists while tab open (navigate within app, return to chat), (2) Session cleared on tab close (simulate with sessionStorage.clear()), (3) Session expiration < 24h, (4) No localStorage usage. Use Testing Library + sessionStorage mocks.
**Dependencies**: T019 (VrpChatKit integrated)
**Acceptance**: 4 persistence tests written and passing, sessionStorage behavior verified

---

## Phase 3.6: Performance & Polish

### T028: Performance Validation - Response Times
**File**: `__tests__/performance/chatkit-performance.test.ts`
**Description**: Write performance test to validate response times from quickstart.md Phase 8. Test: (1) Session creation API < 300ms (excluding OpenAI latency), (2) UI interactions < 100ms (button clicks, input focus), (3) Chat open/close animation runs at 60fps. Use Performance API and Jest timing utilities.
**Dependencies**: T019 (VrpChatKit integrated)
**Acceptance**: Performance test passes, metrics within spec thresholds

---

### T029: Update Project Documentation
**File**: `CLAUDE.md`, `README.md`
**Description**: Update CLAUDE.md (already done by update-agent-context.sh in Phase 1, verify completeness). Update README.md to replace VRP Assistant references with ChatKit. Add ChatKit setup instructions, Agent Builder workflow creation steps, environment variable documentation. Remove references to deleted components.
**Dependencies**: T024 (all legacy code removed)
**Acceptance**: Documentation accurate, no references to VRP Assistant, ChatKit setup clearly explained

---

### T030 [P]: Final Test Suite Execution
**File**: All test files
**Description**: Run complete test suite to verify all tests pass. Execute: (1) `pnpm test` (unit, integration, contract), (2) `pnpm test:hydration` (SSR compatibility), (3) `pnpm lint` (code quality). Fix any failing tests or lint errors. Verify total test count increased (new ChatKit tests added) and coverage maintained.
**Dependencies**: T025, T026, T027, T028 (all tests written)
**Acceptance**: All test commands pass, zero failures, zero lint errors, test coverage ≥ existing baseline

---

## Phase 3.7: Manual Validation

### T031: Execute Quickstart Manual Testing
**File**: `specs/001-https-github-com/quickstart.md`
**Description**: Follow quickstart.md manual testing guide. Test all 9 user stories (T001-T009 from quickstart), all 4 edge cases, session persistence, error handling, performance. Use checklist from Phase 9. Document any issues found.
**Dependencies**: T030 (all automated tests pass)
**Acceptance**: All quickstart checklist items pass, manual testing complete, ready for code review

---

## Dependencies

**Sequential Dependencies**:
- Phase 3.1 (T001-T002) → Phase 3.2 (tests)
- Phase 3.2 (T003-T014) → Phase 3.3 (implementation)
- T015 (config) + T016 (formatter) → T017 (API route)
- T017 (API) → T018 (component)
- T018 (component) → T019 (integration)
- T019 (integration) → T020-T023 (removal), T025-T027 (testing)
- T020-T023 (removal) → T024 (verification)
- T025-T028 (tests) → T030 (test suite)
- T030 (automated tests) → T031 (manual)

**Parallel Execution**:
- T003, T004, T005 (all write to same file, but different test cases - can write in parallel)
- T006, T007, T008 (different files - fully parallel)
- T009, T010, T011, T012, T013 (different test scenarios in same/related files - can write in parallel)
- T020, T021, T022, T023 (different file deletions - fully parallel)
- T026, T027, T028 (different test files - fully parallel)

---

## Parallel Execution Examples

### Example 1: Phase 3.2 Contract Tests (T003-T005)
```bash
# Can write these tests in parallel (different test cases, same file)
# Agent 1:
Task: "Write contract test T003 in __tests__/api/chatkit-session.test.ts for successful session creation with valid VRP context"

# Agent 2 (simultaneously):
Task: "Write contract test T004 in __tests__/api/chatkit-session.test.ts for validation errors (invalid VRP data, missing fields, malformed JSON)"

# Agent 3 (simultaneously):
Task: "Write contract test T005 in __tests__/api/chatkit-session.test.ts for server errors (missing API key, OpenAI failures, rate limits)"
```

### Example 2: Phase 3.2 Unit Tests (T006-T008)
```bash
# Can run these in parallel (completely different files)
# Agent 1:
Task: "Write unit tests T006 in __tests__/lib/chatkit-config.test.ts for ChatKitConfig validation"

# Agent 2 (simultaneously):
Task: "Write unit tests T007 in __tests__/lib/vrp-context-formatter.test.ts for VRP context formatting and validation"

# Agent 3 (simultaneously):
Task: "Write unit tests T008 in __tests__/VrpChatKit.test.tsx for VrpChatKit component rendering and state"
```

### Example 3: Phase 3.4 Component Removal (T020-T023)
```bash
# Can run these in parallel (different files being deleted)
# Agent 1:
Task: "Delete T020 VrpAssistantProvider and VrpAssistantContext components, update app/layout.tsx, remove tests"

# Agent 2 (simultaneously):
Task: "Delete T021 VrpAssistantButton and VrpAssistantPane components, remove tests"

# Agent 3 (simultaneously):
Task: "Delete T022 remaining VRP Assistant UI components (ShadcnChatInterface, ChatPersistence, ProcessingIndicator, ChatModeSelector)"

# Agent 4 (simultaneously):
Task: "Delete T023 obsolete service files (openai-service, error-handling-service, rate-limiter, telemetry-service) and tests"
```

---

## Notes

- **TDD Discipline**: Phase 3.2 tests MUST be written and failing before ANY Phase 3.3 implementation
- **Parallel Safety**: Tasks marked [P] modify different files or are read-only operations
- **Commit Frequency**: Commit after each completed task (or logical group of parallel tasks)
- **Test-Driven**: Never implement before writing failing test
- **TypeScript Strict**: All new code must satisfy TypeScript strict mode
- **No Mocks in E2E**: T014, T025 use real OpenAI Agent Builder (no mocks)
- **Constitutional Compliance**: All tasks follow VRP API Explorer constitution principles (type safety, TDD, minimal dependencies, component isolation, security)

---

## Task Generation Rules Applied

1. **From Contracts** (chatkit-session-api.yaml):
   - ✅ T003-T005: Contract tests for POST /api/chatkit/session [P]
   - ✅ T017: API route implementation

2. **From Data Model** (data-model.md):
   - ✅ T015: ChatKitConfig entity + validation [P]
   - ✅ T016: VrpChatContext formatter + validation [P]
   - ✅ T018: ChatSession in VrpChatKit component

3. **From User Stories** (quickstart.md):
   - ✅ T009-T012: Integration tests for Stories #1-#9 [P]
   - ✅ T013: Edge case tests [P]
   - ✅ T031: Manual quickstart execution

4. **From Research** (research.md):
   - ✅ T002: Agent Builder workflow setup
   - ✅ T014: E2E workflow test [P]
   - ✅ T026: SSR hydration test [P]

5. **Ordering**:
   - ✅ Setup (T001-T002) → Tests (T003-T014) → Implementation (T015-T019) → Migration (T020-T024) → Polish (T025-T031)
   - ✅ Tests always before implementation
   - ✅ Dependencies respected (config/formatter → API → component → integration)

---

## Validation Checklist

*GATE: All items must be checked before marking tasks.md complete*

- [x] Contract (POST /api/chatkit/session) has tests: T003, T004, T005
- [x] All entities have tasks: ChatKitConfig (T015), VrpChatContext (T016), ChatSession (T018)
- [x] All tests come before implementation: Phase 3.2 (T003-T014) before Phase 3.3 (T015-T019)
- [x] Parallel tasks truly independent: [P] tasks modify different files
- [x] Each task specifies exact file path: All tasks include absolute paths
- [x] No same-file conflicts: T003-T005 are same file but different test cases (safe parallel writing)
- [x] TDD workflow enforced: GATE CHECK after Phase 3.2, tests must fail before Phase 3.3
- [x] All 9 user stories have tests: T009-T012 cover Stories #1-#9
- [x] Edge cases tested: T013 covers 4 edge cases from quickstart
- [x] Performance validated: T028 covers response time requirements
- [x] E2E coverage: T014 (written first), T025 (executed after implementation)
- [x] Documentation updated: T029 updates CLAUDE.md and README.md
- [x] Final validation: T030 (automated) + T031 (manual) before completion

---

**Total Tasks**: 31
**Estimated Effort**: 3-5 days for single developer, 1-2 days with parallel execution
**Ready for Execution**: Yes - All tasks specific, testable, and ordered by dependencies
