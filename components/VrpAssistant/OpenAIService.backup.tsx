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
    } catch (error: any) {
      if (error instanceof OpenAI.APIError) {
        throw new Error(`OpenAI API error: ${error.status} ${error.message}`);
      }
      throw error;
    }
  }

  private async makeAPICall(
    messages: OpenAIMessage[],
    retryCount = 0,
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        // Check if we should retry
        if (this.shouldRetry(response.status) && retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * (retryCount + 1));
          return this.makeAPICall(messages, retryCount + 1);
        }

        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}`,
        );
      }

      const data: OpenAIResponse = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response format from OpenAI API");
      }

      return data.choices[0].message.content;
    } catch (error) {
      // Retry on network errors
      if (this.isNetworkError(error) && retryCount < this.maxRetries) {
        await this.delay(this.retryDelay * (retryCount + 1));
        return this.makeAPICall(messages, retryCount + 1);
      }

      throw error;
    }
  }

  private shouldRetry(status: number): boolean {
    // Retry on rate limits (429) and server errors (5xx)
    return status === 429 || (status >= 500 && status < 600);
  }

  private isNetworkError(error: unknown): boolean {
    return (
      error instanceof TypeError ||
      (error instanceof Error && !!error.message && error.message.includes("network")) ||
      (error instanceof Error && !!error.message && error.message.includes("fetch"))
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim() !== "");
  }

  /**
   * Get a masked version of the API key for display purposes
   */
  getMaskedApiKey(): string {
    if (!this.apiKey) return "Not configured";
    return `${this.apiKey.substring(0, 7)}...${this.apiKey.substring(this.apiKey.length - 4)}`;
  }

  /**
   * Modify VRP data based on user request using AI
   */
  async modifyVrpData(
    request: VrpModificationRequest,
  ): Promise<VrpModificationResponse> {
    try {
      return await ErrorHandlingService.withRetry(async () => {
        const systemPrompt = this.buildVrpSystemPrompt();
        const userMessage = this.buildVrpUserMessage(request);

        const response = await this.makeAPICall([
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ]);

        return this.parseVrpResponse(response, request.currentData);
      }, {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 10000
      });
    } catch (error) {
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
   * Build system prompt with VRP schema and instructions
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
   * Parse AI response and validate the result
   */
  private parseVrpResponse(
    response: string,
    originalData: Vrp.VrpSyncSolveParams,
  ): VrpModificationResponse {
    try {
      // Try to extract JSON from response (handle cases where AI adds explanation outside JSON)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : response;

      const parsed = JSON.parse(jsonStr);

      if (!parsed.modifiedData) {
        throw new Error("Response missing modifiedData field");
      }

      // Validate the modified data structure
      const validation = VrpSchemaService.validateModification(
        originalData,
        parsed.modifiedData,
      );
      if (!validation.valid) {
        throw new Error(
          `Invalid VRP structure: ${validation.errors.join(", ")}`,
        );
      }

      return {
        modifiedData: parsed.modifiedData,
        explanation: parsed.explanation || "VRP data modified successfully",
        changes: parsed.changes || [],
      };
    } catch (error) {
      // Fallback: return original data with error explanation
      return {
        modifiedData: originalData,
        explanation: `Failed to parse AI response: ${error instanceof Error ? error.message : "Unknown error"}`,
        changes: [],
      };
    }
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
      const response = await this.makeAPICall([
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ]);

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
