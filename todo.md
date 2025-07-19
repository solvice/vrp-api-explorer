# VRP API Explorer - Implementation Todo

## Current Status: Planning Complete ✅

## Implementation Steps

### ✅ Planning Phase
- [x] Analyze requirements and create specification
- [x] Design TDD implementation plan
- [x] Break down into manageable steps
- [x] Create detailed prompts for each step

### 🔄 Development Phase

#### Step 1: Dependencies and TypeScript Integration
- [ ] Install required dependencies (maplibre-gl, react-json-view, @types/maplibre-gl)
- [ ] Verify solvice-vrp-solver package integration
- [ ] Create folder structure (lib/, components/, __tests__/)
- [ ] Set up testing framework
- [ ] Write TypeScript integration tests

#### Step 2: JSON Schema Generation Utility
- [ ] Create schema generation utility
- [ ] Generate JSON schema for VrpSyncSolveParams
- [ ] Handle required vs optional fields
- [ ] Write comprehensive validation tests

#### Step 3: Sample VRP Data Creation
- [ ] Create 10-location VRP problem
- [ ] Include 2 resources and 8 jobs
- [ ] Add realistic constraints (time windows, capacity)
- [ ] Validate against generated schema

#### Step 4: API Client Implementation
- [ ] Implement VRP API client
- [ ] Handle demo API key from environment
- [ ] Add user API key override with localStorage
- [ ] Comprehensive error handling
- [ ] Mock API responses for testing

#### Step 5: Basic Layout Component
- [ ] Create resizable split pane layout
- [ ] Implement mobile-responsive tabs
- [ ] Add header with endpoint display
- [ ] Use Shadcn resizable component

#### Step 6: JSON Editor Integration
- [ ] Integrate react-json-view
- [ ] Add real-time validation feedback
- [ ] Pre-load sample data
- [ ] Implement response display

#### Step 7: Basic Map with Markers
- [ ] Set up MapLibre GL JS
- [ ] Display resource and job markers
- [ ] Different marker styles
- [ ] Proper map centering

#### Step 8: API Integration with UI
- [ ] Connect send button to API calls
- [ ] Add loading states
- [ ] Display responses in JSON editor
- [ ] Handle API errors
- [ ] Update map with response data

#### Step 9: Route Visualization
- [ ] Display colored route lines
- [ ] Different colors per resource
- [ ] Show visit sequence numbers
- [ ] Add timing information on hover
- [ ] Use API geometry data

#### Step 10: Final Polish and Error States
- [ ] Implement toast notifications
- [ ] Add smooth loading transitions
- [ ] Handle edge cases
- [ ] Optimize for demos
- [ ] Add accessibility features

### 🧪 Testing Phase
- [ ] Unit tests for all components
- [ ] Integration tests for workflows
- [ ] End-to-end tests for user scenarios
- [ ] Demo presentation testing

### 🚀 Deployment Phase
- [ ] Production build optimization
- [ ] Environment variable configuration
- [ ] Demo deployment setup
- [ ] Documentation completion

## Next Action
Start with Step 1: Dependencies and TypeScript Integration

## Notes
- Follow TDD approach for all steps
- Each step builds on previous ones
- Focus on incremental progress
- Maintain test coverage throughout
- Keep demo experience smooth