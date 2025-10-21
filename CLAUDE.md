# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VRP API Explorer is a Next.js application for exploring and visualizing Vehicle Routing Problem (VRP) solutions using the Solvice VRP API. It provides an interactive split-pane interface with JSON editing on the left and map visualization on the right.

## Development Commands

```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Linting
pnpm lint

# Testing
pnpm test                    # Run all tests
pnpm test:watch             # Run tests in watch mode
pnpm test:hydration         # Check for SSR/hydration issues
```

## Core Architecture

### Technology Stack
- **Framework**: Next.js 15 with React 19
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom components
- **Maps**: MapLibre GL with Solvice styling
- **API Integration**: Solvice VRP Solver SDK (`solvice-vrp-solver`)
- **AI Integration**: OpenAI GPT-4 for natural language VRP modifications
- **Testing**: Jest with Testing Library
- **UI Components**: Shadcn/ui with Radix primitives

### Key Components Architecture

**Main Application Flow**:
1. `VrpExplorer` - Root component managing state and API calls
2. `VrpLayout` - Resizable split-pane layout using react-resizable-panels
3. `VrpJsonEditor` - Left pane with JSON editing and validation
4. `VrpMap` - Right pane (top) with MapLibre GL visualization
5. `VrpGantt` - Right pane (bottom) with timeline/Gantt chart visualization

**VRP AI Assistant Architecture**:
- `VrpAssistantProvider` - Context provider managing AI assistant state and OpenAI integration
- `VrpAssistantButton` - Fixed floating action button to toggle assistant pane
- `VrpAssistantPane` - Collapsible chat interface panel with header and status indicators
- `ShadcnChatInterface` - Main chat UI with message list, input, and suggestion buttons
- `OpenAIService` - GPT-4 integration for natural language VRP data modifications
- `ErrorHandlingService` - Comprehensive error handling with retry logic and user-friendly messaging

**API Architecture**:
- Client-side `VrpApiClient` (`lib/vrp-api.ts`) handles API key management and error mapping
- Server-side API route (`app/api/vrp/solve/route.ts`) proxies requests to Solvice API
- Runtime validation using actual Solvice SDK types (`lib/vrp-schema.ts`)
- OpenAI GPT-4 integration for AI-powered VRP data modifications

### File Structure Patterns

```
app/
├── api/vrp/solve/route.ts   # API proxy for CORS handling
├── layout.tsx               # Root layout with theme provider
└── page.tsx                 # Main page wrapper

components/
├── Vrp*.tsx                 # VRP-specific components
├── VrpAssistant/           # AI Assistant components
│   ├── VrpAssistantProvider.tsx  # Context provider
│   ├── VrpAssistantButton.tsx    # Toggle button
│   ├── VrpAssistantPane.tsx      # Main panel
│   ├── ShadcnChatInterface.tsx   # Chat UI
│   ├── OpenAIService.tsx         # AI integration
│   └── ChatPersistence.tsx       # Message storage
└── ui/                      # Reusable Shadcn components
    ├── chat-message.tsx     # Message components
    ├── message-list.tsx     # Chat message list
    ├── typing-indicator.tsx # AI processing indicator
    └── ...                  # Other UI components

lib/
├── vrp-api.ts              # API client with error handling
├── vrp-schema.ts           # Runtime validation
├── error-handling-service.ts # AI error handling & retry logic
├── sample-data.ts          # Default VRP problem data
└── utils.ts                # Tailwind utility functions

__tests__/                   # Jest tests for all components
├── VrpAssistant/           # AI Assistant tests
├── e2e/                    # End-to-end tests
└── lib/                    # Library tests
```

## Development Guidelines

### API Integration
- Always use the Solvice VRP Solver SDK types (`solvice-vrp-solver/resources/vrp/vrp`)
- API keys are managed via `VrpApiClient` with localStorage fallback
- All API calls go through the `/api/vrp/solve` proxy to avoid CORS issues
- Error handling uses typed `VrpApiError` with specific error categories

### Component Patterns
- Use `'use client'` directive for interactive components
- State management with React hooks (useState, useEffect, useCallback)
- Toast notifications via Sonner for user feedback
- Real-time validation with immediate UI feedback
- Context providers for complex state management (VRP Assistant)
- Error boundaries and comprehensive error handling
- Accessibility features with ARIA labels and keyboard navigation

