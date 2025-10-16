# Quickstart Guide: ChatKit-based VRP Analysis Chat Component

**Feature**: ChatKit-based VRP Analysis Chat Component
**Branch**: `001-https-github-com`
**Created**: 2025-10-09
**Status**: Phase 1 Manual Testing Guide

## Overview

This quickstart guide provides step-by-step instructions for setting up, configuring, and manually testing the ChatKit-based VRP Analysis Chat Component. Use this guide to validate all user stories and edge cases from the feature specification.

**Estimated Time**: 45-60 minutes

---

## Prerequisites

Before starting, ensure you have:

- ✅ Node.js 18+ and pnpm installed
- ✅ OpenAI API key with Agent Builder access
- ✅ Solvice VRP API key (for testing VRP problem solving)
- ✅ Modern browser (Chrome, Firefox, Safari, or Edge)
- ✅ Code editor (VS Code recommended)

---

## Phase 1: OpenAI Agent Builder Setup

### 1.1 Create VRP Analysis Workflow

1. **Navigate to OpenAI Agent Builder**:
   - Open browser and go to: https://platform.openai.com/playground/agent-builder
   - Log in with your OpenAI account

2. **Create New Workflow**:
   - Click **"Create New Workflow"**
   - Name: `VRP Analysis Chat`
   - Description: `Expert-level VRP problem analysis and optimization recommendations`

3. **Configure System Prompt**:
   ```
   You are an expert Vehicle Routing Problem (VRP) analyst with deep knowledge of
   optimization theory, constraint satisfaction, and logistics planning.

   Your role is to analyze VRP problems and solutions, providing expert-level insights
   using technical terminology. Assume the user has advanced VRP domain knowledge.

   Capabilities:
   - Answer questions about VRP data structures (vehicles, jobs, locations, constraints)
   - Explain routing decisions and optimization outcomes
   - Provide actionable optimization recommendations
   - Compare different VRP configurations and scenarios
   - Debug constraint conflicts and validation errors
   - Perform what-if analysis for proposed changes
   - Validate solution feasibility

   Context Format:
   You will receive VRP context as JSON containing:
   - `problem`: VRP problem definition (vehicles, jobs, locations, time windows, etc.)
   - `solution`: Optimized solution from Solvice VRP API (or null if not yet solved)
   - `metadata`: Additional context (timestamp, validation status, change detection hash)

   Response Guidelines:
   - Use technical VRP terminology (e.g., "time window violations", "capacity constraints", "route optimization")
   - Reference specific elements by ID (e.g., "vehicle_1", "job_3")
   - Provide quantitative analysis when possible (distances, times, costs)
   - For optimization suggestions, explain the trade-offs
   - For debugging, identify root causes and specific constraint conflicts
   - Keep responses concise but thorough
   ```

4. **Configure Model Settings**:
   - Model: `gpt-4-turbo` (or latest available)
   - Temperature: `0.7` (balance between creativity and consistency)
   - Max Tokens: `2000`
   - Top P: `1.0`

5. **Save Workflow**:
   - Click **"Save"**
   - Copy the **Workflow ID** (format: `wf_xxxxxxxxxxxxx`)
   - Keep this ID - you'll need it for environment configuration

### 1.2 Test Agent Builder Workflow

1. **Test in Playground**:
   - Click **"Test in Playground"**
   - Paste sample VRP context:
     ```json
     {
       "problem": {
         "vehicles": [{"id": "vehicle_1", "capacity": 100, "start_location": "depot"}],
         "jobs": [{"id": "job_1", "location": "customer_a", "demand": 20}],
         "locations": {
           "depot": {"lat": 40.7128, "lng": -74.0060},
           "customer_a": {"lat": 40.7580, "lng": -73.9855}
         }
       },
       "solution": null,
       "metadata": {"timestamp": "2025-10-09T10:30:00Z", "hasValidSolution": false}
     }
     ```
   - Ask: `"What vehicles are available in this problem?"`
   - **Expected Response**: Should identify `vehicle_1` with capacity 100

2. **Verify Expert-Level Responses**:
   - Ask: `"What optimization strategies would improve this problem?"`
   - **Expected**: Should use technical terminology, mention capacity utilization, time windows, etc.

