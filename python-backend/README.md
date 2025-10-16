# VRP API Backend (Python + FastAPI)

Python backend for VRP API Explorer with integrated OpenAI ChatKit support.

## Features

- **VRP API Proxy**: Handles all VRP operations (solve, load, reorder, explain)
- **ChatKit Integration**: AI-powered VRP analysis with hidden context injection
- **Complexity Validation**: Enforces problem size limits for demo usage
- **Async API**: Fast, non-blocking request handling with FastAPI

## Setup

### Prerequisites

- Python 3.11+
- Solvice API key
- OpenAI API key

### Installation

```bash
# Install uv package manager (recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
cd python-backend
uv sync

# Copy environment template
cp .env.example .env
# Edit .env and add your API keys
```

### Running the Server

```bash
# Development mode with auto-reload
uv run uvicorn app.main:app --reload --port 8000

# Production mode
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### VRP Operations

- `POST /vrp/solve` - Solve VRP problem
- `GET /vrp/jobs/{job_id}/load` - Load persisted job
- `GET /vrp/jobs/{job_id}/explanation` - Get solution explanation
- `POST /vrp/jobs/{job_id}/reorder` - Reorder jobs in solution
- `GET /health` - Health check

### ChatKit

- `POST /chatkit` - ChatKit streaming endpoint with VRP context

## Architecture

```
app/
├── main.py              # FastAPI app + CORS configuration
├── chat.py              # ChatKit server with VRP agent
├── constants.py         # System prompts and configuration
├── memory_store.py      # Thread storage for ChatKit
└── vrp/
    ├── routes.py        # VRP API endpoints
    ├── models.py        # Pydantic models
    ├── validators.py    # Complexity validation
    ├── context_store.py # VRP context for ChatKit
    ├── client.py        # Solvice SDK wrapper
    └── tools.py         # ChatKit VRP tools
```

## Development

```bash
# Run tests
uv run pytest

# Lint code
uv run ruff check .

# Format code
uv run ruff format .

# Type check
uv run mypy app
```

## Environment Variables

See `.env.example` for all configuration options.

## Frontend Integration

The Next.js frontend connects to this backend at `http://localhost:8000`.

Configure in Next.js:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```