### Testing Requirements
- All components have corresponding test files in `__tests__/`
- Tests use `@testing-library/react` and `@testing-library/jest-dom`
- Special hydration tests to prevent SSR issues
- Jest config handles ES modules in dependencies

### Validation and Type Safety
- Runtime validation in `validateVrpRequest()` mirrors SDK types
- TypeScript strict mode enforced
- All VRP data structures must match Solvice SDK schemas
- Client-side validation before API calls

## Environment Setup

Required environment variables:
```bash
SOLVICE_API_KEY=your_solvice_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

These are server-side only environment variables for security. API keys are never exposed to the client-side. The OpenAI API key enables the AI assistant functionality.

## Visualization Components

### Map Integration (VrpMap)
- MapLibre GL for rendering with Solvice tile styling
- Displays VRP problem locations and optimized routes
- Color-coded vehicle routes with numbered markers
- Interactive tooltips with timing information
- **Polyline support**: When `options.polylines: true` is set in the VRP request, actual road geometry is displayed instead of straight-line approximations

### Timeline Gantt Chart (VrpGantt)
- **Minimal design**: Custom CSS Grid implementation with zero external dependencies
- **Horizontal timeline**: Time-based visualization showing when vehicles visit each job
- **Vehicle rows**: One row per vehicle/resource showing their schedule
- **Activity blocks**: Color-coded bars representing job visits with duration
- **Interactive tooltips**: Hover over activities to see arrival, departure, duration, and service time
- **Responsive layout**: Positioned below map with resizable panels
- **Automatic time range**: Calculates timeline span from solution data
- **Styling**: Uses Shadcn/ui Card component and Tailwind utilities for minimal aesthetic

### Performance Optimizations (for 1,000+ jobs)

For large datasets, use optimized components:

**VrpMapOptimized** (`components/VrpMapOptimized.tsx`):
- Symbol layers instead of DOM markers (GPU-accelerated via MapLibre GL)
- Automatic clustering with Supercluster
- Handles 20,000+ jobs smoothly

**VrpGanttVirtualized** (`components/VrpGanttVirtualized.tsx`):
- Virtual scrolling with react-window
- Only renders visible rows (10-20 vs thousands)
- Constant memory usage

**Test Data Generator** (`lib/test-data-generator.ts`):
- Generate datasets from 100 to 20,000+ jobs instantly
- Usage: `createTestData('extreme')` for 20k jobs

See [PERFORMANCE.md](PERFORMANCE.md) for details.

## AI Assistant Integration

### VRP Assistant Features
- **Natural Language Processing**: Modify VRP data using conversational commands
- **Context Awareness**: Understands current VRP problem structure and constraints  
- **Smart Suggestions**: Provides actionable optimization recommendations
- **Error Recovery**: Robust error handling with user-friendly messaging and retry logic
- **Chat Persistence**: Messages saved to localStorage for session continuity
- **Real-time Validation**: Ensures all AI modifications maintain valid VRP structure

### AI Workflow
1. User types natural language request (e.g., "Add a new vehicle with capacity 100")
2. `OpenAIService` sends VRP data + request to GPT-4 with structured schema
3. AI returns modified VRP data with explanation and change summary
4. Response validated against VRP schema before applying to editor
5. Changes reflected in JSON editor and map visualization immediately

## Common Tasks

### Adding New VRP Features
1. Update types in `lib/vrp-schema.ts` to match SDK
2. Modify `VrpJsonEditor` for UI changes
3. Update `VrpMap` and/or `VrpGantt` for visualization changes
4. Add comprehensive tests in `__tests__/`

### Working with AI Assistant
1. Extend `OpenAIService` system prompts for new VRP features
2. Update `ErrorHandlingService` for new error scenarios
3. Add new suggestion patterns in `ShadcnChatInterface`
4. Test AI modifications thoroughly with edge cases

### Testing Changes
- Run `pnpm test:hydration` after any SSR-related changes
- Use `pnpm test:watch` during development
- Test AI integration with `scripts/test-openai-chat.js`
- Ensure all tests pass before committing

### Debugging API Issues
- Check browser console for detailed error messages
- Verify API keys in browser localStorage (Solvice + OpenAI)
- Use network tab to inspect `/api/vrp/solve` requests
- Review `VrpApiClient.mapError()` for error categorization
- Monitor `ErrorHandlingService` logs for AI-related issues