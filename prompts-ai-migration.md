# OpenAI Migration Step-by-Step Prompts

This file contains specific prompts for each step of the OpenAI package migration. Copy and paste these prompts to guide the implementation.

## Phase 1: Preparation & Backup

### Step 1.1: Create Backup
```
Create a backup of the current OpenAI service implementation and verify the backup was created successfully.
```

### Step 1.2: Document Current API
```
Analyze the current OpenAIService class and document all public method signatures, parameter types, and return types. Focus on understanding the existing API contract that must be preserved.
```

### Step 1.3: Verify Dependencies
```
Find all files that import or use OpenAIService and list them. For each file, identify how OpenAIService is used (which methods are called) to understand the impact of changes.
```

## Phase 2: Core Service Refactor

### Step 2.1: Update Imports and Constructor
```
Update the OpenAIService class to:
1. Import the official OpenAI package
2. Replace the private apiKey and baseUrl fields with a private openai instance
3. Update the constructor to create an OpenAI instance instead of storing the API key
4. Keep the same constructor signature and API key validation logic
```

### Step 2.2: Refactor sendMessage Method
```
Replace the sendMessage method implementation to:
1. Use openai.chat.completions.create() instead of raw fetch
2. Keep the same method signature: sendMessage(message: string, systemPrompt?: string): Promise<string>
3. Maintain the same message formatting with system and user roles
4. Use the same model (gpt-4), max_tokens (1000), and temperature (0.7) settings
5. Add proper error handling for OpenAI.APIError
6. Return the same string format as before
```

### Step 2.3: Refactor modifyVrpData Method
```
Update the modifyVrpData method to:
1. Keep the same method signature: modifyVrpData(request: VrpModificationRequest): Promise<VrpModificationResponse>
2. Replace the internal sendMessage calls to use the new OpenAI package-based implementation
3. Preserve all existing VRP data validation and error handling logic
4. Maintain the same response parsing and VrpModificationResponse structure
5. Keep the ErrorHandlingService.withRetry wrapper
```

### Step 2.4: Refactor generateSuggestions Method
```
Update the generateSuggestions method to:
1. Keep the same method signature: generateSuggestions(vrpData: Vrp.VrpSyncSolveParams): Promise<string[]>
2. Replace internal API calls to use the new OpenAI implementation
3. Preserve the fallback suggestion logic if API calls fail
4. Maintain the same response parsing for suggestion arrays
```

### Step 2.5: Update Utility Methods
```
Update the utility methods:
1. Update isConfigured() to check if the OpenAI instance is properly configured
2. Update getMaskedApiKey() to access the API key from the OpenAI instance
3. Ensure these methods maintain their existing behavior and return types
```

## Phase 3: Error Handling Update

### Step 3.1: Map OpenAI Errors
```
Update error handling throughout the OpenAIService to:
1. Catch OpenAI.APIError instances specifically
2. Map OpenAI errors to the existing VrpError types used by ErrorHandlingService
3. Preserve existing error messages and error categorization
4. Ensure rate limiting (429) and authentication (401) errors are handled correctly
5. Maintain backward compatibility with existing error handling in consumer code
```

### Step 3.2: Remove Legacy Code
```
Clean up the OpenAIService by:
1. Removing the makeAPICall method and all fetch-related code
2. Removing custom retry logic (since OpenAI package handles this)
3. Removing shouldRetry, delay, and isNetworkError helper methods
4. Removing the OpenAIMessage and OpenAIResponse interfaces (use OpenAI package types)
5. Keep only the VrpModificationRequest and VrpModificationResponse interfaces
```

## Phase 4: Testing & Validation

### Step 4.1: Run Unit Tests
```
Execute the unit tests and fix any failures:
1. Run: pnpm test OpenAIService
2. For each failing test, analyze whether it's due to:
   - Changed mock expectations (update mocks)
   - Changed error types (update error assertions)
   - Changed response formats (verify compatibility)
3. Update test mocks to work with the OpenAI package if needed
4. Ensure all tests pass without changing the test logic
```

### Step 4.2: Run Integration Tests
```
Execute integration tests and verify functionality:
1. Run: pnpm test VrpOpenAI
2. Run: pnpm test vrp-modification-pipeline
3. For any failures, verify that:
   - VRP data modification still works correctly
   - Error handling preserves existing behavior
   - Response formats match expectations
4. Fix any issues without changing test expectations
```

