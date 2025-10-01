import { z } from 'zod';
import { VrpSchemaService } from "./vrp-schema-service";
import { Vrp } from "solvice-vrp-solver/resources/vrp/vrp";
import { ErrorHandlingService } from './error-handling-service';
import { telemetryService } from './telemetry-service';

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

export interface CsvToVrpResponse {
  vrpData: Vrp.VrpSyncSolveParams;
  explanation: string;
  conversionNotes: string[];
  rowsProcessed: number;
  executionMetadata?: {
    threadId: string;
    runId: string;
    stepCount: number;
    hasLogs: boolean;
  };
}

// Zod schemas for structured outputs (currently unused but kept for future validation)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const VrpModificationResponseSchema = z.object({
  modifiedData: z.any(), // VRP data structure - using any to match existing interface
  explanation: z.string(),
  changes: z.array(z.object({
    type: z.enum(["add", "modify", "remove"]),
    target: z.enum(["job", "resource", "option"]),
    description: z.string()
  }))
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CsvToVrpResponseSchema = z.object({
  vrpData: z.any(), // VRP data structure - using any to match existing interface
  explanation: z.string(),
  conversionNotes: z.array(z.string()),
  rowsProcessed: z.number()
});

interface ModelConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}

interface ModelSelectionContext {
  requestType: 'chat' | 'vrp_modify' | 'suggestions' | 'csv_convert';
  tokenEstimate?: number;
  requiresReasoning?: boolean;
}

export class OpenAIService {
  private static readonly API_BASE_URL = '/api/openai/chat';