3. **Confirm Workflow is Active**:
   - Status should show **"Active"** (green indicator)
   - If not active, click **"Activate"** button

---

## Phase 2: Local Environment Configuration

### 2.1 Clone Repository and Install Dependencies

```bash
# Clone repository (if not already cloned)
cd /Users/cvh/src/vrp-api-explorer

# Install dependencies
pnpm install

# Verify ChatKit package is installed
pnpm list @openai/chatkit-react
# Expected: @openai/chatkit-react 1.1.0
```

### 2.2 Configure Environment Variables

1. **Create/Update `.env.local`**:
   ```bash
   # Open .env.local in editor
   code .env.local
   ```

2. **Add Required Environment Variables**:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   OPENAI_WORKFLOW_ID=wf_xxxxxxxxxxxxx

   # Solvice VRP API (existing)
   SOLVICE_API_KEY=your_existing_solvice_key_here

   # Next.js Configuration
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
   ```

   Replace:
   - `OPENAI_API_KEY`: Your OpenAI API key from https://platform.openai.com/api-keys
   - `OPENAI_WORKFLOW_ID`: Workflow ID from Phase 1.1 step 5
   - `SOLVICE_API_KEY`: Your existing Solvice API key

3. **Verify Environment Variables**:
   ```bash
   # Check that variables are loaded
   pnpm run dev
   # Server should start without errors
   # Press Ctrl+C to stop
   ```

### 2.3 Verify Feature Branch

```bash
# Confirm you're on the feature branch
git branch --show-current
# Expected: 001-https-github-com

# If not on feature branch, create and switch
git checkout -b 001-https-github-com
```

---

## Phase 3: Start Development Server

### 3.1 Start Server with Logging

```bash
# Start development server
pnpm dev

# Expected output:
#   ▲ Next.js 15.5.4
#   - Local:        http://localhost:3000
#   - ready started server on 0.0.0.0:3000
```

### 3.2 Open Application in Browser

1. **Open Browser**: Navigate to http://localhost:3000
2. **Verify VRP Explorer Loads**:
   - ✅ Split-pane layout visible
   - ✅ JSON editor on left with sample VRP data
   - ✅ Map visualization on right (top)
   - ✅ Gantt chart on right (bottom)
3. **Check Console for Errors**:
   - Open browser DevTools (F12)
   - Console should have no errors
   - Network tab should show successful page load

---

## Phase 4: Test User Stories

### Test Story #1: Total Distance Query

**User Story**: "Given a user has loaded a VRP problem with vehicles and jobs, When they open the chat interface and ask 'What's the total distance for all routes?', Then the system provides an accurate answer based on the current VRP solution data."

**Test Steps**:

1. **Load Sample VRP Problem**:
   - In JSON editor, paste this sample:
     ```json
     {
       "vehicles": [
         {"id": "vehicle_1", "capacity": 100, "start_location": "depot"}
       ],
       "jobs": [
         {"id": "job_1", "location": "customer_a", "demand": 20},
         {"id": "job_2", "location": "customer_b", "demand": 30}
       ],
       "locations": {
         "depot": {"lat": 40.7128, "lng": -74.0060},
         "customer_a": {"lat": 40.7580, "lng": -73.9855},
         "customer_b": {"lat": 40.7489, "lng": -73.9680}
       },
       "options": {"polylines": true}
     }
     ```

2. **Solve VRP Problem**:
   - Click **"Solve VRP"** button
   - Wait for solution to appear (~2-5 seconds)
   - Verify solution displays on map

3. **Open Chat Interface**:
   - Look for ChatKit button (floating action button or panel toggle)
   - Click to open chat pane
   - Verify chat interface loads without errors

4. **Ask Total Distance Question**:
   - In chat input, type: `What's the total distance for all routes?`
   - Press Enter or click Send
   - Wait for AI response

5. **Verify Response**:
   - ✅ Response includes specific distance value
   - ✅ Distance matches value shown in solution panel
   - ✅ Response uses technical terminology
   - ✅ No generic errors like "I don't have access to that data"

**Expected Response Example**:
```
The total distance for all routes in the current solution is 15.2 km.
This is for vehicle_1's route visiting customer_a and customer_b before
returning to the depot.
```

