# Codebase Refactoring Analysis

After analyzing the codebase, here are the most urgent refactoring opportunities:

## 🔴 **CRITICAL: VrpMap Component Complexity (930 lines)**

**Location**: `components/VrpMap.tsx`

**Issues**:
- Massive component with mixed concerns (map initialization, markers, routes, style switching)
- `renderMapData()` function at 308 lines (lines 600-908) is extremely complex
- `switchMapStyle()` callback at 250 lines (lines 194-444) contains full route re-rendering logic
- Heavy duplication between `switchMapStyle` and `renderMapData` for route/marker creation
- Complex nested conditional logic for polyline decoding repeated in multiple places

**Impact**: High - makes maintenance difficult, testing impossible, performance issues

**Recommended Actions**:
1. Extract route rendering logic to `lib/map-route-renderer.ts`
2. Extract marker management to `lib/map-marker-manager.ts`
3. Create custom hooks: `useMapMarkers()`, `useMapRoutes()`, `useMapStyle()`
4. Split into smaller components: `MapStyleSwitcher`, `MapRouteLayer`, `MapMarkerLayer`

---

## 🟠 **HIGH: Duplicate Error Handling Logic**

**Locations**:
- `app/api/vrp/solve/route.ts:53-84`
- `lib/vrp-api.ts:135-189`

**Issues**:
- Error classification logic duplicated in both server and client
- Similar error type mapping (`authentication`, `validation`, `timeout`, `network`)
- Inconsistent error messages between implementations

**Recommended Actions**:
1. Create shared `lib/error-types.ts` with error type constants
2. Extract error classification to `lib/error-classifier.ts`
3. Reuse in both API route and client-side VrpApiClient

---

## 🟠 **HIGH: Resource-to-Color Mapping Duplication**

**Locations**:
- `components/VrpMap.tsx:611-616` (renderMapData)
- `components/VrpMap.tsx:236-241` (switchMapStyle)
- `components/VrpGantt.tsx:33-44` (useMemo hook)

**Issues**:
- Same color mapping algorithm repeated 3 times
- Hardcoded ROUTE_COLORS array duplicated in both files
- Logic drift risk - VrpMap has 2 internal copies

**Recommended Actions**:
1. Extract to `lib/color-utils.ts`:
   ```typescript
   export function createResourceColorMap(trips: Trip[]): Map<string, string>
   export const ROUTE_COLORS = [...]
   ```
2. Use shared implementation in all 3 locations

---

## 🟠 **HIGH: OpenAI Service State Management**

**Location**: `components/VrpAssistant/VrpAssistantContext.tsx`

**Issues**:
- OpenAI service initialized as `null` (line 47) but never actually set
- Lazy initialization pattern incomplete - creates new instance every time (lines 88-97)
- Service created inside try-catch but not stored
- No configuration validation on mount

**Recommended Actions**:
1. Initialize service in `useState` or create once in `useMemo`
2. Add configuration check on provider mount
3. Remove unused state if service is stateless

---

## 🟡 **MEDIUM: API Route Boilerplate**

**Locations**:
- `app/api/vrp/solve/route.ts:6-23`
- `app/api/vrp/load/[jobId]/route.ts:10-25`

**Issues**:
- Identical rate limiting code duplicated
- Same API key extraction logic (lines 24-36 vs 27-36)
- Similar error response formatting

**Recommended Actions**:
1. Create `lib/api-middleware.ts`:
   ```typescript
   export async function withRateLimit(request: NextRequest, handler: () => Promise<Response>)
   export function getApiKey(request: NextRequest): string | null
   ```
2. Apply DRY principle to both routes

---

## 🟡 **MEDIUM: Marker Creation Logic Duplication**

**Location**: `components/VrpMap.tsx`

**Issues**:
- Marker creation repeated 3 times:
  - Lines 245-255 (resource markers in switchMapStyle)
  - Lines 622-634 (resource markers in renderMapData)
  - Lines 637-659 (job markers in renderMapData)
- Similar logic in lines 868-884 (request-only markers)
- Each instance has slightly different implementations

**Recommended Actions**:
1. Extract to reusable functions:
   ```typescript
   function createResourceMarkers(resources, map, markers, bounds)
   function createJobMarkers(jobs, trips, map, markers, bounds, colors)
   ```
2. Consolidate bounce.extend() logic

---

## 🟡 **MEDIUM: CSV Conversion Error Handling**

**Locations**:
- `components/VrpAssistant/VrpAssistantContext.tsx:172-209` (single file)
- `components/VrpAssistant/VrpAssistantContext.tsx:211-241` (multiple files)
- Shared helper at lines 243-314

**Issues**:
- `processCsvUpload` and `processMultipleCsvUpload` are 90% identical
- Both have similar try-catch-finally structure
- Error handling delegated to shared helper but setup code duplicated

**Recommended Actions**:
1. Merge into single function with conditional logic:
   ```typescript
   async processCsvUpload(input: string | File[], filename?: string)
   ```
2. Simplify based on input type

---

## 🟢 **LOW: Type Safety in VrpExplorer**

**Location**: `components/VrpExplorer.tsx:130-140`

**Issues**:
- Excessive type assertions with `as unknown as Record<string, unknown>`
- Verbose type checking in callbacks (lines 132-136)
- Loss of type safety from Solvice SDK types

**Recommended Actions**:
1. Use proper SDK types from `solvice-vrp-solver`
2. Remove intermediate unknown casts
3. Trust TypeScript's inference

---

## 📊 **Summary Priority**

1. **Immediate** (this sprint): VrpMap refactoring - biggest complexity issue
2. **High** (next sprint): Duplicate error handling and color mapping
3. **Medium** (backlog): API middleware, marker creation consolidation
4. **Low** (technical debt): Type safety improvements

**Estimated Refactoring Effort**: 2-3 days for critical items, 1 week total for all priorities