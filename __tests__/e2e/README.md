# End-to-End Tests for OpenAI Chat Functionality

This directory contains comprehensive end-to-end tests that verify the OpenAI chat integration actually works with real API calls.

## Test Files

### `openai-api-e2e.test.ts`
Tests the core OpenAI service functionality with real API calls:
- ✅ Adding new jobs to VRP data
- ✅ Adding time windows to existing jobs  
- ✅ Adding new vehicles/resources
- ✅ Handling impossible requests gracefully
- ✅ Working with complex VRP data
- ✅ Generating helpful suggestions
- ✅ Error handling with invalid API keys
- ✅ Data integrity across multiple modifications
- ✅ Performance and concurrent request handling

### `openai-chat-e2e.test.tsx` 
Tests the full user interface chat workflow (requires Jest configuration fixes):
- Full chat flow: input → send → OpenAI response → VRP update
- Chat history persistence
- Processing indicators
- Error handling in UI
- User interaction patterns

## Running the Tests

### Prerequisites
1. **OpenAI API Key**: You need a valid OpenAI API key
2. **Environment Setup**: Set required environment variables

### Setup Instructions

1. **Set your OpenAI API Key** (if not already set):
   ```bash
   export OPENAI_API_KEY="sk-your-actual-openai-api-key-here"
   # OR
   export NEXT_PUBLIC_OPENAI_API_KEY="sk-your-actual-openai-api-key-here"
   ```

2. **Enable E2E Tests**:
   ```bash
   export E2E_TEST_ENABLED=true
   ```

3. **Run the API tests**:
   ```bash
   # Run just the API integration tests
   E2E_TEST_ENABLED=true pnpm test openai-api-e2e --verbose
   
   # Or with environment variables in one command
   E2E_TEST_ENABLED=true pnpm test openai-api-e2e
   ```

4. **Run the full UI tests** (once Jest configuration is fixed):
   ```bash
   E2E_TEST_ENABLED=true pnpm test openai-chat-e2e --verbose
   ```

### Understanding Test Results

#### ✅ **Tests Pass**: 
Chat functionality is working correctly with OpenAI

#### ❌ **Tests Fail**: 
Check the error messages:
- **Invalid API key**: Verify `NEXT_PUBLIC_OPENAI_API_KEY` is correct
- **Network errors**: Check internet connection and OpenAI API status
- **Validation errors**: The OpenAI service may be returning invalid VRP data
- **Timeout errors**: API calls are taking too long (increase `TEST_TIMEOUT`)

#### ⏭️ **Tests Skipped**:
Missing required environment variables

## Test Coverage

### What These Tests Verify

1. **Real OpenAI Integration**: Uses actual OpenAI API calls, not mocks
2. **VRP Data Modification**: Verifies AI can intelligently modify vehicle routing problems
3. **Data Validation**: Ensures all AI modifications result in valid VRP data
4. **Error Handling**: Tests graceful handling of API failures and impossible requests
5. **Performance**: Verifies response times are reasonable for user experience
6. **Data Integrity**: Ensures multiple modifications don't corrupt the data structure

### What These Tests DON'T Cover

1. **UI Component Rendering**: Requires Jest configuration fixes for ES modules
2. **Browser Interactions**: These are unit/integration tests, not full browser automation
3. **Authentication Flows**: Uses direct API key, not user authentication
4. **Rate Limiting**: Limited testing of OpenAI rate limits

## Troubleshooting

### Common Issues

1. **"Skipped: No OpenAI API key provided"**
   - Set `OPENAI_API_KEY` or `NEXT_PUBLIC_OPENAI_API_KEY` environment variable
   - Ensure the key starts with `sk-` and is valid

2. **"Skipped: E2E tests disabled"**
   - Set `E2E_TEST_ENABLED=true`

3. **Jest module transformation errors**
   - These affect the UI tests (`openai-chat-e2e.test.tsx`)
   - The API tests (`openai-api-e2e.test.ts`) should work fine
   - Fix requires updating Jest configuration for ES modules

4. **"OpenAI API error: 401 Unauthorized"**
   - Your API key is invalid or expired
   - Check your OpenAI account and billing status

5. **Timeout errors**
   - OpenAI API is slow or overloaded
   - Increase `TEST_TIMEOUT` in the test files
   - Check your internet connection

6. **Validation errors in test output**
   - The AI returned invalid VRP data structure
   - This indicates a problem with the OpenAI service logic
   - Check the console logs for details about what was invalid

### Getting API Keys

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up/log in to your account
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

**Important**: Keep your API key secure and never commit it to version control!

## Cost Considerations

These tests make real API calls to OpenAI, which costs money:
- Each test makes 1-3 API calls
- Current test suite: ~10-15 API calls total
- Estimated cost: $0.01 - $0.05 per full test run
- Monitor your OpenAI usage dashboard

## Next Steps

If these tests reveal issues:

1. **API Integration Problems**: Check the OpenAI service implementation
2. **Data Validation Issues**: Review the VRP schema validation logic  
3. **Performance Issues**: Consider caching or request optimization
4. **UI Issues**: Fix Jest configuration and run the full UI test suite