---

### Test Story #2: Route Explanation

**User Story**: "Given a user is viewing a VRP solution on the map, When they ask 'Why is vehicle 1 visiting location B before location A?', Then the system explains the routing decision considering time windows, capacity, and optimization constraints."

**Test Steps**:

1. **Verify Solution from Story #1 is Still Loaded**

2. **Observe Route Sequence on Map**:
   - Note the order of stops for vehicle_1
   - Check if customer_b comes before customer_a

3. **Ask Route Explanation Question**:
   - In chat, type: `Why is vehicle_1 visiting customer_b before customer_a?`
   - Press Enter

4. **Verify Response**:
   - ✅ Response explains optimization logic
   - ✅ References specific constraints (time windows, capacity, distance)
   - ✅ Uses vehicle/location IDs from the problem
   - ✅ Provides technical reasoning (not vague answers)

**Expected Response Example**:
```
Vehicle_1 visits customer_b before customer_a due to optimization priorities.
The routing algorithm minimizes total distance while respecting the capacity
constraint of 100 units. Visiting customer_b (demand: 30) before customer_a
(demand: 20) results in a more efficient route geometry, reducing total distance
from 16.5 km to 15.2 km. Since no time window constraints are defined for these
jobs, the optimizer prioritized distance minimization.
```

---

### Test Story #3: Optimization Suggestions

**User Story**: "Given a user wants to optimize their VRP problem, When they ask 'How can I reduce delivery time?', Then the system provides actionable suggestions based on the current problem structure."

**Test Steps**:

1. **Ask Optimization Question**:
   - In chat, type: `How can I reduce delivery time?`
   - Press Enter

2. **Verify Response**:
   - ✅ Response includes multiple actionable suggestions
   - ✅ Suggestions are specific to current problem structure
   - ✅ Mentions trade-offs (e.g., cost vs. speed)
   - ✅ References VRP concepts like time windows, vehicle count, route optimization

**Expected Response Example**:
```
To reduce delivery time in your current configuration:

1. Add another vehicle: Currently vehicle_1 serves all jobs sequentially.
   Adding vehicle_2 would enable parallel service, potentially cutting total
   time in half.

2. Define tighter time windows: Your jobs currently have no time constraints.
   Setting preferred delivery windows would allow the optimizer to prioritize
   time-sensitive jobs.

3. Increase vehicle capacity: If vehicles had higher capacity, they could
   service more jobs per route without returns to depot, reducing travel time.

4. Optimize depot location: Moving the depot closer to the customer cluster
   (average lat/lng: 40.7535, -73.9768) would reduce travel time by ~15%.

Trade-offs: Adding vehicles increases operational cost. Time windows may
reduce solution flexibility and increase unassigned jobs if infeasible.
```

---

### Test Story #4: Change Comparison

**User Story**: "Given a user has modified their VRP JSON data, When they ask 'What changed compared to my last solution?', Then the system compares the current and previous states and highlights key differences."

**Test Steps**:

1. **Note Current Problem State**:
   - Current problem has 2 jobs, 1 vehicle

2. **Modify VRP Problem**:
   - Add a new job to JSON:
     ```json
     {"id": "job_3", "location": "customer_c", "demand": 25}
     ```
   - Add new location:
     ```json
     "customer_c": {"lat": 40.7200, "lng": -73.9950}
     ```

3. **Solve Modified Problem**:
   - Click **"Solve VRP"** again
   - Wait for new solution

4. **Ask Comparison Question**:
   - In chat, type: `What changed compared to my last solution?`
   - Press Enter

5. **Verify Response**:
   - ✅ Response identifies new job_3
   - ✅ Highlights impact on route (new stop added)
   - ✅ Mentions changes in total distance/time
   - ✅ Uses change detection metadata

**Expected Response Example**:
```
Compared to the previous solution, the following changes occurred:

1. New job added: job_3 at customer_c (demand: 25 units)
2. Route modification: vehicle_1 now visits 3 customers instead of 2
3. Total distance increased: 15.2 km → 18.7 km (+22.9%)
4. Total time increased: 1800s → 2250s (+25%)
5. Stop sequence: depot → customer_b → customer_c → customer_a → depot

The optimizer inserted customer_c between customer_b and customer_a to
minimize additional distance. Capacity remains within limits (75/100 utilized).
```

