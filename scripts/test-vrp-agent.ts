import { Runner, AgentInputItem } from '@openai/agents';
import { vrpAgent, VrpAgentContext } from '../lib/vrp-agent';
import { getSampleVrpData } from '../lib/sample-data';

async function testVrpAgent() {
  console.log('🧪 Testing VRP Agent with context...\n');

  // Get sample VRP data
  const vrpData = getSampleVrpData('simple');

  // Create context
  const context: VrpAgentContext = {
    problem: vrpData,
    solution: null,
    metadata: {
      timestamp: new Date().toISOString(),
      hasValidSolution: false
    }
  };

  // Test message
  const userMessage = 'What VRP problem do I currently have?';

  console.log(`📝 User message: "${userMessage}"\n`);
  console.log(`📦 VRP Context:
- Vehicles: ${vrpData.fleet?.vehicles?.length || 0}
- Jobs: ${vrpData.plan?.jobs?.length || 0}
\n`);

  // Build conversation history
  const conversationHistory: AgentInputItem[] = [
    {
      role: 'user',
      content: [
        {
          type: 'input_text',
          text: userMessage
        }
      ]
    }
  ];

  // Create runner
  const runner = new Runner({
    traceMetadata: {
      __trace_source__: 'test-script',
      test: 'vrp-agent-context'
    }
  });

  try {
    console.log('🚀 Running VRP agent...\n');

    // Pass context as the third parameter
    const result = await runner.run(
      vrpAgent,
      conversationHistory,
      { context }  // Wrap context in an object
    );

    if (result.finalOutput) {
      console.log('✅ Agent Response:');
      console.log('─'.repeat(60));
      console.log(result.finalOutput);
      console.log('─'.repeat(60));
      console.log('\n✨ Test successful! Agent has VRP context.');
    } else {
      console.error('❌ No output from agent');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
}

testVrpAgent();
