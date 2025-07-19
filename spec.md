# VRP API Explorer - Technical Specification

## Overview

A simple, demo-focused web application for exploring the Solvice VRP API. Designed for developers new to the Solvice VRP API and for showcasing API capabilities in demonstrations.

## Target Users

- Developers new to the Solvice VRP API
- Demo purposes to showcase API capabilities
- Focus on simplicity and immediate results

## Core Functionality

### Single Endpoint Focus
- **Endpoint**: `POST https://api.solvice.io/v2/vrp/solve/sync`
- **Purpose**: Synchronous VRP problem solving
- **SDK Integration**: Use `solvice-vrp-solver` npm package types

### Pre-loaded Example
- Start with a simple 10-location VRP problem pre-loaded in the JSON editor
- Based on `VrpSyncSolveParams` schema from solvice-vrp-solver package
- Immediately runnable example for instant gratification
- No configuration forms or additional settings

## User Interface

### Layout Structure
- **Split Pane Layout**: 40/60 ratio (left/right)
- **Left Pane**: Request/Response JSON editors
- **Right Pane**: Interactive map visualization
- **Resizable**: Use Shadcn resizable component
- **Mobile**: Tab-based switching between JSON and map views

### Left Pane Components
1. **Header Bar** (minimal):
   - Endpoint display: `POST /v2/vrp/solve/sync`
   - Send button
   - API key input (small, optional override)

2. **Request Editor**:
   - JSON editor using react-json-view (https://uiwjs.github.io/react-json-view/)
   - Real-time JSON schema validation
   - Syntax highlighting and error indication
   - Pre-loaded with simple 10-location example

3. **Response Display**:
   - Non-editable JSON view
   - Shows `OnRouteResponse` structure
   - Hidden until first successful response

### Right Pane - Map Visualization

#### Initial State (Pre-Send)
- Display markers for:
  - Resource locations (depot/start points)
  - Job locations (delivery/pickup points)
- Simple pin markers, no routes

#### Post-Response State
- **Trip Visualization**:
  - Route lines connecting locations in sequence
  - Different colors per resource/vehicle
  - Use geometry data from Solvice API for accurate routing
- **Enhanced Markers**:
  - Visit sequence numbers on markers
  - Route color coding per resource
- **Hover Information**:
  - Timing information display on marker hover

## Technical Stack

### Frontend Framework
- **Base**: Next.js (existing codebase)
- **UI Components**: Shadcn/ui (existing setup)
- **Mapping**: MapLibre GL JS
- **JSON Editor**: react-json-view

### API Integration
- **SDK**: solvice-vrp-solver npm package
- **Type Safety**: Use package TypeScript definitions
- **Schema**: Extract from `VrpSyncSolveParams` and `OnRouteResponse` interfaces

## Authentication & API Keys

### Demo Mode
- Default demo API key from environment variable
- Never expose demo key in UI or client code
- Seamless demo experience without authentication setup

### User API Keys
- Optional override input field (small, unobtrusive)
- Store user keys in localStorage
- Clear labeling for user's own API key usage

## Validation & Error Handling

### JSON Schema Validation
- **Source**: Generate from solvice-vrp-solver TypeScript types at build time
- **Implementation**: Real-time validation in JSON editor
- **UI Feedback**: Inline error highlighting in JSON
- **Send Prevention**: Disable send button for invalid JSON
- **Timing**: Validation on send attempt

### Error States
- **API Errors**: Toast notifications
- **Network Issues**: Toast notifications with basic retry messaging
- **JSON Syntax Errors**: Inline editor highlighting
- **Loading States**: Shadcn loading indicators

## Data Flow

### Initial Load
1. Load pre-configured 10-location VRP problem
2. Display problem locations on map as markers
3. Show editable JSON in left pane
4. Ready for immediate send/demo

### Request/Response Cycle
1. User clicks Send button
2. Validate JSON against schema
3. If valid, show loading state and send to API
4. On success:
   - Display response JSON in left pane
   - Redraw map with solution trips and routes
   - Show sequence numbers and timing info
5. On error:
   - Show toast notification
   - Keep request editor available for fixes

## Map Features

### Technology
- **Library**: MapLibre GL JS
- **Styling**: Clean, professional appearance matching v0.dev design aesthetic

### Visualization Elements
- **Markers**: Resource and job locations
- **Routes**: Colored lines representing optimized trips
- **Geometry**: Use actual route geometry from Solvice API response
- **Interactivity**: Hover states for timing information
- **Color Coding**: Consistent colors per resource across routes and markers

## Design Principles

### Minimalism
- Clean, professional interface similar to v0.dev design
- Minimal UI controls to maximize JSON editor and map space
- No unnecessary configuration options
- Focus on core VRP visualization

### Demo-Friendly
- Immediate visual impact with pre-loaded example
- One-click problem solving
- Clear visual progression from problem to solution
- Smooth error handling for live demonstrations

### Developer-Focused
- Direct JSON manipulation for learning API structure
- Real-time validation feedback
- Complete request/response visibility
- Type-safe integration with Solvice SDK

## File Structure

### Key Components
- `components/VRPExplorer.tsx` - Main container component
- `components/JSONEditor.tsx` - Request/response JSON editors
- `components/VRPMap.tsx` - Map visualization component
- `components/ResizablePanes.tsx` - Layout management
- `lib/vrp-schema.ts` - Generated JSON schema from SDK types
- `lib/vrp-api.ts` - API integration utilities

### Schema Generation
- Build-time extraction from `solvice-vrp-solver` package
- Convert TypeScript interfaces to JSON Schema
- Focus on `VrpSyncSolveParams` for request validation
- Include `OnRouteResponse` for response structure

## Responsive Design

### Desktop (Primary Target)
- 40/60 split pane layout
- Resizable divider
- Optimal for demos and development

### Mobile/Tablet
- Tab-based interface
- Switch between JSON view and map view
- Maintain full functionality on smaller screens

## Performance Considerations

### JSON Editor
- Efficient rendering for moderately complex VRP problems
- Schema validation without blocking UI
- Syntax highlighting performance

### Map Rendering
- Efficient route line rendering for multiple trips
- Marker clustering if needed for larger problems
- Smooth pan/zoom interactions

## Development Priorities

1. **Core Functionality**: JSON editor with schema validation
2. **API Integration**: Working sync solve endpoint integration
3. **Basic Map**: Location markers and route visualization
4. **Polish**: Error handling, loading states, responsive design
5. **Demo Optimization**: Pre-loaded examples, smooth UX flow