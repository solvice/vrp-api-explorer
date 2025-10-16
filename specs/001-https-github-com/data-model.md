# Data Model: ChatKit-based VRP Analysis Chat Component

**Feature**: ChatKit-based VRP Analysis Chat Component
**Branch**: `001-https-github-com`
**Created**: 2025-10-09
**Status**: Phase 1 Design Artifact

## Overview

This document defines the core data entities for the ChatKit-based VRP chat component. These entities manage chat sessions, VRP problem context, and ChatKit configuration for AI-powered VRP analysis.

## Entity Definitions

### ChatSession

Represents an active chat session between the user and the VRP analysis AI agent.

**Purpose**: Track chat session lifecycle, manage connection to OpenAI Agent Builder workflow, and enforce browser session-only persistence.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Unique identifier for the chat session (UUID format) |
| `workflowId` | `string` | Yes | OpenAI Agent Builder workflow identifier |
| `createdAt` | `Date` | Yes | Timestamp when session was created |
| `expiresAt` | `Date` | Yes | Timestamp when session expires (browser session end or 24h max) |

**Validation Rules**:
- `sessionId`: Non-empty string, UUID v4 format
- `workflowId`: Non-empty string, must match Agent Builder workflow ID pattern (`^wf_[a-zA-Z0-9]+$`)
- `createdAt`: Valid Date object, not in the future
- `expiresAt`: Valid Date object, must be after `createdAt`, maximum 24 hours from `createdAt`

**Relationships**:
- **Contains**: VrpChatContext (1:1) - Each session has exactly one VRP context
- **Uses**: ChatKitConfig (1:1) - Each session references one configuration

**Lifecycle**:
1. **Creation**: When VrpChatKit component mounts, session created via `POST /api/chatkit/session`
2. **Active**: Session remains active while browser tab/window is open
3. **Expiration**: Session ends when browser session closes OR 24h timeout reached
4. **Storage**: Session metadata stored in browser `sessionStorage` (not `localStorage`)

**Example**:
```typescript
{
  sessionId: "550e8400-e29b-41d4-a716-446655440000",
  workflowId: "wf_abc123xyz789",
  createdAt: new Date("2025-10-09T10:30:00Z"),
  expiresAt: new Date("2025-10-10T10:30:00Z")
}
```

---

### VrpChatContext

Contains VRP problem data and solution results passed to the ChatKit session for AI analysis.

**Purpose**: Provide structured VRP context to the AI agent, enabling context-aware responses about routes, constraints, and optimization results.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `problem` | `VrpRequest` | Yes | Current VRP problem definition (vehicles, jobs, locations, constraints) |
| `solution` | `VrpSolution \| null` | No | Current VRP solution (if available), null before first solve |
| `metadata` | `VrpContextMetadata` | Yes | Additional context (timestamp, validation status, user notes) |

**VrpContextMetadata Type**:
```typescript
{
  timestamp: Date;           // When context was captured
  hasValidSolution: boolean; // Whether solution passed validation
  problemHash: string;       // Hash of problem data for change detection
  userNotes?: string;        // Optional user-provided context
}
```

**Validation Rules**:
- `problem`: Must conform to Solvice SDK `VrpRequest` schema (validated via `lib/vrp-schema.ts`)
- `solution`: If present, must conform to Solvice SDK `VrpSolution` schema
- `metadata.timestamp`: Valid Date object, not in the future
- `metadata.problemHash`: Non-empty string, SHA-256 hash format
- `metadata.userNotes`: Optional, max 1000 characters

**Relationships**:
- **Belongs to**: ChatSession (1:1) - Each context belongs to one session
- **References**: VrpRequest and VrpSolution types from `solvice-vrp-solver` SDK

**Lifecycle**:
1. **Creation**: When VrpChatKit component receives updated VRP data
2. **Update**: Whenever VRP problem or solution changes in the editor
3. **Serialization**: Formatted as JSON for Agent Builder context injection
4. **Storage**: Not persisted - recreated from current VRP Explorer state

**Example**:
```typescript
{
  problem: {
    vehicles: [
      { id: "vehicle_1", capacity: 100, start_location: "depot" }
    ],
    jobs: [
      { id: "job_1", location: "customer_a", demand: 20 }
    ],
    locations: {
      depot: { lat: 40.7128, lng: -74.0060 },
      customer_a: { lat: 40.7580, lng: -73.9855 }
    },
    options: { polylines: true }
  },
  solution: {
    routes: [
      {
        vehicle_id: "vehicle_1",
        stops: [
          { location: "depot", arrival: "08:00:00" },
          { location: "customer_a", arrival: "08:30:00" },
          { location: "depot", arrival: "09:00:00" }
        ]
      }
    ],
    total_distance: 15.2,
    total_time: 3600
  },
  metadata: {
    timestamp: new Date("2025-10-09T10:30:00Z"),
    hasValidSolution: true,
    problemHash: "a3b2c1d4e5f6...",
    userNotes: "Testing morning delivery scenario"
  }
}
```

---

### ChatKitConfig

Configuration settings for the ChatKit web component initialization.

**Purpose**: Centralize ChatKit configuration, manage Agent Builder workflow connection, and customize UI theme.

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `apiBaseUrl` | `string` | Yes | Base URL for OpenAI API endpoints |
| `workflowId` | `string` | Yes | Agent Builder workflow ID for VRP analysis |
| `theme` | `ChatKitTheme` | Yes | UI theme configuration matching VRP Explorer design |

**ChatKitTheme Type**:
```typescript
{
  primaryColor: string;      // Hex color for primary UI elements
  backgroundColor: string;   // Background color for chat pane
  textColor: string;         // Primary text color
  userMessageColor: string;  // Background color for user messages
  aiMessageColor: string;    // Background color for AI messages
  fontFamily: string;        // Font stack matching VRP Explorer
}
```

