# VRP API Explorer - Python Backend Migration Guide

## ✅ What's Been Completed

### Python Backend (Phases 1-4) ✓

A complete FastAPI backend has been implemented with the following structure:

```
python-backend/
├── app/
│   ├── main.py              # FastAPI app with CORS & routes
│   ├── chat.py              # ChatKit server with VRP context injection
│   ├── constants.py         # VRP assistant system prompts
│   ├── memory_store.py      # ChatKit thread storage
│   └── vrp/
│       ├── routes.py        # All VRP API endpoints
│       ├── models.py        # Pydantic models
│       ├── validators.py    # Complexity validation (ported from TS)
│       ├── context_store.py # VRP context for ChatKit
│       ├── client.py        # Solvice SDK wrapper
│       └── tools.py         # ChatKit VRP analysis tools
├── pyproject.toml
├── .env                     # ✅ Configured with your API keys
└── README.md
```

### Key Features Implemented:

- **VRP API Routes**: solve, load, reorder, explanation endpoints
- **ChatKit Integration**: AI-powered VRP analysis with hidden context injection
- **VRP-Specific Tools**: `analyze_solution()` and `suggest_improvements()` for AI
- **Context Store**: Automatic VRP data injection into ChatKit conversations
- **Complexity Validation**: Demo limits enforcement (ported from TypeScript)
- **Error Handling**: Comprehensive error mapping and HTTP exceptions

### Environment Configuration (Phase 5) ✓

- ✅ `python-backend/.env` configured with Solvice + OpenAI API keys
- ✅ `.env.local` updated with `NEXT_PUBLIC_API_URL=http://localhost:8000`

---

## 🚀 Next Steps to Complete Migration

### Step 1: Install Python Dependencies

```bash
cd python-backend

# Install uv package manager (if not already installed)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Verify installation
uv run python -c "import fastapi; import chatkit; print('✅ Dependencies installed')"
```

### Step 2: Start Python Backend (Test Only)

You can test the Python backend independently before integrating with frontend:

```bash
# Quick test: Start Python backend only
pnpm dev:python-only

# You should see:
# 🚀 VRP API Explorer Backend starting up
#    Solvice API: ✅ Configured
#    OpenAI API: ✅ Configured
#    ChatKit: ✅ Enabled
```

**Test the backend:**
```bash
# Health check
curl http://localhost:8000/health

# Should return:
# {"status": "healthy", "services": {"vrp_api": "operational", "chatkit": "operational"}}
```

**Note:** Once frontend is updated, you can run both servers with just `pnpm dev` (see Step 4).

### Step 3: Update Frontend API Calls (REQUIRED)

The frontend still points to Next.js API routes. You need to update these components:

#### 3.1 Create API URL Helper

Create `lib/api-config.ts`:

```typescript
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
```

#### 3.2 Update `components/VrpExplorer.tsx`

Replace all `/api/vrp/*` calls with Python backend URLs:

```typescript
import { API_URL } from '@/lib/api-config'

// Line 82: Update solve endpoint
const response = await fetch(`${API_URL}/vrp/solve`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(vrpRequest.data)
})

// Line 190: Update load endpoint
const response = await fetch(`${API_URL}/vrp/jobs/${jobId}/load`)

// Line 279: Update reorder endpoint
const response = await fetch(`${API_URL}/vrp/reorder`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({...})
})
```

#### 3.3 Update `components/VrpChatKit.tsx`

Point ChatKit to Python backend:

```typescript
import { API_URL } from '@/lib/api-config'

// Replace getClientSecret implementation
async getClientSecret() {
  // Store VRP context in Python backend
  if (vrpData) {
    const sessionId = `session_${Date.now()}`

    await fetch(`${API_URL}/vrp/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        request: vrpData,
        solution: solution || null
      })
    })
  }

  // Use Python ChatKit endpoint (or keep OpenAI direct connection)
  // Note: If using Python ChatKit, point to ${API_URL}/chatkit
}
```

### Step 4: Test the Integration

1. **Start both servers (NEW: Single Command!):**
   ```bash
   # Run both servers concurrently (recommended)
   pnpm dev

   # This will start:
   # - API (blue): Python backend on http://localhost:8000
   # - WEB (green): Next.js frontend on http://localhost:3000
   ```

   **Alternative (separate terminals):**
   ```bash
   # Terminal 1: Python backend only
   pnpm dev:python-only

   # Terminal 2: Next.js frontend only
   pnpm dev:frontend
   ```

2. **Test VRP Solve:**
   - Open http://localhost:3000
   - Click "Send" to solve the default VRP problem
   - Check browser console for API calls to `http://localhost:8000/vrp/solve`

