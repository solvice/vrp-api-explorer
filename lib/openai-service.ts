import { z } from 'zod';
import { VrpSchemaService } from "./vrp-schema-service";
import { Vrp } from "solvice-vrp-solver/resources/vrp/vrp";
import { ErrorHandlingService } from './error-handling-service';

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

export class OpenAIService {
  private static readonly API_BASE_URL = '/api/openai/chat';

  constructor() {
    // No client initialization needed - using server-side API
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
      const response = await fetch(OpenAIService.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: 'gpt-4o',
          max_tokens: 1000,
          temperature: 0.7,
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
      console.log('🤖 Calling OpenAI API with structured output...');
      console.log('Model: gpt-4o-2024-08-06');
      console.log('Messages length:', messages.length);

      const response = await fetch(OpenAIService.API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model: 'gpt-4o',
          max_tokens: 2000,
          temperature: 0.3,
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

      const content = data.content;
      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      console.log('📝 Response content length:', content.length);

      const parsed = JSON.parse(content) as VrpModificationResponse;
      console.log('✅ Successfully parsed JSON response');

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
    return `You are a VRP (Vehicle Routing Problem) data converter using Code Interpreter. Your task is to:

1. Load and analyze uploaded CSV file(s) using pandas or similar tools
2. For multiple files: identify relationships and merge appropriately
3. Process the data programmatically to convert it to VRP JSON format
4. Handle data transformation including:
   - Converting durations from minutes to seconds
   - Mapping coordinates properly
   - Creating valid VRP job structures
   - Generating appropriate vehicle resources

Use the following VRP schema structure:
${VrpSchemaService.getSchemaForAI()}

## Processing Steps:

### For Single File:
1. Load the CSV and examine its structure
2. Identify column mappings (lat/latitude → location.latitude, etc.)
3. Process each row to create VRP jobs with proper data types
4. Convert durations from minutes to seconds (multiply by 60)
5. Generate vehicle resources based on job count and constraints
6. Create proper time windows and defaults where needed
7. Validate the final structure

### For Multiple Files:
1. Load all CSV files and examine their structures
2. Identify file types based on content and naming:
   - Location/depot files (lat/lon coordinates, addresses)
   - Job/customer files (orders, deliveries, service requirements)
   - Vehicle/fleet files (capacity, availability, constraints)
   - Constraint files (time windows, rules)
3. Identify relationships between files:
   - Common ID columns (customer_id, location_id, vehicle_id)
   - Geographic coordinates that need to be matched
   - Time windows that need to be aligned
4. Process files in logical order (locations → jobs → vehicles)
5. Merge data based on identified relationships
6. Handle missing relationships gracefully with reasonable defaults
7. Convert and validate as above

## File Relationship Detection:
- Look for common column names across files
- Match location data by coordinates or address
- Link jobs to locations by ID or proximity
- Assign vehicles based on capacity and location constraints

## Output Format:
Return a JSON object with this exact structure:
{
  "vrpData": { /* complete VRP request object */ },
  "explanation": "Brief explanation of the conversion process",
  "conversionNotes": ["Note about assumption 1", "File relationship details", "Data merge notes"],
  "rowsProcessed": number
}

Show your work step by step using Code Interpreter, then provide the final JSON result.`;
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