### Step 4.3: Test Environment Variables
```
Verify environment variable handling works correctly:
1. Test with OPENAI_API_KEY set
2. Test with NEXT_PUBLIC_OPENAI_API_KEY set
3. Test with no API key (should throw error)
4. Test with invalid API key format
5. Ensure behavior matches the original implementation
```

## Phase 5: End-to-End Testing

### Step 5.1: Run E2E Tests
```
Execute the end-to-end tests to verify real API integration:
1. Set: export E2E_TEST_ENABLED=true
2. Run: pnpm test openai-api-e2e
3. Verify that:
   - Real OpenAI API calls succeed
   - VRP data is correctly modified
   - Suggestions are generated
   - Error handling works with real API errors
4. If tests fail, check for network issues vs implementation problems
```

### Step 5.2: Test Browser Compatibility
```
Verify the implementation works in browser environment:
1. Run: pnpm dev
2. Open browser and navigate to chat interface
3. Test the following scenarios:
   - Send a simple chat message
   - Request VRP data modification
   - Trigger an error scenario (invalid request)
   - Check browser console for any errors
4. Verify chat functionality works end-to-end
```

### Step 5.3: Test Error Scenarios
```
Test error handling in both environments:
1. Test with invalid API key - should show proper error message
2. Test with network disconnection - should handle gracefully  
3. Test with malformed requests - should validate properly
4. Test rate limiting - should retry appropriately
5. Verify error messages are user-friendly and actionable
```

## Phase 6: Performance & Cleanup

### Step 6.1: Performance Testing
```
Compare performance before and after migration:
1. Measure response times for typical VRP modification requests
2. Check bundle size impact in browser
3. Monitor memory usage during operation
4. Verify startup time hasn't increased significantly
5. Document any performance differences
```

### Step 6.2: Final Cleanup
```
Clean up the codebase after successful migration:
1. Remove OpenAIService.backup.tsx if all tests pass
2. Remove any commented-out legacy code
3. Update any import statements that might be affected
4. Run: pnpm lint to ensure code style compliance
5. Update documentation if API usage has changed
```

## Validation Prompts

### Comprehensive Test
```
Run a comprehensive test to ensure the migration is successful:
1. Run all tests: pnpm test
2. Start dev server: pnpm dev
3. Test chat functionality in browser
4. Run e2e tests: E2E_TEST_ENABLED=true pnpm test openai-api-e2e
5. Verify no "fetch is not defined" errors occur anywhere
6. Confirm all original functionality works as expected
```

### Rollback Test
```
Verify rollback capability in case of issues:
1. Document current working state
2. Temporarily restore backup: cp OpenAIService.backup.tsx OpenAIService.tsx
3. Verify original functionality still works
4. Restore new implementation
5. Confirm rollback process is viable if needed
```

## Debugging Prompts

### If Tests Fail
```
Debug test failures systematically:
1. Identify which specific test is failing
2. Check if it's a mocking issue, assertion issue, or logic issue
3. Compare the error message with expected behavior
4. Check if OpenAI package requires different mocking patterns
5. Verify environment variables are accessible in test environment
6. Check for import/export issues with the OpenAI package
```

### If Browser Fails
```
Debug browser issues:
1. Check browser console for JavaScript errors
2. Verify OpenAI package works in browser environment
3. Check network tab for failed API requests
4. Verify environment variables are available (NEXT_PUBLIC_*)
5. Test with a minimal example to isolate the issue
6. Check for bundling or import issues
```

### If API Calls Fail
```
Debug API integration issues:
1. Verify API key is correctly passed to OpenAI instance
2. Test with a simple OpenAI call outside of the VRP context
3. Check OpenAI package version compatibility
4. Verify network connectivity to OpenAI API
5. Check for proxy or firewall issues
6. Test with different models or parameters
```

## Success Verification Prompt

```
Verify the migration is completely successful by confirming:
1. ✅ All unit tests pass (pnpm test)
2. ✅ All integration tests pass  
3. ✅ E2E tests work with real API calls
4. ✅ Browser chat interface works correctly
5. ✅ No "fetch is not defined" errors anywhere
6. ✅ Error handling works as expected
7. ✅ Performance is acceptable
8. ✅ No breaking changes for consumers
9. ✅ Bundle size impact is acceptable
10. ✅ Documentation is updated

If all items are checked, the migration is successful and the backup can be removed.
```