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
- **Testing**: Jest with Testing Library
- **UI Components**: Shadcn/ui with Radix primitives

### Key Components Architecture

**Main Application Flow**:
1. `VrpExplorer` - Root component managing state and API calls
2. `VrpLayout` - Resizable split-pane layout using react-resizable-panels
3. `VrpJsonEditor` - Left pane with JSON editing and validation
4. `VrpMap` - Right pane with MapLibre GL visualization

**API Architecture**:
- Client-side `VrpApiClient` (`lib/vrp-api.ts`) handles API key management and error mapping
- Server-side API route (`app/api/vrp/solve/route.ts`) proxies requests to Solvice API
- Runtime validation using actual Solvice SDK types (`lib/vrp-schema.ts`)

### File Structure Patterns

```
app/
├── api/vrp/solve/route.ts   # API proxy for CORS handling
├── layout.tsx               # Root layout with theme provider
└── page.tsx                 # Main page wrapper

components/
├── Vrp*.tsx                 # VRP-specific components
└── ui/                      # Reusable Shadcn components

lib/
├── vrp-api.ts              # API client with error handling
├── vrp-schema.ts           # Runtime validation
├── sample-data.ts          # Default VRP problem data
└── utils.ts                # Tailwind utility functions

__tests__/                   # Jest tests for all components
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
NEXT_PUBLIC_SOLVICE_API_KEY=your_api_key_here
```

The `NEXT_PUBLIC_` prefix is required for client-side access in Next.js.

## Map Integration

- MapLibre GL for rendering with Solvice tile styling
- Displays VRP problem locations and optimized routes
- Color-coded vehicle routes with numbered markers
- Interactive tooltips with timing information

## Common Tasks

### Adding New VRP Features
1. Update types in `lib/vrp-schema.ts` to match SDK
2. Modify `VrpJsonEditor` for UI changes
3. Update `VrpMap` for visualization changes
4. Add comprehensive tests in `__tests__/`

### Testing Changes
- Run `pnpm test:hydration` after any SSR-related changes
- Use `pnpm test:watch` during development
- Ensure all tests pass before committing

### Debugging API Issues
- Check browser console for detailed error messages
- Verify API key in browser localStorage
- Use network tab to inspect `/api/vrp/solve` requests
- Review `VrpApiClient.mapError()` for error categorization