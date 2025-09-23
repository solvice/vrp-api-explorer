# CSV to VRP Conversion Testing Documentation

This directory contains comprehensive tests for the CSV upload to VRP conversion feature, with a focus on validating OpenAI's code interpreter capabilities for intelligent data transformation.

## Test Structure

### Core Test Files

1. **`VrpAssistant/CsvToVrpConversion.test.tsx`** (Existing)
   - Basic CSV conversion functionality
   - Mock API responses and validation
   - Simple scenarios and error handling

2. **`VrpAssistant/CsvToVrpConversionEnhanced.test.tsx`** (New)
   - Advanced OpenAI code interpreter validation
   - Intelligent column mapping tests
   - Complex data transformation scenarios
   - VRP schema validation

3. **`e2e/csv-upload-integration.test.tsx`** (New)
   - End-to-end file upload workflow
   - UI interaction testing
   - Real-world user scenarios
   - Error recovery flows

4. **`VrpAssistant/OpenAIPromptValidation.test.tsx`** (New)
   - System prompt content validation
   - OpenAI API configuration testing
   - Prompt effectiveness verification
   - Schema integration validation

5. **`VrpAssistant/CsvConversionPerformanceAndEdgeCases.test.tsx`** (New)
   - Performance testing with large files
   - Edge case handling
   - Unicode and international data
   - Memory usage optimization

### Test Fixtures

**`fixtures/csv-samples/`** - Sample CSV files for testing:
- `simple-jobs.csv` - Basic job list with coordinates
- `complex-mixed.csv` - Jobs and resources combined
- `addresses-only.csv` - No coordinates, only addresses
- `time-windows.csv` - Various time format representations
- `large-dataset.csv` - Performance testing (1000+ rows)
- `malformed.csv` - Invalid/incomplete data
- `edge-cases.csv` - Special characters, empty cells, etc.

## Testing Strategy

### OpenAI Code Interpreter Validation

The core focus is on validating OpenAI's ability to intelligently convert CSV data to VRP format:

#### Column Mapping Intelligence
- **Coordinate Recognition**: Tests various column names (lat/latitude/coord_x) and formats
- **Time Format Conversion**: Validates conversion of different time formats to ISO 8601
- **Duration Parsing**: Tests conversion from minutes/hours to seconds
- **Field Inference**: Validates intelligent mapping of CSV columns to VRP fields

#### Default Generation
- **Smart Defaults**: Tests generation of reasonable defaults for missing data
- **Vehicle Creation**: Validates automatic vehicle generation based on job count
- **Time Window Logic**: Tests default business hours when not specified
- **Capacity Estimation**: Validates intelligent capacity assignment

#### Data Quality Assurance
- **Unique Name Generation**: Tests handling of duplicate names
- **Coordinate Validation**: Validates lat/lng bounds checking
- **Schema Compliance**: Ensures generated VRP data passes validation
- **Error Recovery**: Tests graceful handling of malformed data

### Performance Requirements

Based on the specification's success criteria:

- **Response Time**: Conversion must complete within 10 seconds for typical files
- **File Size**: Support up to 5MB CSV files
- **Memory Usage**: Efficient processing without excessive memory consumption
- **Reliability**: 95% success rate for well-formed CSV files

### Test Categories

#### 1. Unit Tests
- Individual component functionality
- CSV parsing and validation
- OpenAI service methods
- VRP data validation

#### 2. Integration Tests
- End-to-end file upload flow
- Error handling scenarios
- Chat interface integration
- API interaction testing

#### 3. Performance Tests
- Large file processing (1000+ rows)
- Memory usage monitoring
- Concurrent request handling
- Response time validation

#### 4. Edge Cases
- Empty CSV files
- Malformed data
- Unicode characters
- Extreme coordinate values
- Mixed data types

## Running the Tests

### All Tests
```bash
pnpm test
```

### Specific Test Suites
```bash
# Basic CSV conversion tests
pnpm test CsvToVrpConversion.test.tsx

# Enhanced OpenAI validation tests
pnpm test CsvToVrpConversionEnhanced.test.tsx

# Integration tests
pnpm test csv-upload-integration.test.tsx

# Prompt validation tests
pnpm test OpenAIPromptValidation.test.tsx

# Performance and edge cases
pnpm test CsvConversionPerformanceAndEdgeCases.test.tsx
```

### Watch Mode
```bash
pnpm test:watch
```

## Mock Configuration

All tests use mocked `fetch` calls to simulate OpenAI API responses:

```typescript
// Mock successful CSV conversion
;(fetch as jest.Mock).mockResolvedValue({
  ok: true,
  json: async () => ({
    content: JSON.stringify({
      vrpData: { /* VRP structure */ },
      explanation: 'Conversion explanation',
      conversionNotes: ['Note 1', 'Note 2'],
      rowsProcessed: 10
    }),
    usage: { prompt_tokens: 200, completion_tokens: 400 }
  })
})
```

## Validation Criteria

### OpenAI Response Validation
1. **Structure**: Response includes vrpData, explanation, conversionNotes, rowsProcessed
2. **VRP Schema**: Generated data passes `VrpSchemaService.validateModification()`
3. **Data Integrity**: All required fields present and properly typed
4. **Logical Consistency**: Generated defaults make business sense

### System Prompt Validation
1. **Schema Inclusion**: Complete VRP schema is included
2. **Field Mapping**: Clear instructions for column mapping
3. **Default Generation**: Strategies for missing data
4. **Format Requirements**: Explicit JSON response format specification

### Performance Validation
1. **Response Time**: < 10 seconds for typical files
2. **Memory Usage**: Reasonable memory consumption
3. **Error Rate**: < 5% failure rate for well-formed files
4. **Concurrent Handling**: Multiple requests without interference

## Test Data Quality

The test fixtures represent real-world scenarios:

- **Realistic Data**: Actual addresses, coordinates, and business scenarios
- **Data Variety**: Different CSV structures and formats
- **Edge Cases**: Boundary conditions and error scenarios
- **International Data**: Unicode, multiple languages, global coordinates

## Debugging Failed Tests

### Common Issues
1. **Mock Configuration**: Ensure fetch mocks match expected API calls
2. **Schema Validation**: Check that generated VRP data is valid
3. **Async Handling**: Proper use of async/await in test cases
4. **File Paths**: Correct paths to test fixtures

### Debug Tools
```bash
# Run with verbose output
pnpm test --verbose

# Debug specific test
pnpm test --testNamePattern="specific test name"

# Coverage report
pnpm test --coverage
```

## Continuous Integration

These tests are designed to run in CI/CD environments:

- **No External Dependencies**: All OpenAI calls are mocked
- **Deterministic Results**: Tests produce consistent results
- **Fast Execution**: Optimized for CI performance
- **Clear Reporting**: Detailed error messages and coverage reports

## Future Enhancements

Potential test improvements:
1. **Real API Testing**: Optional integration with actual OpenAI API
2. **Visual Regression**: Screenshots of upload UI components
3. **Performance Benchmarking**: Automated performance regression detection
4. **Accessibility Testing**: Screen reader and keyboard navigation tests

This comprehensive testing approach ensures the CSV to VRP conversion feature works reliably with OpenAI's code interpreter providing intelligent data transformation.