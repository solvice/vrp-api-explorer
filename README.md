# VRP API Explorer

An interactive web application for exploring and visualizing Vehicle Routing Problem (VRP) solutions using the [Solvice VRP API](https://www.solvice.io/). This tool provides a user-friendly interface for creating VRP requests, submitting them to the Solvice API, and visualizing the optimized routes on an interactive map.

## Features

- **🗺️ Interactive Map Visualization**: View VRP problems and solutions on a map with the clean Solvice styling
- **📝 JSON Editor**: Create and edit VRP requests with real-time validation
- **🚛 Route Visualization**: See optimized vehicle routes with color-coded paths and sequence numbers
- **🔧 API Integration**: Direct integration with Solvice VRP API with proper error handling
- **⚡ Real-time Validation**: Client-side validation using actual Solvice SDK types
- **🎨 Professional UI**: Clean, responsive interface built with modern React components
- **🤖 AI Assistant**: Modify VRP data using natural language with GPT-4 integration
- **💬 Smart Chat Interface**: Contextual suggestions and conversation-based VRP optimization
- **🔄 Error Recovery**: Robust error handling with retry logic and user-friendly messaging

## Screenshots

The application provides a split-pane interface with:
- **Left Panel**: JSON editor for VRP request data with validation feedback
- **Right Panel**: Interactive map showing job locations, vehicle depots, and optimized routes
- **AI Assistant**: Floating chat interface accessible via the robot icon for natural language VRP modifications

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- A Solvice VRP API key
- An OpenAI API key (for AI assistant functionality)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vrp-api-explorer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the project root:
   ```bash
   SOLVICE_API_KEY=your_solvice_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   > **Note**: These are server-side only environment variables for security. API keys are never exposed to the client-side. The OpenAI key enables AI assistant features.

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open the application**
   
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

5. **AI Assistant** (Optional): Use natural language to modify VRP data
   - Click the robot icon to open the AI chat interface
   - Type requests like "Add a new vehicle with capacity 100"
   - AI suggests optimizations and applies changes automatically
   - Review changes in the JSON editor and map

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
├── app/
│   ├── api/vrp/solve/route.ts    # Server-side API proxy
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
├── components/
│   ├── VrpExplorer.tsx          # Main application component
│   ├── VrpJsonEditor.tsx        # JSON editor with validation
│   ├── VrpMap.tsx               # Interactive map component
│   ├── VrpLayout.tsx            # Resizable layout
│   ├── VrpAssistant/            # AI Assistant components
│   │   ├── VrpAssistantProvider.tsx  # Context provider
│   │   ├── VrpAssistantButton.tsx    # Toggle button
│   │   ├── VrpAssistantPane.tsx      # Chat panel
│   │   ├── ShadcnChatInterface.tsx   # Chat UI
│   │   └── OpenAIService.tsx         # AI integration
│   └── ui/                      # Reusable UI components
├── lib/
│   ├── vrp-api.ts               # Solvice API client
│   ├── vrp-schema.ts            # Validation using SDK types
│   ├── error-handling-service.ts # AI error handling & retry logic
│   └── sample-data.ts           # Sample VRP data
└── __tests__/                   # Test suites
```

## Technical Details

### Architecture

- **Frontend**: Next.js 15 with React 19
- **Styling**: Tailwind CSS with custom components
- **Maps**: MapLibre GL with Solvice styling
- **Validation**: Runtime type checking using Solvice SDK types
- **API**: Server-side proxy to avoid CORS issues
- **AI Integration**: OpenAI GPT-4 for natural language VRP modifications

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

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm test` - Run tests
- `pnpm test:hydration` - Check for hydration issues

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
- Verify OpenAI API key is configured correctly
- Check browser console for API rate limits or quota errors
- Ensure your OpenAI account has sufficient credits
- Try simpler requests if complex modifications fail

### Getting Help

- Check the browser console for detailed error messages
- Verify API key permissions with Solvice support
- Review the [Solvice API documentation](https://docs.solvice.io/)

## License

This project is provided as an example implementation for the Solvice VRP API. Please refer to your Solvice API agreement for usage terms.

## Related Resources

- [Solvice VRP API Documentation](https://docs.solvice.io/)
- [Solvice VRP Solver SDK](https://www.npmjs.com/package/solvice-vrp-solver)
- [Next.js Documentation](https://nextjs.org/docs)
- [MapLibre GL JS](https://maplibre.org/maplibre-gl-js-docs/)