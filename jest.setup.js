import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Set up environment variables for tests
process.env.SOLVICE_API_KEY = 'test-demo-key-123'

// Only set fake OpenAI API key if no real one is provided
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'test-openai-key-123') {
  // For real OpenAI integration tests, set a real API key via environment:
  // export OPENAI_API_KEY=sk-your-actual-key-here
  // Or uncomment and set below for testing:
  // process.env.OPENAI_API_KEY = 'sk-your-actual-openai-key-here'

  // Fallback test key for mocked tests
  process.env.OPENAI_API_KEY = 'test-openai-key-123'
}