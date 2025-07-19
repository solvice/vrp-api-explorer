import OpenAI from 'openai';
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
  private openai: OpenAI;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (!key || key.trim() === "") {
      throw new Error(
        "OpenAI API key is required. Set NEXT_PUBLIC_OPENAI_API_KEY or OPENAI_API_KEY environment variable or provide apiKey parameter.",
      );
    }

    this.openai = new OpenAI({
      apiKey: key,
      // Allow in browser/test environments - this is safe for our use case
      // since we're handling API keys through environment variables
      dangerouslyAllowBrowser: true,
    });
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

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
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("Invalid response format from OpenAI API");
      }

      return content;
    } catch (error: unknown) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${error.status} ${error.message}`);
      }
      throw error;
    }
  }

  async sendStructuredMessage(message: string, systemPrompt?: string): Promise<VrpModificationResponse> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

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
      console.log('🤖 Calling OpenAI with JSON mode...');
      console.log('Model: gpt-4o');
      console.log('Messages length:', messages.length);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o", // Use gpt-4o for JSON mode
        messages,
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      console.log('✅ OpenAI response received');
      console.log('Usage:', completion.usage);

      const content = completion.choices[0]?.message?.content;
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
      console.error('Error status:', error && typeof error === 'object' && 'status' in error ? error.status : 'Unknown');
      console.error('Error code:', error && typeof error === 'object' && 'code' in error ? error.code : 'Unknown');
      
      if (error instanceof OpenAI.APIError) {
        console.error('OpenAI API Error details:', {
          status: error.status,
          message: error.message,
          code: error.code,
          type: error.type
        });
        throw new Error(`OpenAI API error: ${error.status} ${error.message}`);
      }
      
      // Re-throw with more context
      throw new Error(`Structured output failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.openai);
  }

  /**
   * Get a masked version of the API key for display purposes
   */
  getMaskedApiKey(): string {
    // Since the API key is validated in constructor, if we have an openai instance, we have a valid key
    if (!this.openai) return "Not configured";
    
    // We can't access the key directly from the OpenAI instance, but we know it's configured
    const key = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
    if (!key) return "Configured";
    
    return `${key.substring(0, 7)}...${key.substring(key.length - 4)}`;
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