**Validation Rules**:
- `apiBaseUrl`: Valid HTTPS URL, must be OpenAI API domain
- `workflowId`: Non-empty string, must match Agent Builder workflow ID pattern (`^wf_[a-zA-Z0-9]+$`)
- `theme.primaryColor`: Valid hex color code (`^#[0-9A-Fa-f]{6}$`)
- `theme.backgroundColor`: Valid hex color code
- `theme.textColor`: Valid hex color code
- `theme.userMessageColor`: Valid hex color code
- `theme.aiMessageColor`: Valid hex color code
- `theme.fontFamily`: Non-empty string, valid CSS font-family value

**Relationships**:
- **Used by**: ChatSession (1:N) - Multiple sessions can reference the same config
- **Defined in**: `lib/chatkit-config.ts` (singleton configuration)

**Lifecycle**:
1. **Initialization**: Loaded at application startup from environment variables and constants
2. **Immutable**: Configuration does not change during runtime
3. **Validation**: Validated on application start, fails fast if invalid

**Example**:
```typescript
{
  apiBaseUrl: "https://api.openai.com/v1",
  workflowId: "wf_vrp_analysis_v1_prod",
  theme: {
    primaryColor: "#3b82f6",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    userMessageColor: "#eff6ff",
    aiMessageColor: "#f3f4f6",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif"
  }
}
```

---

## Entity Relationships Diagram

```
┌─────────────────┐
│  ChatKitConfig  │ (Singleton)
│  - apiBaseUrl   │
│  - workflowId   │
│  - theme        │
└────────┬────────┘
         │ referenced by
         ↓
┌─────────────────┐
│  ChatSession    │
│  - sessionId    │ ← Browser sessionStorage
│  - workflowId   │
│  - createdAt    │
│  - expiresAt    │
└────────┬────────┘
         │ contains
         ↓
┌─────────────────┐
│ VrpChatContext  │ ← Derived from VRP Explorer state
│  - problem      │
│  - solution     │
│  - metadata     │
└─────────────────┘
         ↓ references
┌─────────────────┐
│ Solvice SDK     │ (External)
│  - VrpRequest   │
│  - VrpSolution  │
└─────────────────┘
```

---

## Storage Strategy

### Browser Session Storage
- **ChatSession**: Stored in `sessionStorage` under key `vrp_chat_session`
- **Lifetime**: Persists until browser tab/window closes
- **Format**: JSON serialization of ChatSession object

### No Persistence
- **VrpChatContext**: NOT persisted - always derived from current VRP Explorer state
- **Chat Messages**: NOT persisted - managed by ChatKit component internally
- **ChatKitConfig**: NOT persisted - loaded from environment variables and constants

### Rationale
Per spec clarification: "Browser session only - persist until browser/tab closes". No localStorage usage ensures chat state is ephemeral and doesn't leak across browser sessions.

---

## Type Definitions (TypeScript)

```typescript
// lib/chatkit-config.ts
export interface ChatKitTheme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  userMessageColor: string;
  aiMessageColor: string;
  fontFamily: string;
}

export interface ChatKitConfig {
  apiBaseUrl: string;
  workflowId: string;
  theme: ChatKitTheme;
}

// lib/vrp-context-formatter.ts
export interface VrpContextMetadata {
  timestamp: Date;
  hasValidSolution: boolean;
  problemHash: string;
  userNotes?: string;
}

export interface VrpChatContext {
  problem: VrpRequest;  // From solvice-vrp-solver
  solution: VrpSolution | null;  // From solvice-vrp-solver
  metadata: VrpContextMetadata;
}

// components/VrpChatKit.tsx
export interface ChatSession {
  sessionId: string;
  workflowId: string;
  createdAt: Date;
  expiresAt: Date;
}
```

---

## Validation Functions

All entities have corresponding validation functions:

```typescript
// lib/chatkit-config.ts
export function validateChatKitConfig(config: unknown): ChatKitConfig;

// lib/vrp-context-formatter.ts
export function validateVrpChatContext(context: unknown): VrpChatContext;
export function formatVrpContextForChat(
  problem: VrpRequest,
  solution: VrpSolution | null
): VrpChatContext;

// components/VrpChatKit.tsx
export function validateChatSession(session: unknown): ChatSession;
```

Validation follows existing patterns in `lib/vrp-schema.ts` using runtime type guards and throws descriptive errors for invalid data.

---

## Change Detection

VRP context changes are detected via `problemHash` in metadata:

1. Calculate SHA-256 hash of serialized VRP problem data
2. Compare with previous hash stored in ChatSession metadata
3. If changed, create new VrpChatContext and update chat session
4. AI agent receives updated context for subsequent messages

This enables the chat to answer questions like "What changed compared to my last solution?" (User Story #4).

---

## Security Considerations

- **API Keys**: Never included in any entity - managed server-side only
- **Workflow ID**: Stored in config but not sensitive (publicly visible in UI)
- **Session ID**: Generated server-side, unpredictable UUID format
- **VRP Data**: User-provided, sanitized before passing to chat context
- **Storage**: sessionStorage only (not localStorage) prevents cross-session leakage

---

## Future Extensions

While not in current scope, this data model supports future enhancements:

- **Multi-session comparison**: Add `previousSessionIds: string[]` to VrpChatContext
- **User preferences**: Add `userPreferences: object` to ChatKitConfig
- **Performance metrics**: Add `metrics: object` to VrpContextMetadata
- **Collaboration**: Add `userId: string` to ChatSession (requires authentication)

No changes to current implementation needed - these are additive extensions only.
