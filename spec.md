# VRP Job Loading Feature Specification

## Overview
Add functionality to load existing VRP requests and solutions by job ID, allowing users to fetch and visualize previously submitted VRP problems.

## User Experience

### UI Components
- **Load Job Button**: Add "Load Job" button in header controls area (next to API settings)
- **Load Job Dialog**: Modal dialog with UUID input field and validation
- **Job Badge**: Display loaded job ID next to "Request" label with clear (X) action
- **Loading States**: Show loading indicators in dialog while fetching data

### User Flow
1. User clicks "Load Job" button in header
2. Dialog opens with UUID input field
3. User enters job ID with real-time format validation
4. On submit, dialog shows loading state while fetching both request and solution
5. On success:
   - Dialog closes
   - All current data is replaced with fetched data
   - URL updates to `/?run=[uuid]`
   - Job badge appears next to "Request" label
6. User can clear loaded job by clicking X on badge (removes URL param)

### URL Integration
- **Format**: `/?run=[uuid]`
- **Auto-load**: On page load with run parameter, automatically fetch and display job
- **Browser Navigation**: Back/forward buttons work naturally
- **Shareable**: URLs with run parameter can be shared/bookmarked

## Technical Implementation

### API Integration
- **New API Route**: `/api/vrp/load/[jobId]`
  - Fetches from `api.solvice.io/v2/vrp/[jobId]` (request)
  - Fetches from `api.solvice.io/v2/vrp/[jobId]/solution` (solution)
  - Returns combined response with both request and solution data
  - Handles partial success (request exists, solution still processing)

### Components Required
- **LoadJobButton**: Header button component
- **LoadJobDialog**: Modal with UUID input and validation
- **JobBadge**: Display component showing loaded job ID with clear action

### State Management
- Store current job ID in component state
- Use Next.js `useSearchParams` and `useRouter` for URL management
- Update existing state management to handle loaded job data

### Error Handling
- **Invalid UUID Format**: Show validation error in dialog
- **Job Not Found**: Display user-friendly error message
- **Partial Load**: Show request data, display "Solution not ready" message for solution area
- **Network Errors**: Standard API error handling with retry option

### Data Flow
- **Complete Replacement**: Loaded data completely replaces current request/solution
- **No Confirmation**: No check for unsaved changes (as requested)
- **Immediate Update**: UI updates immediately on successful load

## shadcn/ui Components Used
- `Dialog` - Main loading dialog
- `Input` - UUID input field with validation
- `Button` - Load job trigger and dialog actions
- `Badge` - Job ID indicator
- `Alert` - Error states and partial load messages
- `Loader` - Loading state indicators

## Success Criteria
- Users can load any valid VRP job by UUID
- URL sharing works for loaded jobs
- Auto-loading from URL parameters works on page load
- Clean, intuitive UI that matches existing design patterns
- Proper error handling for all edge cases
- Loading states provide clear feedback during fetch operations