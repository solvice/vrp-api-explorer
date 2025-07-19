# VRP API Explorer - TDD Implementation Plan

## Overview

This plan breaks down the VRP API Explorer implementation into 10 test-driven development steps. Each step builds incrementally on the previous ones, following TDD principles with clear, testable outcomes.

## Architecture Layers

1. **Foundation Layer**: Dependencies, TypeScript setup, project structure
2. **Data Layer**: Schema generation, validation, sample data
3. **API Layer**: Client implementation, authentication, error handling
4. **UI Layer**: Layout, JSON editor, map visualization
5. **Integration Layer**: Connecting components, final polish

## Implementation Steps

### Step 1: Dependencies and TypeScript Integration
**Goal**: Verify all required dependencies work together and TypeScript types are accessible
**Testable Outcome**: Import and use solvice-vrp-solver types in test files
**Dependencies**: None

### Step 2: JSON Schema Generation Utility
**Goal**: Create utility to extract JSON schema from TypeScript interfaces
**Testable Outcome**: Generate valid JSON schema from VrpSyncSolveParams type
**Dependencies**: Step 1

### Step 3: Sample VRP Data Creation
**Goal**: Create realistic 10-location VRP problem that validates against schema
**Testable Outcome**: Sample data passes schema validation
**Dependencies**: Step 2

### Step 4: API Client Implementation
**Goal**: Build VRP API client with authentication and error handling
**Testable Outcome**: Client handles demo key, user keys, and API errors properly
**Dependencies**: Step 3

### Step 5: Basic Layout Component
**Goal**: Create resizable split pane layout with mobile-responsive tabs
**Testable Outcome**: Layout renders correctly, panes resize, tabs work on mobile
**Dependencies**: Step 1

### Step 6: JSON Editor Integration
**Goal**: Implement JSON editor with real-time validation feedback
**Testable Outcome**: Editor shows validation errors, prevents invalid submissions
**Dependencies**: Steps 2, 3, 5

### Step 7: Basic Map with Markers
**Goal**: Display MapLibre map with markers for VRP locations
**Testable Outcome**: Map renders, shows correct markers for resources and jobs
**Dependencies**: Steps 3, 5

### Step 8: API Integration with UI
**Goal**: Connect API client to UI components with loading states
**Testable Outcome**: Send button triggers API call, shows loading, handles responses
**Dependencies**: Steps 4, 6

### Step 9: Route Visualization
**Goal**: Display optimized routes on map using API response data
**Testable Outcome**: Map shows colored routes, sequence numbers, hover information
**Dependencies**: Steps 7, 8

### Step 10: Final Polish and Error States
**Goal**: Add comprehensive error handling, toast notifications, UX improvements
**Testable Outcome**: All error scenarios handled gracefully, smooth demo experience
**Dependencies**: Steps 8, 9

## TDD Prompts for Each Step

### Step 1 Prompt

```
Set up the VRP API Explorer project dependencies and verify TypeScript integration with the solvice-vrp-solver package.

REQUIREMENTS:
- Install required dependencies: maplibre-gl, react-json-view, @types/maplibre-gl
- Verify solvice-vrp-solver package is available and types work
- Create basic folder structure: lib/, components/, __tests__/
- Set up Jest/testing framework if not already configured

TDD APPROACH:
1. Write test that imports VrpSyncSolveParams and OnRouteResponse types from solvice-vrp-solver
2. Write test that creates a simple object matching VrpSyncSolveParams structure
3. Install dependencies to make tests pass
4. Verify TypeScript compilation works without errors

DELIVERABLES:
- Updated package.json with new dependencies
- Basic folder structure in place
- Test file demonstrating TypeScript integration works
- All tests passing

INTEGRATION: This provides the foundation for all subsequent steps.
```

### Step 2 Prompt