3. **Test ChatKit with VRP Context:**
   - After solving, open the chat panel
   - Ask "Analyze this solution" or "What can be improved?"
   - The AI should reference specific job IDs, routes, and metrics from your VRP data

### Step 5: Clean Up Old Code (Optional)

Once everything works, you can remove:

```bash
# Delete Next.js API routes (no longer needed)
rm -rf app/api/vrp/
rm -rf app/api/chatkit/

# Keep lib/sample-data.ts (still used by frontend)
```

---

## 📐 Architecture Overview

### Before (Dual Client-Side + Next.js API)
```
Frontend (Next.js) → /api/vrp/* (Next.js routes) → Solvice API
                  → OpenAI API (direct) → No VRP context
```

### After (Single Python Backend)
```
Frontend (Next.js) → Python FastAPI Backend
                       ├─ /vrp/solve → Solvice API
                       ├─ /vrp/context → Context Store
                       └─ /chatkit → ChatKit + Hidden VRP Context → OpenAI
```

### Key Benefit: Hidden Context Injection

The Python backend now stores VRP data after each solve:

```python
# In /vrp/solve route
await vrp_context_store.save(
    session_id=session_id,
    request=vrp_request,
    solution=vrp_solution
)
```

Then injects it as `HiddenContextItem` in ChatKit conversations:

```python
# In chat.py
<VRP_CONTEXT>
## Problem Overview
- Total Jobs: 50
- Total Resources: 5

## Solution
- Routes Generated: 5
- Unassigned Jobs: 0
...
</VRP_CONTEXT>
```

The AI sees this context but users don't!

---

## 🔧 Troubleshooting

### Python dependencies fail to install

```bash
# Try with pip instead of uv
cd python-backend
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -e .
```

### CORS errors in browser

Check that `CORS_ORIGINS` in `python-backend/.env` includes your frontend URL:
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:3005
```

### ChatKit not working

1. Verify OpenAI API key: `echo $OPENAI_API_KEY`
2. Check Python backend logs for ChatKit initialization
3. Ensure `openai-chatkit` package is installed: `pip list | grep chatkit`

### Frontend still calling Next.js routes

- Verify `.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Restart Next.js dev server (environment variables only load on start)
- Check browser Network tab to see which URLs are being called

---

## 📊 Migration Status

| Phase | Task | Status |
|-------|------|--------|
| 1 | Python backend structure | ✅ Complete |
| 2 | Port business logic | ✅ Complete |
| 3 | VRP API routes | ✅ Complete |
| 4 | ChatKit integration | ✅ Complete |
| 5 | Environment configuration | ✅ Complete |
| 6 | Frontend API updates | ⏳ **YOUR TURN** |
| 7 | Testing | ⏳ After frontend updates |
| 8 | Cleanup old routes | ⏳ Optional |

---

## 🎯 Success Criteria

You'll know the migration is complete when:

1. ✅ Python backend starts without errors
2. ✅ `/health` endpoint returns all services operational
3. ✅ Frontend VRP solve works through Python backend
4. ✅ ChatKit references specific VRP data (jobs, routes, metrics)
5. ✅ No console errors about missing API endpoints

---

## 📝 Available NPM Scripts

After migration, you have these convenient commands:

| Command | Description |
|---------|-------------|
| `pnpm dev` | **Start both backends concurrently** (recommended) |
| `pnpm dev:frontend` | Start Next.js frontend only (port 3000) |
| `pnpm dev:python-only` | Start Python backend only (port 8000) |
| `pnpm build` | Build Next.js for production |
| `pnpm test` | Run Jest tests |

**Example output of `pnpm dev`:**
```
[API] 🚀 VRP API Explorer Backend starting up
[API]    Solvice API: ✅ Configured
[WEB] ▲ Next.js 15.5.4
[WEB] - Local:        http://localhost:3000
```

---

## 📞 Need Help?

If you get stuck, check:

1. **Python backend logs** (terminal running uvicorn)
2. **Browser console** (Network tab for API calls)
3. **Next.js terminal** (for build/runtime errors)

Common issues are usually:
- Missing/wrong API keys in `.env` files
- Frontend still pointing to `/api/vrp/*` instead of `${API_URL}/vrp/*`
- CORS configuration not including frontend URL
- Python dependencies not installed (run `cd python-backend && uv sync`)

---

Good luck! The hardest part (backend migration) is done. Now just need to wire up the frontend. 🚀
