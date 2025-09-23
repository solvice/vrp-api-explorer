# CSV Conversion Test Fixtures

This directory contains test data for validating CSV to VRP JSON conversion functionality.

## Structure

Each test case consists of:
- `*.csv` - Input CSV file
- `*.expected.json` - Expected VRP JSON output structure

## Test Cases

### `basic-deliveries.*`
- Standard delivery locations with duration, priority, capacity
- Tests basic conversion: minutes→seconds, coordinate mapping
- Validates resource generation

### `time-windows.*`
- CSV with time window constraints (open/close times)
- Tests time parsing and VRP time window mapping
- Different column naming (lat/lng vs latitude/longitude)

### `edge-cases.*`
- Special characters, commas in names, empty fields
- Duration already in seconds (no conversion needed)
- Long names and international characters

## Usage in Tests

```typescript
import { readFileSync } from 'fs'
import { join } from 'path'

const csvContent = readFileSync(join(__dirname, 'fixtures/csv-conversion/basic-deliveries.csv'), 'utf-8')
const expected = JSON.parse(readFileSync(join(__dirname, 'fixtures/csv-conversion/basic-deliveries.expected.json'), 'utf-8'))
```

## Validation Strategy

1. **Semantic validation** - Test data accuracy, not exact AI response formatting
2. **Tolerance-based assertions** - ±0.001° for coordinates, ±1sec for duration
3. **Schema compliance** - All outputs must pass VRP schema validation
4. **Field mapping verification** - Ensure CSV columns map correctly to VRP properties