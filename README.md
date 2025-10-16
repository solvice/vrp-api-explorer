# VRP API Explorer

An interactive web application for exploring and visualizing Vehicle Routing Problem (VRP) solutions using the [Solvice VRP API](https://www.solvice.io/). This tool provides a user-friendly interface for creating VRP requests, submitting them to the Solvice API, and visualizing the optimized routes on an interactive map with AI-powered analysis.

**Architecture**: Next.js frontend + Python FastAPI backend with integrated OpenAI ChatKit for VRP analysis.

## Features

- **🗺️ Interactive Map Visualization**: View VRP problems and solutions on a map with the clean Solvice styling
- **📝 JSON Editor**: Create and edit VRP requests with real-time validation
- **🚛 Route Visualization**: See optimized vehicle routes with color-coded paths and sequence numbers
- **🔧 API Integration**: Direct integration with Solvice VRP API with proper error handling
- **⚡ Real-time Validation**: Client-side validation using actual Solvice SDK types
- **🎨 Professional UI**: Clean, responsive interface built with modern React components
- **🤖 AI-Powered Analysis**: ChatKit-based VRP analysis assistant with hidden context injection
- **💬 Smart Chat Interface**: Ask questions about your VRP solution and get specific insights
- **🔄 Error Recovery**: Robust error handling with retry logic and user-friendly messaging
- **📊 Gantt Chart**: Minimal timeline visualization showing vehicle schedules
- **🔀 Job Reordering**: Drag-and-drop job reordering with live re-optimization

## Screenshots

The application provides a split-pane interface with:
- **Left Panel**: JSON editor for VRP request data with validation feedback
- **Right Panel**: Interactive map showing job locations, vehicle depots, and optimized routes
- **AI Assistant**: Floating chat interface accessible via the robot icon for natural language VRP modifications

## Getting Started

### Prerequisites

- **Node.js 18+** (for Next.js frontend)
- **Python 3.11+** (for FastAPI backend)
- **pnpm** (recommended) or npm
- **uv** (Python package manager - recommended)
- A **Solvice VRP API key** ([Get one here](https://www.solvice.io/))
- An **OpenAI API key** (for AI assistant functionality)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vrp-api-explorer
   ```

2. **Install frontend dependencies**
   ```bash
   pnpm install
   ```

3. **Install Python backend dependencies**
   ```bash
   # Install uv (Python package manager)
   curl -LsSf https://astral.sh/uv/install.sh | sh

   # Install Python dependencies
   cd python-backend
   uv sync
   cd ..
   ```

4. **Set up environment variables**

   Create a `.env.local` file in the project root:
   ```bash
   SOLVICE_API_KEY=your_solvice_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

   Configure Python backend (already done if you followed step 3):
   ```bash
   cd python-backend
   cp .env.example .env
   # Edit .env and add your API keys
   ```

   > **Note**: API keys are server-side only for security. Never expose them client-side.

5. **Run both servers concurrently**
   ```bash
   pnpm dev
   ```

   This starts:
   - **Python backend**: http://localhost:8000 (FastAPI with ChatKit)
   - **Next.js frontend**: http://localhost:3000 (React UI)

6. **Open the application**

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Basic Workflow

1. **Edit VRP Data**: Use the JSON editor on the left to modify the VRP problem
   - Jobs: Define delivery/pickup locations with coordinates
   - Resources: Configure vehicles with shifts and constraints
   - Options: Set solver preferences

2. **Validate**: The editor provides real-time validation feedback
   - ✅ Green checkmark: Valid request
   - ❌ Red X: Validation errors with detailed messages

3. **Solve**: Click the "Send" button to submit to Solvice VRP API
   - Authentication is verified automatically
   - Loading states and error handling included

4. **Visualize**: View the optimized solution on the map
   - Color-coded routes for each vehicle
   - Numbered markers showing visit sequence
   - Interactive tooltips with timing information

5. **AI Analysis** (Optional): Get insights about your VRP solution
   - Click the chat icon to open the AI assistant
   - Ask questions like "What can be improved?" or "Analyze route efficiency"
   - AI has access to your VRP problem and solution data (via hidden context)
   - Get specific recommendations with actual job IDs and metrics

### Sample Data

The application includes sample VRP data for Berlin deliveries:
- 4 delivery jobs across Berlin landmarks
- 2 vehicles with different capacities
- Realistic coordinates and time windows

### API Key Management

- **Demo Key**: Use the included demo key for testing
- **User Key**: Add your own API key via the settings button
- **Key Validation**: Automatic authentication verification

## Project Structure

```
vrp-api-explorer/
├── app/                         # Next.js frontend
│   ├── api/chatkit/            # ChatKit session endpoint (legacy)
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Main page
├── components/
│   ├── VrpExplorer.tsx         # Main application component
│   ├── VrpJsonEditor.tsx       # JSON editor with validation
│   ├── VrpMap.tsx              # Interactive map component
│   ├── VrpGantt.tsx            # Gantt chart timeline
│   ├── VrpChatKit.tsx          # ChatKit integration
│   ├── VrpLayout.tsx           # Resizable layout
│   └── ui/                     # Reusable UI components
├── lib/
│   ├── api-config.ts           # API URL configuration
│   ├── vrp-api.ts              # VRP API client
│   ├── vrp-schema.ts           # Validation using SDK types
│   └── sample-data.ts          # Sample VRP data
├── python-backend/             # Python FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI entry point
│   │   ├── chat.py             # ChatKit server with VRP context
│   │   ├── constants.py        # AI system prompts
│   │   ├── memory_store.py     # ChatKit thread storage
│   │   └── vrp/
│   │       ├── routes.py       # VRP API endpoints
│   │       ├── models.py       # Pydantic models
│   │       ├── validators.py   # Complexity validation
│   │       ├── context_store.py # VRP context for ChatKit
│   │       ├── client.py       # Solvice SDK wrapper
│   │       └── tools.py        # ChatKit VRP analysis tools
│   └── pyproject.toml          # Python dependencies
└── __tests__/                  # Test suites
```

## Technical Details

### Architecture

**Frontend (Next.js 15 + React 19)**
- User interface with JSON editor, map, and chat
- Connects to Python backend via REST API
- Real-time validation and state management

**Backend (Python FastAPI)**
- VRP API proxy to Solvice
- ChatKit server with hidden context injection
- VRP-specific AI tools for analysis
- Context store for VRP problem/solution data

**Key Technologies**
- **Styling**: Tailwind CSS with Shadcn/ui components
- **Maps**: MapLibre GL with Solvice styling
- **Validation**: Runtime type checking using Solvice SDK types
- **AI**: OpenAI ChatKit with GPT-4 for VRP analysis
- **Backend**: FastAPI with async request handling

### Key Features

- **Type Safety**: Uses actual Solvice VRP SDK types for validation
- **Error Handling**: Comprehensive error mapping and user feedback
- **Performance**: Optimized rendering and map interactions
- **Accessibility**: Keyboard navigation and screen reader support
- **AI-Powered**: Natural language interface for VRP data modifications
- **Smart Suggestions**: Context-aware optimization recommendations
- **Chat Persistence**: Conversation history saved to localStorage

### Testing

```bash
# Run unit tests
pnpm test

# Run in watch mode
pnpm test:watch

# Run hydration tests (prevents SSR issues)
pnpm test:hydration
```

## API Integration

The application uses the [Solvice VRP Solver SDK](https://www.npmjs.com/package/solvice-vrp-solver) for type-safe API integration:

```typescript
// Example VRP request structure
{
  "jobs": [
    {
      "name": "delivery_1",
      "duration": 900,
      "location": {
        "latitude": 52.5200,
        "longitude": 13.4050
      }
    }
  ],
  "resources": [
    {
      "name": "vehicle_1",
      "shifts": [
        {
          "from": "2024-01-15T08:00:00Z",
          "to": "2024-01-15T18:00:00Z"
        }
      ]
    }
  ]
}
```

## Development

### Available Scripts

**Development:**
- `pnpm dev` - **Start both frontend and backend concurrently** (recommended)
- `pnpm dev:frontend` - Start Next.js frontend only (port 3000)
- `pnpm dev:python-only` - Start Python backend only (port 8000)

**Build & Test:**
- `pnpm build` - Build Next.js for production
- `pnpm start` - Start production Next.js server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run Jest tests
- `pnpm test:hydration` - Check for SSR hydration issues

**Python Backend:**
```bash
cd python-backend
uv run uvicorn app.main:app --reload  # Start with hot-reload
uv run pytest                          # Run Python tests (if available)
```

### Contributing

1. Follow the existing code style and patterns
2. Add tests for new features
3. Ensure TypeScript compliance
4. Test with actual Solvice API

## Troubleshooting

### Common Issues

**API Key Not Working**
- Ensure Solvice and OpenAI keys are in `.env.local` as server-side environment variables
- Restart the development server after adding keys
- Check browser console for authentication errors
- Verify OpenAI API key has sufficient credits and permissions

**Map Not Loading**
- Verify internet connection (Solvice tiles require external access)
- Check browser console for CORS or network errors

**Validation Errors**
- Ensure coordinate format uses `latitude`/`longitude` (not `lat`/`lng`)
- Verify required fields: `jobs` array and `resources` array
- Check that datetime strings are in ISO 8601 format

**AI Assistant Not Working**
- Verify both frontends are running (`pnpm dev`)
- Check Python backend logs for ChatKit initialization
- Verify OpenAI API key in `python-backend/.env`
- Ensure OpenAI account has sufficient credits
- Check browser console: VRP context should be stored on solve

**Python Backend Issues**
- Install dependencies: `cd python-backend && uv sync`
- Check Python version: `python --version` (needs 3.11+)
- Verify `.env` file has both SOLVICE_API_KEY and OPENAI_API_KEY
- Check CORS origins in `python-backend/.env` include `http://localhost:3000`

### Getting Help

- **Browser console**: Detailed error messages and API responses
- **Python backend logs**: Check terminal running `pnpm dev`
- **Migration guide**: See `MIGRATION.md` for Python backend details
- **Solvice support**: Verify API key permissions
- **Solvice docs**: [https://docs.solvice.io/](https://docs.solvice.io/)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Next.js Frontend (port 3000)                          │ │
│  │  • VRP JSON Editor                                     │ │
│  │  • Interactive Map (MapLibre GL)                       │ │
│  │  • Gantt Chart Timeline                                │ │
│  │  • ChatKit UI                                          │ │
│  └─────────┬──────────────────────────────────────────────┘ │
└────────────┼───────────────────────────────────────────────┘
             │
             │ REST API (http://localhost:8000)
             ▼
┌────────────────────────────────────────────────────────────┐
│        Python FastAPI Backend (port 8000)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  VRP Routes                                           │  │
│  │  • POST /vrp/solve      → Solvice API                │  │
│  │  • GET  /vrp/jobs/{id}  → Load persisted jobs        │  │
│  │  • POST /vrp/context    → Store VRP context          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ChatKit Server                                       │  │
│  │  • POST /chatkit        → Streaming AI responses     │  │
│  │  • Hidden Context Injection (VRP data)               │  │
│  │  • VRP Analysis Tools                                 │  │
│  │    - analyze_solution()                               │  │
│  │    - suggest_improvements()                           │  │
│  └─────────┬────────────────────────────────────────────┘  │
└───────────┼─────────────────────────────────────────────────┘
            │
            ├─────────────────────────────────────────┐
            ▼                                         ▼
  ┌──────────────────┐                     ┌──────────────────┐
  │  Solvice VRP API │                     │  OpenAI API      │
  │  • Solve VRP     │                     │  • GPT-4         │
  │  • Reorder jobs  │                     │  • ChatKit       │
  └──────────────────┘                     └──────────────────┘
```

## Key Features Explained

### Hidden Context Injection

The Python backend automatically injects VRP problem and solution data into ChatKit conversations as `HiddenContextItem`. This means:

- ✅ AI sees your VRP data (jobs, routes, metrics)
- ✅ User only sees the conversation
- ✅ AI can reference specific job IDs, vehicle names, and actual numbers
- ✅ No need to manually provide context in chat

**Example:**
```
User: "What can be improved in this solution?"

AI: "Looking at your solution:
• Vehicle-1 has 12 stops covering 45.2km - well utilized
• Job job_7 on Vehicle-2 violates time window by 15 minutes
• Consider adding a third vehicle to reduce constraint violations
• Overall efficiency is 78% - target is 85%+"
```

The AI knows your actual data without you pasting it!

## License

This project is provided as an example implementation for the Solvice VRP API. Please refer to your Solvice API agreement for usage terms.

## Related Resources

- [Solvice VRP API Documentation](https://docs.solvice.io/)
- [Solvice VRP Solver SDK](https://www.npmjs.com/package/solvice-vrp-solver)
- [Next.js Documentation](https://nextjs.org/docs)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)