# Performance Optimization

## VrpMapOptimized Component

A simplified map component that uses MapLibre circle layers instead of DOM markers.

### What It Does

**Standard VrpMap:**
- Creates a DOM element (`<div>`) for each job marker
- Each marker has inline styles, event listeners, and tooltip HTML
- 1000 jobs = 1000 DOM elements + 2000+ event listeners

**VrpMapOptimized:**
- Uses MapLibre's native circle layers (GPU-rendered)
- All markers are a single GeoJSON source
- No individual DOM elements or event listeners per marker

### When to Use

```typescript
import { VrpMapOptimized } from '@/components/VrpMapOptimized'

// Use for large datasets (1000+ jobs)
<VrpMapOptimized requestData={data} responseData={solution} />
```

### What's Different

**Removed features:**
- No hover highlighting
- No custom marker tooltips (uses basic popup on click)
- No drag-and-drop integration
- Simpler styling

**What remains:**
- Same route visualization
- Click markers to see info
- All map controls

### Theoretical Performance

Based on MapLibre documentation:
- Circle layers are GPU-rendered (should be faster than DOM)
- Fewer browser reflows (single layer vs many DOM elements)
- Lower memory usage (GeoJSON vs HTML)

**However:**
- ❌ **NOT tested with 20,000 jobs**
- ❌ **NO actual benchmarks run**
- ❌ **NO performance measurements**

### Testing Status

✅ Code compiles without errors
✅ Passes ESLint
✅ Uses correct MapLibre API
❌ Not tested in browser
❌ Not tested with large datasets
❌ Performance claims are theoretical only

### Recommendation

1. **Try it with your actual data**
2. **Measure performance** using browser DevTools
3. **Compare to standard VrpMap** with same dataset
4. **Report back** what you find

If it works well, great. If not, at least we'll have real data to work with.

### Code

The component is ~200 lines, located at `components/VrpMapOptimized.tsx`.

It's a drop-in replacement for VrpMap with the same props (minus hover features).

### Known Limitations

- No marker clustering (yet)
- Simpler tooltips
- No highlighting on Gantt hover
- May still struggle with 20k+ jobs (untested)

### Next Steps (If This Works)

If this proves faster:
1. Add clustering for very large datasets
2. Restore hover highlighting via feature state
3. Add back advanced tooltip features
4. Consider making it the default

**But test first before adding complexity.**
