# CSV to VRP JSON Import Feature Specification

## Overview

Add the ability to import CSV files and automatically convert them to valid VRP JSON format using OpenAI's code interpreter. The feature will integrate with the existing VRP Assistant chat interface, providing an intelligent, flexible conversion system that can handle arbitrary CSV structures.

## Core Requirements

### Functional Requirements
- **Single CSV Import**: Import one CSV file at a time with up to 500 rows
- **Intelligent Conversion**: Use OpenAI to automatically map CSV columns to VRP fields
- **Schema Compliance**: Generate valid VRP JSON that matches the existing Solvice VRP schema
- **Automatic Loading**: Converted VRP JSON replaces existing data in the JSON editor
- **Error Handling**: Graceful failure handling with user-friendly error messages

### Technical Constraints
- **File Size Limit**: 500 rows maximum per CSV file
- **Coordinate Requirement**: CSV must contain latitude and longitude columns
- **No Geocoding**: Addresses will not be converted to coordinates (future enhancement)
- **Replace Behavior**: New imports replace existing VRP data entirely

## Integration Architecture

### VRP Assistant Integration
The CSV import will be fully integrated into the existing VRP Assistant (`components/VrpAssistant/`):

- **File Upload UI**: Paperclip icon next to the chat input field
- **OpenAI Processing**: Leverage existing OpenAI service for conversion
- **Chat Interface**: Show brief conversion status messages
- **Error Handling**: Use existing error handling service

### Component Modifications

#### 1. Chat Interface (`ShadcnChatInterface.tsx`)
```typescript
// Add paperclip button to input area (similar to shadcn/ui chatbot pattern)
<PromptInputButton onClick={handleFileUpload} disabled={isTyping}>
  <PaperclipIcon size={16} />
</PromptInputButton>
```

#### 2. OpenAI Service (`OpenAIService.tsx`)
```typescript
// New function for CSV conversion
export async function convertCsvToVrp(csvContent: string, filename: string): Promise<VrpRequest>
```

#### 3. File Upload Handler
```typescript
// Handle file selection and validation
const handleFileUpload = () => {
  // Trigger file input
  // Validate file size/rows
  // Read CSV content
  // Call OpenAI conversion
  // Update JSON editor
};
```

## OpenAI Integration

### Function Calling Approach
Use OpenAI's function calling feature to ensure structured JSON output:

```typescript
const functions = [{
  name: "convert_csv_to_vrp",
  description: "Convert CSV data to VRP JSON format",
  parameters: {
    type: "object",
    properties: {
      vrp_request: {
        type: "object",
        description: "Complete VRP request object following Solvice schema"
      }
    },
    required: ["vrp_request"]
  }
}];
```

### System Prompt Strategy
```typescript
const systemPrompt = `
You are a VRP (Vehicle Routing Problem) data converter. Convert the provided CSV data to valid VRP JSON format.

VRP Schema Context:
${JSON.stringify(VRP_SCHEMA_EXAMPLE, null, 2)}

Rules:
1. Analyze CSV columns to identify: locations (lat/lon), demands, time windows, vehicle info
2. Make intelligent assumptions for missing data (e.g., single vehicle, default capacity)
3. Ensure all locations have valid latitude/longitude coordinates
4. Generate clean VRP JSON with no metadata or comments
5. If critical data is missing, use reasonable defaults

CSV Data:
{csv_content}
`;
```

## User Experience Flow

### Happy Path
1. User clicks paperclip icon in VRP Assistant
2. File picker opens (CSV files only)
3. User selects CSV file (≤500 rows)
4. System validates file and reads content
5. OpenAI processes CSV with VRP schema context
6. Brief success message appears: "✅ Converted filename.csv to VRP format"
7. VRP JSON automatically loads in editor
8. Map updates with new route visualization

### Error Scenarios
- **File Too Large**: "CSV file exceeds 500 rows limit"
- **Invalid File Type**: "Please select a CSV file"
- **OpenAI Failure**: "Conversion failed. Please try again."
- **Invalid VRP Output**: "Could not generate valid VRP data from this CSV"
- **Missing Coordinates**: "CSV must contain latitude and longitude columns"

## Implementation Details

### File Validation
```typescript
const validateCsvFile = (file: File): Promise<string> => {
  // Check file extension (.csv)
  // Read and parse CSV
  // Count rows (max 500)
  // Validate basic structure
  // Return CSV content string
};
```

### CSV Processing
```typescript
const processCsvUpload = async (file: File) => {
  try {
    const csvContent = await validateCsvFile(file);
    const vrpData = await convertCsvToVrp(csvContent, file.name);
    updateVrpEditor(vrpData);
    showSuccessMessage(`✅ Converted ${file.name} to VRP format`);
  } catch (error) {
    showErrorMessage(error.message);
  }
};
```

### OpenAI Conversion Service
```typescript
export async function convertCsvToVrp(csvContent: string, filename: string): Promise<VrpRequest> {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: `Convert this CSV to VRP JSON:\n\n${csvContent}` }
    ],
    functions: VRP_CONVERSION_FUNCTIONS,
    function_call: { name: "convert_csv_to_vrp" }
  });

  const functionCall = response.choices[0].message.function_call;
  const vrpData = JSON.parse(functionCall.arguments);

  // Validate against VRP schema
  validateVrpRequest(vrpData.vrp_request);

  return vrpData.vrp_request;
}
```

## UI Components

### File Upload Button
- **Location**: Next to chat input field in VRP Assistant
- **Style**: Paperclip icon, disabled during AI processing
- **Interaction**: Opens native file picker filtered to .csv files