---

### Test Story #5: Validation Error Explanation

**User Story**: "Given a user encounters a validation error, When they ask 'What's wrong with my VRP data?', Then the system explains the error in plain language and suggests corrections."

**Test Steps**:

1. **Introduce Validation Error**:
   - In JSON editor, break the VRP structure:
     - Remove `"vehicles"` array entirely
     - Or set vehicle capacity to negative value: `"capacity": -50`

2. **Attempt to Solve**:
   - Click **"Solve VRP"**
   - Observe validation error message

3. **Ask Error Explanation Question**:
   - In chat, type: `What's wrong with my VRP data?`
   - Press Enter

4. **Verify Response**:
   - ✅ Response identifies specific validation error
   - ✅ Explains which field is problematic
   - ✅ Suggests concrete fix
   - ✅ References VRP schema requirements

**Expected Response Example**:
```
Your VRP data has a validation error: the 'vehicles' field is missing.

The Solvice VRP API requires at minimum:
- vehicles: Array with at least 1 vehicle
- jobs: Array with at least 1 job
- locations: Object mapping location IDs to coordinates

To fix this:
1. Add a 'vehicles' array with at least one vehicle definition
2. Example: {"id": "vehicle_1", "capacity": 100, "start_location": "depot"}
3. Ensure start_location references a valid location in your locations map

The schema validation failed because vehicles is a required field for
route optimization.
```

---

### Test Story #6: Scenario Comparison

**User Story**: "Given a user has two different VRP configurations, When they ask 'Compare this solution with my previous setup', Then the system analyzes and highlights key differences in routes, costs, timing, and resource utilization."

**Test Steps**:

1. **Load First Configuration**:
   - Use the 1-vehicle, 2-job problem from Story #1
   - Solve and note solution metrics

2. **Create Alternative Configuration**:
   - Add a second vehicle:
     ```json
     {"id": "vehicle_2", "capacity": 80, "start_location": "depot"}
     ```
   - Solve new configuration

3. **Ask Comparison Question**:
   - In chat, type: `Compare this solution with my previous setup`
   - Press Enter

4. **Verify Response**:
   - ✅ Response compares both configurations
   - ✅ Highlights differences in vehicle utilization
   - ✅ Compares route efficiency metrics
   - ✅ Analyzes trade-offs

**Expected Response Example**:
```
Comparison between single-vehicle and dual-vehicle configurations:

Previous (1 vehicle):
- vehicle_1: 2 jobs, 15.2 km, 1800s duration
- Total distance: 15.2 km
- Capacity utilization: 50% (50/100)

Current (2 vehicles):
- vehicle_1: 1 job, 8.5 km, 900s duration (60% utilization)
- vehicle_2: 1 job, 7.8 km, 850s duration (37.5% utilization)
- Total distance: 16.3 km (+7.2%)
- Total time: 900s vs 1800s (-50% due to parallelization)

Trade-off analysis:
- Time efficiency improved significantly (parallel routes)
- Distance increased slightly (two vehicles traveling separately)
- Resource costs doubled (2 vehicles vs 1)
- Lower capacity utilization per vehicle

Recommendation: Use dual-vehicle setup if time is critical and operational
costs justify the benefit. Use single-vehicle if minimizing distance/cost
is the priority.
```

---

### Test Story #7: What-If Analysis

**User Story**: "Given a user wants to test a potential change, When they ask 'What if I add another vehicle with 50 capacity?', Then the system provides what-if analysis explaining likely impacts on route distribution and optimization outcomes."

**Test Steps**:

1. **Load Current Problem** (from previous test)

2. **Ask What-If Question**:
   - In chat, type: `What if I add another vehicle with 50 capacity?`
   - Press Enter

3. **Verify Response**:
   - ✅ Response analyzes hypothetical scenario
   - ✅ Predicts impact on route distribution
   - ✅ Estimates changes in metrics (distance, time)
   - ✅ Provides reasoning based on current problem