  // Model pricing per million tokens (input/output)
  private static readonly MODEL_PRICING = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
  };

  constructor() {
    // No client initialization needed - using server-side API
  }

  /**
   * Select optimal model based on request characteristics
   */
  private selectOptimalModel(context: ModelSelectionContext): ModelConfig {
    const { requestType, tokenEstimate = 0, requiresReasoning = false } = context;

    // Simple suggestions or short chats: Use mini
    if (requestType === 'suggestions' || (requestType === 'chat' && tokenEstimate < 500)) {
      return {
        model: 'gpt-4o-mini',
        maxTokens: 1000,
        temperature: 0.7,
      };
    }

    // VRP modifications with complex reasoning: Use full model
    if (requestType === 'vrp_modify' && requiresReasoning) {
      return {
        model: 'gpt-4o',
        maxTokens: 2000,
        temperature: 0.3,
      };
    }

    // CSV conversion: Use mini (Code Interpreter handles complexity)
    if (requestType === 'csv_convert') {
      return {
        model: 'gpt-4o-mini',
        maxTokens: 4000,
        temperature: 0.1,
      };
    }

    // Default: Use standard model for balanced performance
    return {
      model: 'gpt-4o',
      maxTokens: 1500,
      temperature: 0.5,
    };
  }

  /**
   * Calculate estimated cost for API usage
   */
  private calculateCost(usage: { prompt_tokens: number; completion_tokens: number }, model: string): number {
    const pricing = OpenAIService.MODEL_PRICING[model as keyof typeof OpenAIService.MODEL_PRICING];
    if (!pricing) return 0;

    return (
      (usage.prompt_tokens * pricing.input / 1_000_000) +
      (usage.completion_tokens * pricing.output / 1_000_000)
    );
  }

  /**
   * Detect if VRP modification requires complex reasoning
   */
  private requiresComplexReasoning(request: VrpModificationRequest): boolean {
    const complexKeywords = [
      'optimize', 'rebalance', 'redistribute', 'analyze',
      'compare', 'multiple', 'all', 'every', 'best',
    ];

    return complexKeywords.some(keyword =>
      request.userRequest.toLowerCase().includes(keyword)
    );
  }

  async sendMessage(message: string, systemPrompt?: string): Promise<string> {
    const startTime = Date.now();
    const modelConfig = this.selectOptimalModel({ requestType: 'chat' });

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
      const response = await fetch(OpenAIService.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: modelConfig.model,
          max_tokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.content) {
        throw new Error("No content in OpenAI response");
      }

      // Track usage
      if (data.usage) {
        telemetryService.logUsage({
          model: modelConfig.model,
          operation: 'sendMessage',
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          estimatedCost: this.calculateCost(data.usage, modelConfig.model),
          latencyMs: Date.now() - startTime,
          success: true,
        });
      }

      return data.content;
    } catch (error: unknown) {
      // Track failed request
      telemetryService.logUsage({
        model: modelConfig.model,
        operation: 'sendMessage',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        latencyMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw error;
    }
  }

  async sendStructuredMessage(message: string, systemPrompt?: string): Promise<VrpModificationResponse> {
    const startTime = Date.now();
    const modelConfig = this.selectOptimalModel({ requestType: 'vrp_modify', requiresReasoning: true });

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
      console.log('🤖 Calling OpenAI API with structured output...');
      console.log('Model:', modelConfig.model);
      console.log('Messages length:', messages.length);

      const response = await fetch(OpenAIService.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: modelConfig.model,
          max_tokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('✅ OpenAI response received');
      console.log('Usage:', data.usage);

      // Track usage
      if (data.usage) {
        telemetryService.logUsage({
          model: modelConfig.model,
          operation: 'sendStructuredMessage',
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          estimatedCost: this.calculateCost(data.usage, modelConfig.model),
          latencyMs: Date.now() - startTime,
          success: true,
        });
      }

      const content = data.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      console.log('📝 Response content length:', content.length);

      const parsed = JSON.parse(content) as VrpModificationResponse;
      console.log('✅ Successfully parsed JSON response');

      return parsed;
    } catch (error: unknown) {
      // Track failed request
      telemetryService.logUsage({
        model: modelConfig.model,
        operation: 'sendStructuredMessage',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        latencyMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      console.error('❌ Error in sendStructuredMessage:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error && typeof error === 'object' && 'constructor' in error ? error.constructor?.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');

      throw new Error(`Structured output failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }


  /**
   * Check if the service is properly configured by testing the API
   */
  async isConfigured(): Promise<boolean> {
    try {
      const response = await fetch(OpenAIService.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'test' }],
          model: 'gpt-4o',
          max_tokens: 1,
          temperature: 0.1,
        }),
      });

      // If we get a successful response or rate limit, the API key is configured
      return response.status === 200 || response.status === 429;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration status for display purposes
   */
  getConfigurationStatus(): string {
    return "Server-side configured";
  }

  /**
   * Modify VRP data based on user request using AI
   */
  async modifyVrpData(
    request: VrpModificationRequest,
  ): Promise<VrpModificationResponse> {
    try {
      return await ErrorHandlingService.withRetry(async () => {
        const systemPrompt = this.buildOptimizedVrpSystemPrompt();
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
   * Build optimized system prompt with VRP schema (reduced token count)
   */
  private buildOptimizedVrpSystemPrompt(): string {
    return `You are a VRP optimization assistant. Modify VRP JSON based on user requests.

${VrpSchemaService.getCompactSchemaForAI()}

## Response Format (JSON only):
{
  "modifiedData": {/* complete VRP */},
  "explanation": "What changed",
  "changes": [{"type": "add|modify|remove", "target": "job|resource|option", "description": "..."}]
}

## Rules:
- JSON only, no extra text
- Preserve jobs[], resources[] structure
- Keep existing data unless removal requested
- ISO datetimes (YYYY-MM-DDTHH:mm:ssZ)
- Unique names
- Focus on requested changes only`;
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
    const startTime = Date.now();
    const modelConfig = this.selectOptimalModel({ requestType: 'suggestions' });

    const systemPrompt = `VRP expert. Analyze data, suggest 3-5 improvements.

${VrpSchemaService.getCompactSchemaForAI()}

Focus: efficiency, time windows, capacity, practical changes.
Return: JSON array of strings.`;

    const userMessage = `Suggest improvements:\n${JSON.stringify(vrpData, null, 2)}\n\nReturn 3-5 suggestions as JSON array.`;

    try {
      const response = await fetch(OpenAIService.API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          model: modelConfig.model,
          max_tokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
        }),
      });

      const data = await response.json();

      // Track usage
      if (data.usage) {
        telemetryService.logUsage({
          model: modelConfig.model,
          operation: 'generateSuggestions',
          promptTokens: data.usage.prompt_tokens || 0,
          completionTokens: data.usage.completion_tokens || 0,
          totalTokens: data.usage.total_tokens || 0,
          estimatedCost: this.calculateCost(data.usage, modelConfig.model),
          latencyMs: Date.now() - startTime,
          success: true,
        });
      }

      const suggestions = JSON.parse(data.content);
      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      // Track failed request
      telemetryService.logUsage({
        model: modelConfig.model,
        operation: 'generateSuggestions',
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        latencyMs: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.generateFallbackSuggestions(vrpData);
    }
  }

  /**
   * Convert CSV data to VRP format using OpenAI Code Interpreter
   * Supports both single file and multiple file inputs
   */
  async convertCsvToVrpWithCodeInterpreter(
    input: string | Array<{ content: string; name: string }>,
    filename?: string
  ): Promise<CsvToVrpResponse> {
    try {
      return await ErrorHandlingService.withRetry(async () => {
        const instructions = OpenAIService.buildCodeInterpreterInstructions();

        // Normalize input to handle both single and multiple files
        const isMultipleFiles = Array.isArray(input);
        const files = isMultipleFiles ? input : [{ content: input, name: filename! }];

        const response = await fetch('/api/openai/code-interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...(isMultipleFiles ? { files } : { csvContent: input, filename }),
            instructions
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success || !data.result) {
          throw new Error("Invalid response format from Code Interpreter API");
        }

        console.log('🔍 Code Interpreter raw response length:', data.rawResponse?.length || 0);
        console.log('✅ Successfully parsed Code Interpreter response');

        const result = data.result as CsvToVrpResponse;

        // Validate the generated VRP data
        const validation = VrpSchemaService.validateModification(
          // Use a minimal VRP structure for comparison
          { jobs: [], resources: [] } as Vrp.VrpSyncSolveParams,
          result.vrpData,
        );

        if (!validation.valid) {
          throw new Error(
            `Generated VRP data is invalid: ${validation.errors.join(", ")}`,
          );
        }

        // Attach execution metadata for logs display
        result.executionMetadata = data.executionMetadata;

        return result;
      }, {
        maxRetries: 1, // Code Interpreter takes longer, fewer retries
        baseDelay: 2000,
        maxDelay: 15000
      });
    } catch (error: unknown) {
      console.error('🚨 Code Interpreter CSV conversion error:', error);
      const vrpError = ErrorHandlingService.classifyError(error);
      const isMultipleFiles = Array.isArray(input);
      const fileInfo = isMultipleFiles
        ? { fileCount: input.length, totalSize: input.reduce((sum, f) => sum + f.content.length, 0) }
        : { filename, csvLength: (input as string).length };

      ErrorHandlingService.logError(vrpError, {
        operation: 'convertCsvToVrpWithCodeInterpreter',
        ...fileInfo
      });
      throw vrpError;
    }
  }

  /**
   * Convert CSV data to VRP format using OpenAI structured output
   */
  async convertCsvToVrp(csvContent: string, filename: string): Promise<CsvToVrpResponse> {
    try {
      return await ErrorHandlingService.withRetry(async () => {
        const systemPrompt = OpenAIService.buildCsvConversionSystemPrompt();
        const userMessage = `Convert this CSV file to VRP JSON format:\n\nFilename: ${filename}\n\nCSV Content:\n${csvContent}`;

        const response = await fetch(OpenAIService.API_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage }
            ],
            model: 'gpt-4o',
            max_tokens: 4000,
            temperature: 0.1,
            response_format: { type: "json_object" }
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.content;

        if (!content) {
          throw new Error("Invalid response format from OpenAI API - no content");
        }

        console.log('📝 Response content length:', content.length);

        const parsed = JSON.parse(content) as CsvToVrpResponse;
        console.log('✅ Successfully parsed JSON response');

        // Validate the generated VRP data
        const validation = VrpSchemaService.validateModification(
          // Use a minimal VRP structure for comparison
          { jobs: [], resources: [] } as Vrp.VrpSyncSolveParams,
          parsed.vrpData,
        );

        if (!validation.valid) {
          throw new Error(
            `Generated VRP data is invalid: ${validation.errors.join(", ")}`,
          );
        }

        return parsed;
      }, {
        maxRetries: 2,
        baseDelay: 1000,
        maxDelay: 10000
      });
    } catch (error: unknown) {
      console.error('🚨 CSV conversion error:', error);
      const vrpError = ErrorHandlingService.classifyError(error);
      ErrorHandlingService.logError(vrpError, {
        operation: 'convertCsvToVrp',
        filename,
        csvLength: csvContent.length
      });
      throw vrpError;
    }
  }

  /**
   * Build system prompt for CSV to VRP conversion
   */
  static buildCsvConversionSystemPrompt(): string {
    return `You are a VRP (Vehicle Routing Problem) data converter. Convert CSV data to valid VRP JSON format.

${VrpSchemaService.getSchemaForAI()}

## Conversion Instructions:
1. Analyze CSV columns to identify:
   - Location data (lat/lon coordinates, addresses)
   - Service times/durations
   - Time windows
   - Demands/quantities
   - Vehicle information

2. Map CSV data to VRP structure:
   - Each CSV row (except header) becomes a job in the jobs array
   - Create reasonable vehicle resources based on job count
   - Use intelligent field mapping (lat/latitude → location.latitude, etc.)
   - Convert time formats to ISO datetime (YYYY-MM-DDTHH:mm:ssZ)
   - Convert durations to seconds

3. Generate defaults for missing data:
   - Single vehicle starting from depot (first job location or center)
   - 8-hour work shift (08:00-18:00) if no times specified
   - 15-minute default service duration if not provided
   - Enable polylines and partial planning options

4. Ensure data quality:
   - Job names must be unique (add suffixes if needed)
   - All coordinates must be valid numbers
   - All datetime values must use proper ISO format
   - Resource shifts must have start/end locations

## Required JSON Response Format:
{
  "vrpData": { /* complete VRP request object */ },
  "explanation": "Brief explanation of the conversion",
  "conversionNotes": ["Note about assumption 1", "Note about assumption 2"],
  "rowsProcessed": number
}

## Rules:
- RESPOND ONLY WITH VALID JSON - no additional text
- Use conservative defaults for missing data
- Preserve all location data with proper lat/lon coordinates
- Generate descriptive job names if CSV names are poor
- Ensure generated VRP passes validation
- Include helpful notes about assumptions made during conversion`;
  }

  /**
   * Build instructions for Code Interpreter CSV conversion
   */
  static buildCodeInterpreterInstructions(): string {
    return `VRP data converter using Code Interpreter.

1. Load CSV(s) with pandas
2. Multiple files: identify relationships, merge
3. Transform: durations (min→sec), map coordinates, create jobs/resources
4. Return JSON

VRP schema:
${VrpSchemaService.getCompactSchemaForAI()}

## Steps:
Single: Load→map columns→create jobs→generate vehicles→validate
Multiple: Load all→identify types/relationships→merge→convert→validate

## Output:
{"vrpData": {...}, "explanation": "...", "conversionNotes": [...], "rowsProcessed": N}

Show work, provide final JSON.`;
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