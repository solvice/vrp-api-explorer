# Performance Optimization

## Overview

For datasets with 1000+ jobs, the app automatically switches to `VrpMapOptimized` which uses GPU-rendered MapLibre circle layers instead of DOM markers.

## Architecture

### VrpMapAdaptive (Auto-switching)

```typescript
import { VrpMapAdaptive } from '@/components/VrpMapAdaptive'

<VrpMapAdaptive requestData={data} responseData={solution} />
```

- **<1000 jobs**: Uses `VrpMap` (full features: hover, tooltips, Gantt sync)
- **≥1000 jobs**: Uses `VrpMapOptimized` (GPU-rendered, simplified)

### Performance Gains

**Standard VrpMap:**
- 1 DOM element per marker
- Event listeners per marker
- CPU-intensive text rendering

**VrpMapOptimized:**
- Single GeoJSON source
- GPU-rendered circles (4px)
- No text labels
- Thin gray routes (1.5px, 40% opacity)
- Route highlighting on hover

### Features

**Included:**
- All 5000+ markers visible simultaneously
- Click markers for job details
- Hover to highlight vehicle route
- Smooth panning/zooming

**Removed:**
- Hover highlighting on markers
- Sequence number labels
- Gantt chart synchronization
- Colored thick routes (simplified to thin gray)

## Tested Performance

✅ 5000 jobs - Fast and responsive
✅ Hover highlighting - No lag
✅ Zoom/pan - Smooth at all levels

## Implementation

Optimized map uses:
1. MapLibre circle layers (GPU-accelerated)
2. GeoJSON source with all job features
3. Dynamic paint properties for hover effects
4. Simplified route rendering (thin, semi-transparent)

No clustering required - GPU handles 5000+ tiny circles efficiently.