**Expected Response Example**:
```
What-if analysis: Adding vehicle_3 with 50 capacity

Predicted impact on your current 2-job problem:

1. Route distribution:
   - With 2 jobs (demand: 20 + 30 = 50 total) and 3 vehicles available,
     the optimizer will likely assign one job per vehicle, leaving vehicle_3
     unused or assign both jobs to vehicle_3 (since 50 capacity exactly
     matches total demand).

2. Optimization outcomes:
   - Scenario A (vehicle_3 takes both jobs): Total distance ~12.8 km
     (improvement of 15% vs current), time ~1650s
   - Scenario B (job split across vehicles): Total distance ~16.5 km
     (slight increase), but time ~850s (parallel execution)

3. Resource utilization:
   - Scenario A: vehicle_3 at 100% utilization, others idle (efficient)
   - Scenario B: All vehicles underutilized (<50% each)

Recommendation: Scenario A is more likely. The optimizer prefers fewer
vehicles when capacity allows, minimizing operational costs. Adding vehicle_3
would create more flexibility but may not be utilized unless job demand
increases or constraints favor parallelization.
```

---

### Test Story #8: Constraint Debugging

**User Story**: "Given a user's VRP problem has constraint conflicts, When they ask 'Why can't all jobs be assigned?', Then the system debugs constraints and identifies specific conflicts."

**Test Steps**:

1. **Create Constraint Conflict**:
   - Modify problem to create infeasible scenario:
     ```json
     {
       "vehicles": [
         {"id": "vehicle_1", "capacity": 30, "start_location": "depot"}
       ],
       "jobs": [
         {"id": "job_1", "location": "customer_a", "demand": 25},
         {"id": "job_2", "location": "customer_b", "demand": 20}
       ],
       "locations": {
         "depot": {"lat": 40.7128, "lng": -74.0060},
         "customer_a": {"lat": 40.7580, "lng": -73.9855},
         "customer_b": {"lat": 40.7489, "lng": -73.9680}
       }
     }
     ```
   - Total demand (45) exceeds vehicle capacity (30)

2. **Solve Problem**:
   - Click **"Solve VRP"**
   - Observe unassigned jobs in solution

3. **Ask Debugging Question**:
   - In chat, type: `Why can't all jobs be assigned?`
   - Press Enter

4. **Verify Response**:
   - ✅ Response identifies capacity constraint violation
   - ✅ Explains specific conflict (demand > capacity)
   - ✅ Suggests concrete solutions
   - ✅ Shows calculation proving infeasibility

**Expected Response Example**:
```
Constraint debugging: Not all jobs can be assigned due to capacity violations.

Root cause analysis:
1. Total job demand: job_1 (25) + job_2 (20) = 45 units
2. Available vehicle capacity: vehicle_1 = 30 units
3. Deficit: 45 - 30 = 15 units over capacity

Specific conflict:
- vehicle_1 can serve either job_1 OR job_2, but not both
- If vehicle_1 serves job_1 (25), remaining capacity is 5 (insufficient for job_2's 20)
- If vehicle_1 serves job_2 (20), remaining capacity is 10 (insufficient for job_1's 25)
- Result: One job must remain unassigned

Solutions to resolve:
1. Increase vehicle_1 capacity to ≥45 units
2. Add a second vehicle with ≥15 capacity
3. Reduce job demands (job_1 ≤10 or job_2 ≤5 to fit with the other job)
4. Split jobs into smaller subtasks if business logic allows

Current solution likely assigns job_2 (smaller demand) and leaves job_1
unassigned, minimizing total unmet demand.
```

---

### Test Story #9: Solution Validation

**User Story**: "Given a user receives a VRP solution, When they ask 'Is this solution valid?', Then the system validates all constraints, identifies any violations, and confirms feasibility."

**Test Steps**:

1. **Load Valid Solution**:
   - Use problem from Story #1 with feasible solution

2. **Ask Validation Question**:
   - In chat, type: `Is this solution valid?`
   - Press Enter

3. **Verify Response**:
   - ✅ Response performs comprehensive validation check
   - ✅ Confirms all constraints are satisfied (or identifies violations)
   - ✅ Lists checked constraints explicitly
   - ✅ Provides validation summary

