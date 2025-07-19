import { VrpSchemaService } from "../../lib/vrp-schema-service";
import { Vrp } from "solvice-vrp-solver/resources/vrp/vrp";
import { ErrorHandlingService } from '@/lib/error-handling-service';

export interface VrpModificationRequest {
  currentData: Vrp.VrpSyncSolveParams;
  userRequest: string;
  context?: string;
}

export interface VrpModificationResponse {
  modifiedData: Vrp.VrpSyncSolveParams;
  explanation: string;
  changes: Array<{
    type: "add" | "modify" | "remove";
    target: "job" | "resource" | "option";
    description: string;
  }>;
}

export class OpenAIService {
  constructor() {
    // No longer need API key on client-side
    // All API calls go through our server-side API route
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<string> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content: message,
    });

    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: "gpt-4",
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data.content;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  async sendStructuredMessage(message: string, systemPrompt?: string): Promise<VrpModificationResponse> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt,
      });
    }

    messages.push({
      role: "user",
      content: message,
    });

    try {
      console.log('🤖 Calling OpenAI API route with JSON mode...');
      console.log('Model: gpt-4o');
      console.log('Messages length:', messages.length);
      
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: "gpt-4o", // Use gpt-4o for JSON mode
          max_tokens: 2000,
          temperature: 0.3,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      console.log('Usage:', data.usage);

      const content = data.content;
      if (!content) {
        throw new Error("Invalid response format from OpenAI API - no content");
      }

      console.log('📝 Response content length:', content.length);
      
      const parsed = JSON.parse(content) as VrpModificationResponse;
      console.log('✅ Successfully parsed structured response');
      
      return parsed;
    } catch (error: unknown) {
      console.error('❌ Error in sendStructuredMessage:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error && typeof error === 'object' && 'constructor' in error ? error.constructor?.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      
      // Re-throw with more context
      throw new Error(`Structured output failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    // Always return true as configuration is now handled server-side
    return true;
  }

  /**
   * Get a masked version of the API key for display purposes
   */
  getMaskedApiKey(): string {
    // API key is now handled server-side, so we can't display it
    return "Configured (Server-side)";
  }

  /**
   * Modify VRP data based on user request using AI
   */
  async modifyVrpData(
    request: VrpModificationRequest,
  ): Promise<VrpModificationResponse> {
    try {
      return await ErrorHandlingService.withRetry(async () => {
        const systemPrompt = this.buildStructuredVrpSystemPrompt();
        const userMessage = this.buildVrpUserMessage(request);

        const result = await this.sendStructuredMessage(userMessage, systemPrompt);
        
        // Validate the modified data structure
        const validation = VrpSchemaService.validateModification(
          request.currentData,
          result.modifiedData,
        );
        if (!validation.valid) {
          throw new Error(
            `Invalid VRP structure: ${validation.errors.join(", ")}`,
          );
        }

        return result;
      }, {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 10000
      });
    } catch (error: unknown) {
      console.error('🚨 Raw OpenAI error in modifyVrpData:', error);
      console.error('🚨 Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('🚨 Error stack:', error instanceof Error ? error.stack : 'Unknown');
      const vrpError = ErrorHandlingService.classifyError(error);
      ErrorHandlingService.logError(vrpError, {
        operation: 'modifyVrpData',
        userRequest: request.userRequest,
        hasCurrentData: !!request.currentData
      });
      throw vrpError;
    }
  }

  /**
   * Build system prompt with VRP schema and instructions for structured output
   */
  private buildStructuredVrpSystemPrompt(): string {
    return `You are a VRP (Vehicle Routing Problem) optimization assistant. Your job is to modify VRP JSON data based on user requests.

${VrpSchemaService.getSchemaForAI()}

## Instructions:
1. Understand the user's request for VRP modifications
2. Apply changes to the provided JSON data
3. Ensure all modifications preserve required structure
4. Return ONLY a valid JSON object in the exact format specified below

## Required JSON Response Format:
{
  "modifiedData": { /* complete modified VRP data */ },
  "explanation": "Brief explanation of what was changed",
  "changes": [
    {
      "type": "add|modify|remove",
      "target": "job|resource|option",
      "description": "Description of this specific change"
    }
  ]
}

## Rules:
- RESPOND ONLY WITH VALID JSON - no additional text
- Always preserve the core structure (jobs array, resources array)
- Keep all existing data unless specifically asked to remove it
- Use proper ISO datetime formats (YYYY-MM-DDTHH:mm:ssZ)
- Validate job and resource names are unique
- Be conservative: ask for clarification if the request is ambiguous
- Focus on the specific changes requested, don't optimize the entire solution
- The modifiedData field must contain the complete VRP data structure
- Provide clear, concise explanations of what was changed
- List specific changes in the changes array`;
  }

  /**
   * Build legacy system prompt (for non-structured calls)
   */
  private buildVrpSystemPrompt(): string {
    return `You are a VRP (Vehicle Routing Problem) optimization assistant. Your job is to modify VRP JSON data based on user requests.

${VrpSchemaService.getSchemaForAI()}

## Instructions:
1. Understand the user's request for VRP modifications
2. Apply changes to the provided JSON data
3. Ensure all modifications preserve required structure
4. Return a valid JSON response with the modified data

## Response Format:
CRITICAL: You MUST respond with ONLY valid JSON. Do not include any explanatory text before or after the JSON.

Return a JSON object with this exact structure:
{
  "modifiedData": <the complete modified VRP JSON>,
  "explanation": "Brief explanation of what was changed",
  "changes": [
    {
      "type": "add|modify|remove",
      "target": "job|resource|option", 
      "description": "Description of this specific change"
    }
  ]
}

## Rules:
- ONLY return valid JSON - no additional text or explanations outside the JSON
- Always preserve the core structure (jobs array, resources array)
- Keep all existing data unless specifically asked to remove it
- Use proper ISO datetime formats (YYYY-MM-DDTHH:mm:ssZ)
- Validate job and resource names are unique
- Be conservative: ask for clarification if the request is ambiguous
- Focus on the specific changes requested, don't optimize the entire solution`;
  }


  /**
   * Build user message with current data and request
   */
  private buildVrpUserMessage(request: VrpModificationRequest): string {
    const currentDataStr = JSON.stringify(request.currentData, null, 2);

    let message = `Current VRP data:
\`\`\`json
${currentDataStr}
\`\`\`

User request: ${request.userRequest}`;

    if (request.context) {
      message += `\n\nAdditional context: ${request.context}`;
    }

    message +=
      "\n\nPlease modify the VRP data according to the user request and return the response in the specified JSON format.";

    return message;
  }


  /**
   * Generate contextual suggestions based on current VRP data
   */
  async generateSuggestions(
    vrpData: Vrp.VrpSyncSolveParams,
  ): Promise<string[]> {
    const systemPrompt = `You are a VRP optimization expert. Analyze the provided VRP data and suggest 3-5 practical improvements or modifications.

${VrpSchemaService.getJobSchema()}
${VrpSchemaService.getResourceSchema()}

Focus on:
- Operational efficiency improvements
- Common optimization opportunities
- Practical business scenarios
- Time window optimizations
- Resource utilization improvements

Return suggestions as a JSON array of strings, each suggestion being a clear, actionable modification.`;

    const userMessage = `Analyze this VRP data and suggest improvements:
\`\`\`json
${JSON.stringify(vrpData, null, 2)}
\`\`\`

Return exactly 3-5 suggestions as a JSON array of strings.`;

    try {
      const response = await this.sendMessage(userMessage, systemPrompt);

      const suggestions = JSON.parse(response);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch {
      // Fallback suggestions based on data analysis
      return this.generateFallbackSuggestions(vrpData);
    }
  }

  /**
   * Generate fallback suggestions if AI fails
   */
  private generateFallbackSuggestions(
    vrpData: Vrp.VrpSyncSolveParams,
  ): string[] {
    const suggestions: string[] = [];

    if (vrpData.jobs.length > vrpData.resources.length * 10) {
      suggestions.push(
        "Add more vehicles to handle the high job-to-resource ratio",
      );
    }

    if (vrpData.jobs.some((job) => !job.windows || job.windows.length === 0)) {
      suggestions.push("Add time windows to jobs for better customer service");
    }

    if (
      vrpData.resources.every(
        (res) => !res.capacity || res.capacity.length === 0,
      )
    ) {
      suggestions.push(
        "Define resource capacities for better load optimization",
      );
    }

    suggestions.push("Optimize job priorities based on customer importance");
    suggestions.push(
      "Consider adding breaks to resource shifts for compliance",
    );

    return suggestions;
  }
}
