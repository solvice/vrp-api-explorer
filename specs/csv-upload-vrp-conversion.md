# CSV Upload to VRP Conversion Specification

## Overview

This specification defines the functionality to allow users to upload CSV files through the VRP Assistant chat interface and have OpenAI automatically convert the CSV data into a properly structured VRP (Vehicle Routing Problem) JSON format.

## User Story

**As a** VRP user
**I want to** upload a CSV file containing location/delivery data
**So that** I can quickly convert my existing data into VRP format without manually structuring the JSON

## Requirements

### Functional Requirements

1. **File Upload Interface**
   - Users can drag and drop CSV files into the chat interface
   - Users can click to browse and select CSV files
   - Only CSV files are accepted (`.csv` extension or `text/csv` MIME type)
   - File size limit of 5MB
   - Visual feedback during drag operations

2. **CSV Processing**
   - Parse CSV content on the client side
   - Send CSV data to OpenAI for intelligent conversion
   - Handle various CSV structures without requiring predefined columns
   - Support common separators (comma, semicolon, tab)

3. **OpenAI Integration**
   - Extend existing OpenAI service to handle CSV-to-VRP conversion
   - Provide VRP schema context to OpenAI for accurate conversion
   - Handle intelligent field mapping (address → location, duration, etc.)
   - Return structured VRP JSON that passes validation

4. **User Experience**
   - Show upload progress and processing status
   - Display conversion results in chat interface
   - Allow user to review and modify converted data
   - Provide clear error messages for invalid files or conversion failures

### Technical Requirements

1. **File Upload Component**
   - React component with drag-and-drop support
   - Accessibility compliant (ARIA labels, keyboard navigation)
   - Integration with existing chat interface
   - File validation and error handling

2. **OpenAI Service Extension**
   - New method: `convertCsvToVrp(csvContent: string): Promise<VrpModificationResponse>`
   - Enhanced system prompt with VRP schema and CSV conversion instructions
   - Robust error handling for malformed CSV or conversion failures
   - Support for various CSV formats and structures

3. **Data Validation**
   - Validate converted VRP data against existing schema
   - Ensure required fields (jobs, resources) are properly generated
   - Handle missing or incomplete data gracefully
   - Provide fallback defaults for missing required fields

## Technical Design

### Component Architecture

```
ShadcnChatInterface
├── FileUpload (new component)
│   ├── Drag & drop area
│   ├── File browser trigger
│   └── Upload progress indicator
└── Enhanced message handling for file uploads
```

### OpenAI Service Extension

```typescript
interface CsvToVrpRequest {
  csvContent: string
  filename: string
  userContext?: string
}

interface CsvToVrpResponse extends VrpModificationResponse {
  sourceInfo: {
    filename: string
    rowCount: number
    columnsDetected: string[]
    conversionNotes: string[]
  }
}
```

### System Prompt Enhancement

The OpenAI system prompt will include:
- Complete VRP schema with all required and optional fields
- Examples of common CSV formats and their VRP equivalents
- Instructions for intelligent field mapping
- Fallback strategies for missing data
- Validation rules for generated VRP data

## CSV Conversion Logic

### Automatic Field Detection

OpenAI will intelligently map CSV columns to VRP fields:

| CSV Column Examples | VRP Field | Notes |
|---------------------|-----------|-------|
| `address`, `location`, `place` | `location` (geocoded) | May require geocoding |
| `lat`, `latitude` | `location.latitude` | Direct mapping |
| `lng`, `lon`, `longitude` | `location.longitude` | Direct mapping |
| `name`, `id`, `stop_name` | `job.name` | Ensure uniqueness |
| `duration`, `service_time` | `job.duration` | Convert to seconds |
| `time_window_start`, `earliest` | `job.timeWindows[0].from` | Parse time format |
| `time_window_end`, `latest` | `job.timeWindows[0].to` | Parse time format |
| `demand`, `quantity`, `weight` | `job.demand` | Map to capacity dimensions |

### Default Generation

For missing required data, OpenAI will generate reasonable defaults:
- **Depot/Resources**: Create default vehicle(s) based on job count
- **Time Windows**: Generate reasonable business hours if not specified
- **Durations**: Estimate based on job type or use default values
- **Locations**: If addresses provided, include geocoding instructions

## User Interface Flow

### Upload Process

1. **Initial State**: Chat interface shows file upload area when no messages exist
2. **File Selection**: User drags/drops or selects CSV file
3. **File Validation**: Check file type, size, and basic CSV structure
4. **Upload Confirmation**: Show file details and "Convert to VRP" button
5. **Processing**: Display loading indicator with "Converting CSV to VRP..."
6. **Results**: Show converted VRP data in chat with explanation
7. **Integration**: User can review, modify, or apply to main editor

### Error Handling

- **Invalid File**: Clear error message with supported formats
- **Processing Errors**: Retry options with detailed error information
- **Conversion Failures**: Fallback to manual editing with partial results
- **Validation Errors**: Highlight specific issues with suggested fixes

## Implementation Plan

### Phase 1: Core Upload Component
- Create FileUpload component with drag-and-drop
- Integrate with ShadcnChatInterface
- Basic CSV validation and parsing

### Phase 2: OpenAI Integration
- Extend OpenAI service for CSV conversion
- Implement enhanced system prompt with VRP schema
- Add CSV-to-VRP conversion method

### Phase 3: Enhanced UX
- Add upload progress indicators
- Implement comprehensive error handling
- Add conversion result preview and editing

### Phase 4: Advanced Features
- Support for multiple file formats (Excel, TSV)
- Batch processing for multiple files
- Template-based conversion for common CSV formats

## Testing Strategy

### Unit Tests
- FileUpload component functionality
- CSV parsing and validation
- OpenAI service CSV conversion methods
- VRP data validation

### Integration Tests
- End-to-end file upload and conversion flow
- Error handling scenarios
- Chat interface integration

### Edge Cases
- Empty CSV files
- Malformed CSV data
- Very large files
- Missing required columns
- Invalid location data

## Success Criteria

1. **Functionality**: Users can successfully upload CSV files and get valid VRP JSON
2. **Reliability**: 95% success rate for well-formed CSV files
3. **Performance**: Conversion completes within 10 seconds for typical files
4. **Usability**: Clear error messages and intuitive upload flow
5. **Integration**: Seamless experience within existing VRP Assistant

## Future Enhancements

- **Smart Templates**: Remember successful conversion patterns for similar CSV structures
- **Geocoding Integration**: Automatic address-to-coordinates conversion
- **Advanced Mapping**: Machine learning for improved field detection
- **Bulk Operations**: Support for multiple CSV files or sheets
- **Export Functionality**: Allow users to export VRP data back to CSV format