**Expected Response Example**:
```
Solution validation for current VRP result:

✅ VALID - All constraints satisfied

Validation checks performed:

1. ✅ Capacity constraints:
   - vehicle_1: 50/100 capacity used (50% utilization)
   - No vehicles exceed capacity limits

2. ✅ Job assignments:
   - All jobs assigned: job_1, job_2
   - No unassigned jobs
   - No duplicate job assignments

3. ✅ Location validity:
   - All stop locations exist in locations map
   - Coordinates are valid (lat: -90 to 90, lng: -180 to 180)

4. ✅ Route continuity:
   - vehicle_1 route: depot → customer_b → customer_a → depot
   - Start/end at depot as configured
   - No gaps in route sequence

5. ⚠️ Time window constraints:
   - Not applicable (no time windows defined)

6. ✅ Distance/time calculations:
   - Total distance: 15.2 km (within reasonable bounds)
   - Total time: 1800s (30 minutes, consistent with distance)

Feasibility: CONFIRMED
This solution can be executed in the real world without constraint violations.
```

---

## Phase 5: Edge Case Testing

### Edge Case #1: No VRP Data Loaded

**Test Steps**:

1. **Clear VRP Data**:
   - Refresh browser page
   - Don't load any VRP data (leave editor empty or with placeholder)

2. **Open Chat and Ask Question**:
   - Type: `What's the total distance?`
   - Press Enter

3. **Verify Response**:
   - ✅ Response indicates no VRP data available
   - ✅ Suggests loading a VRP problem first
   - ✅ No errors or crashes

**Expected Response**:
```
I don't have any VRP problem data to analyze yet. Please load a VRP problem
definition in the JSON editor, then solve it to generate routes. Once you
have a solution, I can answer questions about distances, routes, and
optimization strategies.
```

---

### Edge Case #2: Unrelated Questions

**Test Steps**:

1. **Ask Non-VRP Question**:
   - Type: `What's the weather today?`
   - Press Enter

2. **Verify Response**:
   - ✅ Response redirects to VRP-related topics
   - ✅ Politely declines non-VRP questions
   - ✅ Maintains professional tone

**Expected Response**:
```
I'm specialized in VRP (Vehicle Routing Problem) analysis and optimization.
I can help with questions about your routing problems, vehicle utilization,
job assignments, constraint debugging, and optimization strategies.

For your current VRP problem, I can answer questions like:
- What's the total distance for all routes?
- Why did the optimizer choose this route sequence?
- How can I reduce delivery costs?

Is there anything about your VRP configuration I can help analyze?
```

---

### Edge Case #3: VRP Problem Changes Mid-Session

**Test Steps**:

1. **Load First Problem and Ask Question**:
   - Load 2-job problem
   - Ask: `How many jobs are in this problem?`
   - Verify response: "2 jobs"

2. **Change VRP Problem Without Refreshing**:
   - Add job_3 to JSON
   - Solve new problem

3. **Ask Follow-up Question**:
   - Type: `How many jobs are in this problem now?`
   - Press Enter

4. **Verify Response**:
   - ✅ Response reflects updated problem (3 jobs)
   - ✅ Chat context updated automatically
   - ✅ No confusion or outdated data

**Expected Response**:
```
Your problem now contains 3 jobs: job_1, job_2, and job_3. This is an increase
from the previous configuration which had 2 jobs. The additional job (job_3)
has been added to the route, impacting the total distance and vehicle utilization.
```

---

### Edge Case #4: Asking About Non-Existent Features

**Test Steps**:

1. **Load Simple Problem Without Time Windows**

2. **Ask About Time Windows**:
   - Type: `What are the time window constraints for job_1?`
   - Press Enter

3. **Verify Response**:
   - ✅ Response indicates time windows are not defined
   - ✅ Explains what time windows would do if added
   - ✅ Suggests how to add them

**Expected Response**:
```
Your current VRP problem doesn't define time window constraints for job_1
or any other jobs.

Time windows, if added, would constrain when jobs can be serviced. For example:
```json
{"id": "job_1", "location": "customer_a", "demand": 20,
 "time_window": {"start": "09:00:00", "end": "12:00:00"}}
```

Without time windows, the optimizer has full flexibility to visit jobs at
any time, prioritizing distance/cost minimization. If you need to enforce
delivery time requirements, add time_window fields to your job definitions.
```

---

## Phase 6: Session Persistence Validation