```
Create a utility to generate JSON schema from the solvice-vrp-solver TypeScript interfaces.

REQUIREMENTS:
- Generate JSON schema specifically for VrpSyncSolveParams interface
- Include validation for required fields (jobs, resources)
- Handle optional fields and nested object structures
- Export schema in a format usable by JSON validation libraries

TDD APPROACH:
1. Write test that validates a simple VrpSyncSolveParams object against generated schema
2. Write test that rejects invalid objects (missing required fields)
3. Write test that handles optional fields correctly
4. Implement schema generation utility to make tests pass

DELIVERABLES:
- lib/vrp-schema.ts with schema generation utility
- Generated JSON schema for VrpSyncSolveParams
- Test suite validating schema works correctly
- Documentation on how schema is generated

INTEGRATION: Built on Step 1's TypeScript foundation, enables validation in Step 6.
```

### Step 3 Prompt

```
Create realistic sample VRP data for a 10-location problem that validates against the generated schema.

REQUIREMENTS:
- 2 resources (vehicles) with realistic properties
- 8 jobs at different locations around a central depot
- Include time windows, service times, and vehicle capacity constraints
- Data should be immediately runnable for demo purposes
- Must validate against schema from Step 2

TDD APPROACH:
1. Write test that validates sample data against VrpSyncSolveParams schema
2. Write test that confirms sample data has exactly 10 locations
3. Write test that verifies data structure matches expected API format
4. Create sample data to make all tests pass

DELIVERABLES:
- lib/sample-data.ts with pre-configured VRP problem
- Test suite validating sample data structure
- Documentation explaining the sample problem scenario
- Confirmation data passes schema validation

INTEGRATION: Uses schema from Step 2, provides data for testing in Steps 4, 6, 7, 8.
```

### Step 4 Prompt

```
Implement VRP API client with authentication handling and comprehensive error management.

REQUIREMENTS:
- Support demo API key from environment variable
- Allow user API key override with localStorage persistence
- Implement POST request to /v2/vrp/solve/sync endpoint
- Handle network errors, API errors, and timeout scenarios
- Return typed responses using OnRouteResponse interface

TDD APPROACH:
1. Write test for successful API call with demo key
2. Write test for user key override functionality
3. Write test for localStorage persistence of user keys
4. Write test for various error scenarios (network, 401, 400, 500)
5. Write test for request timeout handling
6. Implement API client to make all tests pass using mocked responses

DELIVERABLES:
- lib/vrp-api.ts with complete API client
- Test suite covering success and error scenarios
- Environment variable configuration for demo key
- localStorage utilities for user key management

INTEGRATION: Uses sample data from Step 3, connects to UI in Step 8.
```

### Step 5 Prompt

```
Create the basic layout component with resizable split panes and mobile-responsive tabs.

REQUIREMENTS:
- Use Shadcn resizable component for desktop split pane (40/60 ratio)
- Implement tab-based layout for mobile/tablet screens
- Include header area for endpoint display and send button
- Responsive breakpoints for layout switching
- Clean, minimal design matching v0.dev aesthetic

TDD APPROACH:
1. Write test that renders split pane layout on desktop viewport
2. Write test that renders tab layout on mobile viewport
3. Write test that panes can be resized and maintain state
4. Write test for responsive breakpoint behavior
5. Implement layout component to pass all tests

DELIVERABLES:
- components/VRPLayout.tsx with responsive layout
- Test suite covering desktop and mobile layouts
- Proper responsive breakpoint handling
- Integration with Shadcn resizable component

INTEGRATION: Foundation for Steps 6 and 7, provides structure for entire app.
```

### Step 6 Prompt

```
Implement JSON editor component with real-time validation feedback and response display.

REQUIREMENTS:
- Integrate react-json-view for request editing
- Show real-time validation errors from schema (Step 2)
- Display non-editable response JSON
- Pre-load sample data from Step 3
- Prevent invalid JSON from being submitted

TDD APPROACH:
1. Write test that renders JSON editor with sample data
2. Write test that shows validation errors for invalid JSON
3. Write test that enables/disables submit based on validation
4. Write test that displays response JSON correctly
5. Write test that handles JSON editing and state updates
6. Implement JSON editor component to pass tests

DELIVERABLES:
- components/JSONEditor.tsx with validation integration
- Test suite covering validation feedback
- Integration with react-json-view
- Schema validation from Step 2

INTEGRATION: Uses layout from Step 5, schema from Step 2, sample data from Step 3. Connects to API in Step 8.
```

### Step 7 Prompt