### Status Messages
- **Success**: Brief green toast with filename
- **Error**: Red toast with specific error message
- **Processing**: Typing indicator while OpenAI processes

### File Input Element
```jsx
<input
  type="file"
  accept=".csv"
  style={{ display: 'none' }}
  ref={fileInputRef}
  onChange={handleFileChange}
/>
```

## Data Flow

```
CSV File Upload
    ↓
File Validation (500 rows max)
    ↓
CSV Content Extraction
    ↓
OpenAI Function Call with VRP Schema
    ↓
Structured VRP JSON Response
    ↓
VRP Schema Validation
    ↓
JSON Editor Update
    ↓
Map Visualization Refresh
```

## Future Enhancements

### Phase 2 Possibilities
- **Address Geocoding**: Convert address strings to coordinates
- **Multiple File Support**: Import separate CSVs for vehicles, customers, depots
- **CSV Template Generator**: Export sample CSV formats
- **Conversion Preview**: Show mapping preview before applying
- **Batch Processing**: Handle multiple files simultaneously
- **Custom Field Mapping**: Manual column-to-VRP field mapping UI

### Phase 3 Possibilities
- **Excel Support**: Import .xlsx files
- **JSON Export**: Save conversion mappings
- **CSV Validation**: Pre-upload data quality checks
- **Integration APIs**: Connect to external data sources

## Testing Requirements

### Unit Tests
- CSV file validation logic
- OpenAI service conversion function
- VRP schema validation
- Error handling scenarios

### Integration Tests
- End-to-end file upload flow
- OpenAI API integration
- JSON editor update mechanism
- Map visualization updates

### Manual Testing Scenarios
- Various CSV structures (different column names/orders)
- Edge cases (empty rows, special characters, missing data)
- Large files (approaching 500 row limit)
- Invalid file types and oversized files

## Dependencies

### New Dependencies
```json
{
  "csv-parser": "^3.0.0",  // For CSV parsing
  "papaparse": "^5.4.1"    // Alternative CSV parser with better browser support
}
```

### Existing Dependencies (Already Available)
- OpenAI API integration
- VRP schema validation
- Error handling service
- Toast notifications (Sonner)
- Shadcn/ui components

## Security Considerations

- **File Size Limits**: Prevent large file uploads that could impact performance
- **Content Validation**: Sanitize CSV content before sending to OpenAI
- **API Key Management**: Use existing secure OpenAI key handling
- **Client-Side Processing**: Parse CSV in browser to avoid server storage

## Performance Considerations

- **File Size Limit**: 500 rows prevents excessive OpenAI token usage
- **Async Processing**: Non-blocking file reading and API calls
- **Error Recovery**: Graceful fallbacks for API failures
- **Memory Management**: Process CSV in chunks if needed

## Success Metrics

- **Conversion Accuracy**: Successfully map common CSV structures to valid VRP JSON
- **User Experience**: Single-click import with minimal user interaction
- **Error Handling**: Clear error messages for all failure scenarios
- **Performance**: Fast conversion for files under the 500-row limit

## Layout Restructuring Requirements

### 3-Column Layout Implementation

**IMPORTANT UPDATE**: Before implementing CSV import, the application layout must be restructured to use a 3-column design:

- **Left Panel**: JSON Editor (existing VrpJsonEditor)
- **Center Panel**: Map Visualization (existing VrpMap)
- **Right Panel**: AI Assistant Chat (always visible)

### Key Changes Required

#### Remove CSV File Upload
- **No CSV button**: Remove all file upload UI components from the specification
- **Focus on layout**: Priority is restructuring the interface, not adding CSV functionality

#### Always-Visible AI Assistant
- **Remove toggle button**: VRP Assistant should always be visible in the right panel
- **No overlay/popup**: Chat interface becomes a permanent part of the layout
- **Integrated workflow**: Users can interact with AI while viewing JSON and map simultaneously

#### Shadcn/UI AI Chatbot Integration
- **Replace existing chat components**: Use shadcn/ui AI chatbot block components
- **Modern chat interface**: Implement proper conversation flow with:
  - Message streaming support
  - Proper loading states
  - Enhanced message display
  - Better input handling
- **Component references**: Use https://www.shadcn.io/blocks/ai-chatbot as the base

### Updated Component Architecture

```
VrpExplorer
├── VrpLayout (modified for 3 columns)
│   ├── leftPanel: VrpJsonEditor (no assistant integration)
│   ├── centerPanel: VrpMap
│   └── rightPanel: VrpAssistantChat (new shadcn-based component)
└── VrpAssistantProvider (moved to top level)
```

### Layout Specifications

#### VrpLayout Component Updates
- Support 3-panel ResizablePanelGroup instead of 2
- Default sizes: 35% JSON | 40% Map | 25% Chat
- Minimum sizes: 25% | 30% | 20%
- Mobile: Stack vertically or use tabs for all three panels

#### VRP Assistant Chat Panel
- **Header**: "VRP AI Assistant" with status indicator
- **Messages**: Full conversation history with proper scrolling
- **Input**: Modern message input with send button
- **Features**:
  - Message streaming
  - Loading indicators
  - Error handling
  - Proper accessibility

### Implementation Priority

1. **Phase 1**: Layout restructuring (3-column design)
2. **Phase 2**: Shadcn/UI chat component integration
3. **Phase 3**: Remove toggle button and assistant overlay logic
4. **Phase 4**: CSV import feature (separate implementation)

This layout change provides a better foundation for both the existing VRP modification features and future CSV import functionality.