<!--
Sync Impact Report:
Version: 1.0.0 (initial constitution)
Modified Principles: N/A (initial version)
Added Sections: All core principles (7 total), Development Workflow, Security Standards, Governance
Removed Sections: N/A
Templates Requiring Updates:
  ✅ plan-template.md - Updated Constitution Check section with specific gates for all 7 principles
  ✅ spec-template.md - Already aligned (testability and completeness requirements)
  ✅ tasks-template.md - Already aligned (TDD enforcement with tests-before-implementation)
  ✅ agent-file-template.md - Not applicable (template for runtime guidance, not governance)
Follow-up TODOs: None
-->

# VRP API Explorer Constitution

## Core Principles

### I. Frontend-First Development
Every feature prioritizes user interface and user experience. Components MUST be:
- Interactive with real-time feedback (validation, loading states, error messages)
- Accessible with ARIA labels, keyboard navigation, and screen reader support
- Responsive across device sizes using Tailwind CSS utilities
- Built with Shadcn/ui components for consistency

**Rationale**: This project serves end-users exploring VRP solutions. Visual clarity and interactivity are not optional—they define the product's value proposition.

### II. Type Safety & Runtime Validation (NON-NEGOTIABLE)
All data structures MUST be:
- Typed using TypeScript strict mode with no `any` types
- Validated at runtime using actual Solvice SDK types (`solvice-vrp-solver/resources/vrp/vrp`)
- Checked before API calls to prevent invalid requests
- Documented with clear interfaces and type definitions

**Rationale**: VRP problems involve complex nested data (jobs, resources, constraints). Type errors caught at compile-time prevent runtime failures. Runtime validation ensures SDK compatibility.

### III. Test-First Development (NON-NEGOTIABLE)
TDD workflow MUST be strictly followed:
1. Write failing test that validates desired functionality
2. Run test to confirm it fails as expected
3. Write ONLY enough code to make test pass
4. Run test to confirm success
5. Refactor while keeping tests green

Test categories MUST include:
- **Unit tests**: Component logic, validation functions, utilities
- **Integration tests**: API client, data flow, state management
- **E2E tests**: Complete user workflows using real data (no mocks)
- **Hydration tests**: SSR/client consistency for Next.js components

**Rationale**: Complex state management (map visualization, JSON editing, AI chat) requires regression prevention. Tests document expected behavior and enable confident refactoring.

### IV. SDK-First API Integration
All external API interactions MUST:
- Use official Solvice VRP Solver SDK types and schemas
- Route through server-side proxy (`/app/api/vrp/solve/route.ts`) to prevent CORS issues
- Implement comprehensive error handling with typed `VrpApiError` categories
- Never expose API keys to client-side code (server-side environment variables only)
- Validate requests client-side before submission

**Rationale**: The Solvice SDK is the authoritative source for VRP data structures. Deviating from SDK types breaks compatibility. Server-side proxying prevents security issues.

### V. AI Integration Standards
AI-powered features (OpenAI GPT-4 integration) MUST:
- Use structured system prompts with explicit VRP schema constraints
- Validate all AI-generated modifications against VRP schema before applying
- Implement retry logic with exponential backoff for transient failures
- Provide user-friendly error messages (never raw API errors)
- Maintain conversation context in localStorage for session continuity
- Log AI interactions for debugging (without exposing sensitive data)

**Rationale**: AI outputs are probabilistic. Schema validation prevents invalid VRP data from corrupting user sessions. Error recovery maintains user trust.

### VI. Minimal Dependencies
New dependencies MUST be justified. Prefer:
- Built-in browser APIs over third-party libraries
- Custom implementations for simple needs (see VrpGantt: zero-dependency timeline)
- Shadcn/ui components (copy-paste, not npm packages) for UI consistency
- Official SDKs for external services (Solvice, OpenAI)

Avoid:
- Heavy charting libraries when CSS Grid suffices
- State management frameworks for component-local state
- Utility libraries that duplicate standard JavaScript

**Rationale**: Dependencies increase bundle size, maintenance burden, and security surface area. The Gantt chart proves custom implementations often outperform generic libraries.

### VII. Component Isolation
React components MUST be:
- Self-contained with clear props interfaces
- Free from side effects in render logic
- Modular with single responsibility (one VRP concept per component)
- Testable in isolation using Testing Library

Context providers MUST:
- Manage only related state (VrpAssistantProvider handles AI chat only)
- Expose clear action methods (not raw state setters)
- Document when re-renders occur

**Rationale**: Isolated components enable parallel development, easier testing, and confident refactoring. VrpAssistantProvider demonstrates proper context usage—specific, documented, testable.

## Development Workflow

### Code Quality Gates
Before committing, ALL of the following MUST pass:
- `pnpm test` - All unit, integration, and E2E tests
- `pnpm test:hydration` - SSR/client consistency checks
- `pnpm lint` - ESLint with Next.js config
- TypeScript compilation with zero errors
- Manual testing of affected user workflows

### Testing Discipline
- **E2E tests**: MUST use real Solvice API with valid test data (no mocks)
- **Test output**: MUST be pristine (no unexpected console logs or warnings)
- **Coverage**: New features MUST include tests for all three categories (unit, integration, E2E)
- **TDD**: Implementation commits MUST reference failing tests written first

### Git Workflow
- **Branch naming**: `feature/###-short-description` or `fix/###-issue-name`
- **Commit frequency**: Commit after each completed test or implementation task
- **Commit messages**: Conventional format (`feat:`, `fix:`, `test:`, `refactor:`)
- **WIP commits**: Allowed during development, squashed before PR
- **No force push**: To main/master branches

## Security Standards

### API Key Management
- Solvice and OpenAI keys MUST be server-side environment variables only
- NEVER commit `.env.local` files
- Client-side API calls MUST route through `/app/api/` proxy routes
- localStorage MUST NOT store API keys directly (client-side API client uses demo key fallback)

### Data Validation
- User input (JSON editor) MUST be sanitized before AI processing
- AI-generated modifications MUST be validated against VRP schema
- Error messages MUST NOT expose internal system details
- CORS headers MUST be properly configured in API routes

## Governance

### Constitutional Authority
This constitution supersedes all other development practices. When conflicts arise:
1. Constitution takes precedence
2. CLAUDE.md provides implementation details
3. README.md documents user-facing features

### Amendment Process
Constitution changes require:
1. Documentation of proposed change with rationale
2. Version bump following semantic versioning:
   - **MAJOR**: Breaking governance changes (removing/redefining principles)
   - **MINOR**: New principles or materially expanded guidance
   - **PATCH**: Clarifications, wording improvements, typo fixes
3. Update of Sync Impact Report at top of this file
4. Propagation of changes to dependent templates (plan, spec, tasks)

### Compliance Verification
All pull requests MUST:
- Verify adherence to Type Safety & Runtime Validation principle
- Verify adherence to Test-First Development principle
- Document deviations with explicit justification in PR description
- Update relevant sections of CLAUDE.md when adding new patterns

Complexity violations (e.g., introducing heavy dependencies, skipping tests) MUST:
- Be documented in plan.md Complexity Tracking section
- Include rationale for why simpler alternative was rejected
- Require explicit approval before proceeding

### Runtime Guidance
Developers and AI assistants MUST:
- Consult CLAUDE.md for architecture decisions and coding patterns
- Reference this constitution for governance and non-negotiable standards
- Update CLAUDE.md when new architectural patterns emerge
- Keep constitution stable (infrequent changes) while CLAUDE.md evolves with codebase

**Version**: 1.0.0 | **Ratified**: 2025-10-02 | **Last Amended**: 2025-10-02