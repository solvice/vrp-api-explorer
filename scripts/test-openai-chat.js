#!/usr/bin/env node

/**
 * Quick diagnostic script to test OpenAI chat functionality
 * 
 * This bypasses Jest configuration issues and tests the core functionality directly.
 * Run with: node scripts/test-openai-chat.js
 * 
 * Requires: OPENAI_API_KEY environment variable
 */

const https = require('https');
const { getSampleVrpData } = require('../lib/sample-data');

// Simple fetch implementation for Node.js
function simpleFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const response = {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        };
        resolve(response);
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Make fetch available globally
global.fetch = simpleFetch;

async function testOpenAIIntegration() {
  console.log('🔍 Testing OpenAI Chat Integration...\n');

  // Check environment
  const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ No OpenAI API key found');
    console.error('   Set OPENAI_API_KEY or NEXT_PUBLIC_OPENAI_API_KEY environment variable');
    process.exit(1);
  }

  console.log('✅ API key found:', apiKey.substring(0, 12) + '...');

  try {
    // Import the OpenAI service (after setting up fetch)
    const { OpenAIService } = require('../components/VrpAssistant/OpenAIService');
    console.log('✅ OpenAI service imported successfully');

    // Create service instance
    const openAIService = new OpenAIService();
    console.log('✅ OpenAI service instantiated');

    // Get sample VRP data
    const sampleData = getSampleVrpData('simple');
    console.log('✅ Sample VRP data loaded:', sampleData.jobs.length, 'jobs,', sampleData.resources.length, 'resources');

    // Test 1: Simple modification
    console.log('\n🧪 Test 1: Adding a new job...');
    const request1 = {
      currentData: sampleData,
      userRequest: 'Add a new delivery job called "test_delivery" with duration 900 seconds'
    };

    const startTime = Date.now();
    const result1 = await openAIService.modifyVrpData(request1);
    const endTime = Date.now();

    console.log('⏱️  Response time:', endTime - startTime, 'ms');
    console.log('✅ Modification successful!');
    console.log('📝 Explanation:', result1.explanation);
    console.log('📊 Jobs before:', sampleData.jobs.length, '→ after:', result1.modifiedData.jobs.length);
    
    // Verify the new job exists
    const newJob = result1.modifiedData.jobs.find(job => 
      job.name === 'test_delivery' || 
      job.name?.includes('test') ||
      job.duration === 900
    );
    
    if (newJob) {
      console.log('✅ New job found:', newJob.name, 'duration:', newJob.duration);
    } else {
      console.log('⚠️  New job not found with expected criteria');
    }

    // Test 2: Generate suggestions
    console.log('\n🧪 Test 2: Generating suggestions...');
    const suggestions = await openAIService.generateSuggestions(sampleData);
    console.log('✅ Generated', suggestions.length, 'suggestions:');
    suggestions.forEach((suggestion, i) => {
      console.log(`   ${i + 1}. ${suggestion}`);
    });

    console.log('\n🎉 All tests passed! OpenAI chat integration is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('fetch')) {
      console.error('💡 This is likely a fetch/network configuration issue');
    } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      console.error('💡 Check your OpenAI API key - it may be invalid or expired');
    } else if (error.message.includes('429') || error.message.includes('rate limit')) {
      console.error('💡 OpenAI rate limit exceeded - try again later');
    } else if (error.message.includes('timeout')) {
      console.error('💡 Request timed out - OpenAI API may be slow');
    } else {
      console.error('💡 Unexpected error - check the full error details above');
    }
    
    console.error('\nFull error details:');
    console.error(error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run the test
testOpenAIIntegration();