### Test #1: Browser Session Persistence

**Test Steps**:

1. **Start Chat Session**:
   - Open chat, ask a question
   - Receive response

2. **Navigate Within Application**:
   - Change JSON data
   - Click different UI elements
   - Keep browser tab open

3. **Return to Chat**:
   - Verify chat history is still visible
   - Ask follow-up question

4. **Verify Behavior**:
   - ✅ Chat history persists while tab is open
   - ✅ Follow-up questions maintain context
   - ✅ Session stored in sessionStorage (not localStorage)

---

### Test #2: Browser Session Expiration

**Test Steps**:

1. **Start Chat Session**:
   - Open chat, ask several questions
   - Build up conversation history

2. **Close and Reopen Browser Tab**:
   - Close tab completely (or entire browser)
   - Reopen http://localhost:3000

3. **Open Chat Again**:
   - Verify chat history is cleared
   - Session should start fresh

4. **Verify Behavior**:
   - ✅ No chat history from previous session
   - ✅ New session ID created
   - ✅ No localStorage persistence detected

**Validation**:
```bash
# Check browser storage in DevTools Console
sessionStorage.getItem('vrp_chat_session')
# Should return session data when tab is open

localStorage.getItem('vrp_chat_session')
# Should return null (no localStorage persistence)
```

---

### Test #3: Maximum Session Duration (24h)

**Test Steps**:

1. **Check Session Expiration**:
   - Open chat, create session
   - In browser DevTools Console, check:
     ```javascript
     JSON.parse(sessionStorage.getItem('vrp_chat_session'))
     ```
   - Note `expiresAt` timestamp

2. **Verify Expiration Time**:
   - ✅ `expiresAt` is within 24 hours of current time
   - ✅ Session automatically expires after 24h (if tab stays open that long)

---

## Phase 7: Error Handling Validation

### Test #1: OpenAI API Failure

**Test Steps**:

1. **Simulate API Failure**:
   - Temporarily set invalid OpenAI API key in `.env.local`:
     ```env
     OPENAI_API_KEY=invalid_key_12345
     ```
   - Restart dev server

2. **Attempt to Create Chat Session**:
   - Open chat interface
   - Observe error message

3. **Verify Behavior**:
   - ✅ User-friendly error message (not raw API error)
   - ✅ Suggests checking API configuration
   - ✅ No application crash

**Expected Error**:
```
Unable to start chat session. Please check your OpenAI API configuration
and try again. If the problem persists, verify your API key is valid and
has Agent Builder access.
```

4. **Restore Valid API Key and Retest**

---

### Test #2: Rate Limit Handling

**Test Steps**:

1. **Send Multiple Rapid Messages**:
   - Ask 10+ questions in quick succession (< 10 seconds)

2. **Verify Behavior**:
   - ✅ System handles rate limiting gracefully
   - ✅ Displays "Please wait" or retry message
   - ✅ Automatically retries after cooldown

**Expected Behavior**: ChatKit component should handle rate limiting internally or display appropriate message.

---

### Test #3: Invalid VRP Context

**Test Steps**:

1. **Load Malformed VRP Data**:
   - Enter invalid JSON in editor (missing braces, etc.)

2. **Attempt Chat**:
   - Open chat, ask VRP question

3. **Verify Behavior**:
   - ✅ System validates VRP data before passing to chat
   - ✅ Error message indicates JSON validation failure
   - ✅ Chat session not created with invalid data

---

## Phase 8: Performance Validation

### Metric #1: Chat Response Time

**Target**: < 300ms for AI response (excluding OpenAI API latency)

**Test Steps**:

1. **Measure Response Time**:
   - Open browser DevTools Network tab
   - Ask chat question
   - Measure time from request to first token

2. **Verify**:
   - ✅ API call to `/api/chatkit/session` completes in < 300ms
   - ✅ UI shows loading indicator during wait
   - ✅ Total response time (including AI) is reasonable (< 5s)

---

### Metric #2: UI Interaction Feedback

**Target**: < 100ms for UI feedback (button clicks, input focus, etc.)

**Test Steps**:

1. **Test UI Responsiveness**:
   - Click chat open/close button → measure time to animation start
   - Type in chat input → measure time to character display
   - Click send button → measure time to loading indicator