```
Create basic map component using MapLibre GL JS with marker display for VRP locations.

REQUIREMENTS:
- Set up MapLibre map with clean, professional styling
- Display markers for resource locations (depot/start points)
- Display markers for job locations (delivery/pickup points)
- Different marker styles for resources vs jobs
- Proper map centering and zoom for 10-location problem

TDD APPROACH:
1. Write test that renders MapLibre map component
2. Write test that displays correct number of markers
3. Write test that uses different markers for resources vs jobs
4. Write test that centers map appropriately for sample data
5. Implement map component to pass all tests

DELIVERABLES:
- components/VRPMap.tsx with MapLibre integration
- Test suite covering map rendering and markers
- Clean map styling configuration
- Marker differentiation for resources vs jobs

INTEGRATION: Uses layout from Step 5, sample data from Step 3. Enhanced in Step 9 with routes.
```

### Step 8 Prompt

```
Connect API client to UI components with loading states and basic response handling.

REQUIREMENTS:
- Wire send button to trigger API calls
- Show loading indicators during API requests
- Display API responses in JSON editor
- Handle API errors with appropriate feedback
- Update map with response data (basic integration)

TDD APPROACH:
1. Write test that triggers API call when send button clicked
2. Write test that shows loading state during API request
3. Write test that displays response data in JSON editor
4. Write test that handles API errors appropriately
5. Write test that updates map component with response
6. Implement integration to pass all tests

DELIVERABLES:
- Fully connected VRP API workflow
- Loading state management
- Error handling with user feedback
- Response data flow to all components

INTEGRATION: Connects API client (Step 4), JSON editor (Step 6), and map (Step 7). Sets up for route visualization in Step 9.
```

### Step 9 Prompt

```
Implement comprehensive route visualization on the map using API response data.

REQUIREMENTS:
- Display colored route lines connecting locations in trip order
- Use different colors for each resource/vehicle
- Show visit sequence numbers on markers
- Display timing information on marker hover
- Use actual geometry data from Solvice API response

TDD APPROACH:
1. Write test that renders route lines for each trip
2. Write test that uses different colors per resource
3. Write test that shows sequence numbers on markers
4. Write test that displays timing info on hover
5. Write test that handles geometry data correctly
6. Implement route visualization to pass tests

DELIVERABLES:
- Enhanced VRPMap component with route visualization
- Test suite covering all route display features
- Proper color coding and sequence display
- Interactive hover states with timing data

INTEGRATION: Enhances map from Step 7 using response data flow from Step 8.
```

### Step 10 Prompt

```
Add comprehensive error handling, toast notifications, and final UX polish for demo readiness.

REQUIREMENTS:
- Implement toast notifications for all error scenarios
- Add smooth loading transitions and feedback
- Handle edge cases (network timeouts, malformed responses)
- Optimize for demo presentation (smooth flows, clear feedback)
- Add any missing accessibility features

TDD APPROACH:
1. Write test for toast notifications on API errors
2. Write test for loading state transitions
3. Write test for edge case handling
4. Write test for accessibility features
5. Write integration test for complete user workflow
6. Implement polish features to pass all tests

DELIVERABLES:
- Complete, demo-ready VRP API Explorer
- Comprehensive error handling and user feedback
- Smooth, professional user experience
- Full test coverage of user workflows

INTEGRATION: Final polish of complete application, ensuring all previous steps work together seamlessly.
```

## Testing Strategy

### Unit Tests
- Each component isolated with mocked dependencies
- Schema validation logic
- API client error handling
- Utility functions

### Integration Tests
- Component interactions
- API workflow end-to-end
- Layout responsiveness
- Map and JSON editor coordination

### End-to-End Tests
- Complete user workflow from load to result
- Error scenario handling
- Mobile responsive behavior
- Demo presentation flow

## Success Criteria

1. **Functionality**: All specified features working correctly
2. **Testing**: Comprehensive test coverage with TDD approach
3. **Code Quality**: Clean, maintainable, well-documented code
4. **Demo Ready**: Smooth, professional user experience for demonstrations
5. **Integration**: All components working together seamlessly
6. **Error Handling**: Graceful handling of all error scenarios