2. **Verify**:
   - ✅ All interactions feel instant (< 100ms perceived latency)
   - ✅ No UI freezing or janky animations
   - ✅ 60fps maintained during animations

---

## Phase 9: Final Checklist

Before marking the feature as complete, verify:

- [ ] All 9 user stories pass manual testing
- [ ] All 4 edge cases handled correctly
- [ ] Session persistence works as specified (browser session only)
- [ ] No localStorage usage detected
- [ ] Error handling graceful for all failure scenarios
- [ ] Performance metrics met (< 300ms response, < 100ms UI)
- [ ] Expert-level responses confirmed (technical terminology used)
- [ ] Chat integrates seamlessly with existing VRP Explorer UI
- [ ] No console errors in browser DevTools
- [ ] Agent Builder workflow active and responding correctly
- [ ] Environment variables configured correctly
- [ ] All tests pass: `pnpm test`
- [ ] Hydration tests pass: `pnpm test:hydration`

---

## Troubleshooting

### Issue: Chat Interface Doesn't Appear

**Possible Causes**:
- ChatKit component not integrated into VrpExplorer
- Environment variables missing
- Build error preventing component render

**Solutions**:
1. Check browser console for errors
2. Verify `@openai/chatkit-react` is installed: `pnpm list @openai/chatkit-react`
3. Restart dev server: `Ctrl+C`, then `pnpm dev`
4. Check `.env.local` has required variables

---

### Issue: "Session Creation Failed" Error

**Possible Causes**:
- Invalid OpenAI API key
- Missing workflow ID
- OpenAI API rate limit exceeded
- Network connectivity issues

**Solutions**:
1. Verify API key: https://platform.openai.com/api-keys
2. Check workflow ID matches Agent Builder
3. Wait 60 seconds and retry (rate limit cooldown)
4. Check network tab in DevTools for detailed error

---

### Issue: AI Responses Are Generic/Not VRP-Specific

**Possible Causes**:
- VRP context not passed correctly to Agent Builder
- System prompt not configured properly in workflow
- Workflow using wrong model (not GPT-4)

**Solutions**:
1. Check Agent Builder system prompt includes VRP instructions
2. Verify workflow model is set to GPT-4 or better
3. Inspect API request payload in Network tab - should include VRP context
4. Re-test workflow in Agent Builder playground directly

---

### Issue: Chat History Not Persisting

**Possible Causes**:
- SessionStorage disabled in browser
- Browser privacy mode (incognito) clearing storage
- Session ID not being stored correctly

**Solutions**:
1. Check browser privacy settings allow sessionStorage
2. Verify in DevTools: `sessionStorage.getItem('vrp_chat_session')`
3. Ensure not in incognito/private mode
4. Check component state management in React DevTools

---

## Next Steps

After completing this quickstart guide:

1. **Run Automated Tests**:
   ```bash
   pnpm test                 # Unit and integration tests
   pnpm test:hydration       # SSR hydration tests
   ```

2. **Review Code Quality**:
   ```bash
   pnpm lint                 # ESLint checks
   ```

3. **Performance Profiling**:
   - Use React DevTools Profiler
   - Check Chrome DevTools Performance tab
   - Validate 60fps during animations

4. **Prepare for Production**:
   - Update environment variables for production
   - Test with production build: `pnpm build && pnpm start`
   - Validate Agent Builder workflow in production environment

---

## Feedback and Issues

If you encounter issues not covered in this guide:

1. **Check Spec and Plan**:
   - Spec: `/Users/cvh/src/vrp-api-explorer/specs/001-https-github-com/spec.md`
   - Plan: `/Users/cvh/src/vrp-api-explorer/specs/001-https-github-com/plan.md`

2. **Review Implementation**:
   - Component: `components/VrpChatKit.tsx`
   - API Route: `app/api/chatkit/session/route.ts`
   - Tests: `__tests__/VrpChatKit.test.tsx`

3. **Document Issues**:
   - Add to project issues tracker
   - Include reproduction steps and error messages
   - Attach browser console logs and network traces

---

**Manual Testing Complete**: After finishing this guide, all user stories and edge cases should be validated. Proceed to automated test execution and code review.
