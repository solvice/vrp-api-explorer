"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import JsonView from "@uiw/react-json-view";
import { Editor } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type * as Monaco from "monaco-editor";
import { Vrp } from "solvice-vrp-solver/resources/vrp/vrp";
import { validateVrpRequest, ValidationResult } from "@/lib/vrp-schema";
import { CheckCircle, XCircle, Loader2, Play, Settings } from "lucide-react";
import { useVrpAssistant } from "@/components/VrpAssistant/VrpAssistantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SAMPLE_DATASETS,
  SampleType,
  getSampleVrpData,
} from "@/lib/sample-data";
import { cn } from "@/lib/utils";
import { LoadJobButton } from "@/components/LoadJobButton";
import { LoadJobDialog } from "@/components/LoadJobDialog";
import { JobBadge } from "@/components/JobBadge";

// Helper function to find differences between old and new JSON and highlight them
function highlightChangesAndScroll(
  editor: editor.IStandaloneCodeEditor,
  oldJsonString: string,
  newJsonString: string,
) {
  try {
    const oldLines = oldJsonString.split("\n");
    const newLines = newJsonString.split("\n");
    const changedLines: number[] = [];
    const addedLines: number[] = [];

    // Simple line-by-line comparison to find changes
    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i] || "";
      const newLine = newLines[i] || "";

      if (oldLine.trim() !== newLine.trim()) {
        changedLines.push(i + 1); // Monaco uses 1-based line numbers

        // Check if this is a new line (old was empty/missing)
        if (!oldLine && newLine.trim()) {
          addedLines.push(i + 1);
        }
      }
    }

    if (changedLines.length === 0) return;

    console.log(
      `🎨 Highlighting ${changedLines.length} changed lines:`,
      changedLines,
    );

    // Create decorations for changed lines
    const decorations = changedLines.map((lineNumber) => {
      const isNewLine = addedLines.includes(lineNumber);
      return {
        range: {
          startLineNumber: lineNumber,
          startColumn: 1,
          endLineNumber: lineNumber,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: isNewLine ? "ai-added-line" : "ai-changed-line",
          glyphMarginClassName: isNewLine
            ? "ai-added-glyph"
            : "ai-changed-glyph",
          overviewRulerColor: isNewLine ? "#10b981" : "#22c55e",
          overviewRulerLane: 4,
          minimap: {
            color: isNewLine ? "#10b981" : "#22c55e",
            position: 1,
          },
        },
      };
    });

    // Apply decorations
    const decorationIds = editor.deltaDecorations([], decorations);

    // Scroll to the first changed line with smooth animation
    const firstChangedLine = Math.min(...changedLines);
    console.log(`📍 Scrolling to line ${firstChangedLine}`);

    // Use revealLineInCenter with smooth scrolling
    editor.revealLineInCenter(firstChangedLine, 1); // 1 = smooth scrolling

    // Also focus the editor briefly to draw attention
    editor.focus();

    // Remove decorations after 4 seconds with fade
    setTimeout(() => {
      editor.deltaDecorations(decorationIds, []);
    }, 4000);
  } catch (error) {
    console.warn("Failed to highlight changes:", error);
  }
}

interface VrpJsonEditorProps {
  requestData: Record<string, unknown>;
  responseData?: Vrp.OnRouteResponse | null;
  onChange: (data: Record<string, unknown>) => void;
  onValidationChange: (result: ValidationResult) => void;
  isLoading?: boolean;
  className?: string;
  onSend?: () => void;
  disabled?: boolean;
  apiKeyStatus?: { type: "demo" | "user"; masked: string };
  onApiKeyChange?: (apiKey: string | null) => void;
  currentSample?: SampleType;
  onSampleChange?: (sample: SampleType) => void;
  loadedJobId?: string | null;
  onLoadJob?: (jobId: string) => Promise<void>;
  onClearJob?: () => void;
}

// Inject CSS styles for AI change highlighting
function injectAIHighlightStyles() {
  const styleId = "ai-highlight-styles";
  if (document.getElementById(styleId)) return;

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    .ai-changed-line {
      background-color: rgba(34, 197, 94, 0.1) !important;
      border-left: 3px solid #22c55e !important;
      animation: ai-highlight-fade 4s ease-out;
    }

    .ai-added-line {
      background-color: rgba(16, 185, 129, 0.15) !important;
      border-left: 3px solid #10b981 !important;
      animation: ai-added-fade 4s ease-out;
    }

    .ai-changed-glyph {
      background-color: #22c55e !important;
      width: 4px !important;
    }

    .ai-added-glyph {
      background-color: #10b981 !important;
      width: 4px !important;
    }

    @keyframes ai-highlight-fade {
      0% {
        background-color: rgba(34, 197, 94, 0.3);
      }
      100% {
        background-color: rgba(34, 197, 94, 0.1);
      }
    }

    @keyframes ai-added-fade {
      0% {
        background-color: rgba(16, 185, 129, 0.35);
      }
      100% {
        background-color: rgba(16, 185, 129, 0.15);
      }
    }
  `;
  document.head.appendChild(style);
}

function VrpJsonEditorContent({
  requestData,
  responseData,
  onChange,
  onValidationChange,
  isLoading = false,
  className,
  onSend,
  disabled = false,
  apiKeyStatus,
  onApiKeyChange,
  currentSample = "simple",
  onSampleChange,
  loadedJobId,
  onLoadJob,
  onClearJob,
}: VrpJsonEditorProps) {
  const { setVrpData, setOnVrpDataUpdate } = useVrpAssistant();
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    valid: true,
    errors: [],
  });
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");
  const [jsonString, setJsonString] = useState(() =>
    JSON.stringify(requestData, null, 2),
  );
  const [parseError, setParseError] = useState<string | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Job loading dialog state
  const [isLoadJobDialogOpen, setIsLoadJobDialogOpen] = useState(false);

  // Inject CSS styles for AI highlighting on mount
  useEffect(() => {
    injectAIHighlightStyles();
  }, []);

  // Set up VRP data sharing with AI assistant
  useEffect(() => {
    if (requestData) {
      setVrpData(requestData as unknown as Vrp.VrpSyncSolveParams);
    }
  }, [requestData, setVrpData]);

  // Set up callback for AI-modified VRP data
  useEffect(() => {
    setOnVrpDataUpdate((newData: Vrp.VrpSyncSolveParams) => {
      const newJsonString = JSON.stringify(newData, null, 2);
      setJsonString(newJsonString);

      // Trigger change event to parent
      onChange(newData as unknown as Record<string, unknown>);

      // Apply highlighting if editor is available
      if (editorRef.current) {
        highlightChangesAndScroll(editorRef.current, jsonString, newJsonString);
      }
    });
  }, [setOnVrpDataUpdate, onChange, jsonString]);

  // Validate data and notify parent
  const validateData = useCallback(
    (data: Record<string, unknown>) => {
      const result = validateVrpRequest(data);
      setValidationResult(result);
      onValidationChange(result);
    },
    [onValidationChange],
  );

  // Keep JSON string in sync with requestData changes (from sample selection)
  useEffect(() => {
    const newJsonString = JSON.stringify(requestData, null, 2);
    setJsonString(newJsonString);
    setParseError(null);
  }, [requestData]);

  // Initial validation
  useEffect(() => {
    validateData(requestData);
  }, [requestData, validateData]);

  // Set up VRP Assistant integration
  useEffect(() => {
    // Sync current VRP data to assistant
    if (requestData && typeof requestData === "object") {
      setVrpData(requestData as unknown as Vrp.VrpSyncSolveParams);
    }
  }, [requestData, setVrpData]);

  // Set up callback for AI modifications (separate useEffect to avoid circular dependency)
  useEffect(() => {
    const handleVrpDataUpdate = (modifiedData: Vrp.VrpSyncSolveParams) => {
      console.log(
        "🤖 VrpJsonEditor: AI modified data, updating editor and notifying parent...",
        {
          hasJobs: Array.isArray(modifiedData?.jobs),
          jobCount: modifiedData?.jobs?.length,
          hasResources: Array.isArray(modifiedData?.resources),
          resourceCount: modifiedData?.resources?.length,
        },
      );

      const editor = editorRef.current;
      const oldJsonString = jsonString;
      const newJsonString = JSON.stringify(modifiedData, null, 2);

      // Update the JSON string in the editor
      setJsonString(newJsonString);
      setParseError(null);

      // Notify parent component of the change
      console.log(
        "🤖 VrpJsonEditor: Calling onChange to notify VrpExplorer...",
      );
      onChange(modifiedData as unknown as Record<string, unknown>);

      // Validate the new data
      validateData(modifiedData as unknown as Record<string, unknown>);

      // Add visual feedback and scrolling if editor is available
      if (editor) {
        // Give a moment for the new content to be set
        setTimeout(() => {
          highlightChangesAndScroll(editor, oldJsonString, newJsonString);
        }, 100);
      }
    };

    setOnVrpDataUpdate(handleVrpDataUpdate);
  }, [setOnVrpDataUpdate, onChange, validateData, jsonString]);

  const handleRequestChange = (value: Record<string, unknown>) => {
    onChange(value);
    validateData(value);
  };

  const handleMonacoChange = (value: string | undefined) => {
    if (value === undefined) return;

    setJsonString(value);

    try {
      const parsed = JSON.parse(value);
      setParseError(null);
      handleRequestChange(parsed);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON");
      // Don't update the parent data when JSON is invalid
    }
  };

  const handleApiKeySubmit = () => {
    if (onApiKeyChange) {
      onApiKeyChange(tempApiKey || null);
      setTempApiKey("");
      setIsPopoverOpen(false);
    }
  };

  const handlePopoverCancel = () => {
    setTempApiKey("");
    setIsPopoverOpen(false);
  };

  const handleSampleChange = (sampleType: SampleType) => {
    if (onSampleChange) {
      onSampleChange(sampleType);
      const newData = getSampleVrpData(sampleType);
      const newJsonString = JSON.stringify(newData, null, 2);
      setJsonString(newJsonString);
      setParseError(null);
      onChange(newData as unknown as Record<string, unknown>);
      validateData(newData as unknown as Record<string, unknown>);
    }
  };

  const handleEditorDidMount = async (
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof Monaco,
  ) => {
    editorRef.current = editor;

    // Configure Monaco JSON language defaults with VRP schema
    try {
      // Fetch the VRP JSON Schema
      const response = await fetch("/schemas/vrp-request.schema.json");
      const schema = await response.json();

      // Configure JSON language defaults
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [
          {
            uri: "http://solvice.io/schemas/vrp-request.json",
            fileMatch: ["*"], // Apply to all JSON files in the editor
            schema: schema,
          },
        ],
        allowComments: false,
        trailingCommas: "error",
        schemaValidation: "error",
        schemaRequest: "error",
        enableSchemaRequest: false,
      });

      // Configure Monaco editor completion options for better IntelliSense
      monaco.languages.json.jsonDefaults.setModeConfiguration({
        documentFormattingEdits: true,
        documentRangeFormattingEdits: true,
        completionItems: true,
        hovers: true,
        documentSymbols: true,
        tokens: true,
        colors: true,
        foldingRanges: true,
        diagnostics: true,
        selectionRanges: true,
      });

      console.log("✅ VRP JSON Schema loaded and configured for autocomplete");
    } catch (error) {
      console.warn(
        "⚠️ Failed to load VRP JSON Schema for autocomplete:",
        error,
      );
    }
  };

  const renderValidationStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span data-testid="editor-loading">Validating</span>
        </div>
      );
    }

    if (parseError) {
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <XCircle className="h-3.5 w-3.5 text-red-600" />
          <span data-testid="validation-status" className="text-red-600">
            Parse Error
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1.5 text-xs">
        {validationResult.valid ? (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
            <span data-testid="validation-status" className="text-green-600">
              Valid
            </span>
          </>
        ) : (
          <>
            <XCircle className="h-3.5 w-3.5 text-red-600" />
            <span data-testid="validation-status" className="text-red-600">
              Invalid
            </span>
          </>
        )}
      </div>
    );
  };

  const renderValidationErrors = () => {
    const hasParseError = parseError !== null;
    const hasValidationErrors =
      !validationResult.valid && validationResult.errors.length > 0;

    if (!hasParseError && !hasValidationErrors) {
      return null;
    }

    return (
      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
        {hasParseError && (
          <>
            <h4 className="text-sm font-medium text-red-800 mb-2">
              JSON Parse Error:
            </h4>
            <div className="text-xs text-red-700 font-mono mb-3">
              {parseError}
            </div>
          </>
        )}
        {hasValidationErrors && (
          <>
            <h4 className="text-sm font-medium text-red-800 mb-2">
              Validation Errors:
            </h4>
            <ul className="text-xs text-red-700 space-y-1">
              {validationResult.errors.map((error, index) => (
                <li key={index} className="font-mono">
                  {error}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    );
  };

  const editorContent = (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Single Consolidated Toolbar */}
      <div className="px-3 py-2 border-b bg-background">
        <div className="flex items-center justify-between">
          {/* Left side: Action buttons and sample selector */}
          <div className="flex items-center gap-2">
            {/* API Key Settings Button */}
            {apiKeyStatus && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label="API Key Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>API Key Settings</p>
                  </TooltipContent>
                </Tooltip>

                <PopoverContent className="w-80" align="start">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium leading-none">
                        API Key Settings
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Configure your Solvice VRP API key for solving problems.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Current Key</Label>
                        <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                          {apiKeyStatus.type === "demo"
                            ? "Demo Key (Limited)"
                            : `User Key: ${apiKeyStatus.masked}`}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="api-key" className="text-xs">
                          Enter Your API Key
                        </Label>
                        <Input
                          id="api-key"
                          type="password"
                          placeholder="sk-..."
                          value={tempApiKey}
                          onChange={(e) => setTempApiKey(e.target.value)}
                          className="text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          Get your API key from{" "}
                          <a
                            href="https://www.solvice.io/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            solvice.io
                          </a>
                        </p>
                      </div>

                      <div className="flex justify-between space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePopoverCancel}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                        <div className="flex space-x-2">
                          {apiKeyStatus.type === "user" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (onApiKeyChange) {
                                  onApiKeyChange(null);
                                  setIsPopoverOpen(false);
                                }
                              }}
                              className="text-xs"
                            >
                              Use Demo
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={handleApiKeySubmit}
                            disabled={!tempApiKey.trim()}
                            className="text-xs"
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <p>• Keys are stored locally in your browser</p>
                        <p>• Demo key has usage limitations</p>
                        <p>• Your API key is never sent to our servers</p>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Load Job Button */}
            {onLoadJob && (
              <LoadJobButton
                onClick={() => setIsLoadJobDialogOpen(true)}
                disabled={isLoading}
              />
            )}

            {/* Separator */}
            <div className="h-6 w-px bg-border mx-1" />

            {/* Job Badge (if loaded) */}
            {loadedJobId && onClearJob && (
              <JobBadge jobId={loadedJobId} onClear={onClearJob} />
            )}

            {/* Sample Selector */}
            <Select value={currentSample} onValueChange={handleSampleChange}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue>
                  {(() => {
                    const sample = SAMPLE_DATASETS.find(
                      (s) => s.id === currentSample,
                    );
                    return sample ? sample.name : "Select sample...";
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SAMPLE_DATASETS.map((sample) => (
                  <SelectItem key={sample.id} value={sample.id}>
                    <div className="flex flex-col">
                      <div className="font-medium">{sample.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {sample.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Right side: Send Button */}
          <Button
            onClick={onSend}
            disabled={
              !validationResult.valid || isLoading || parseError !== null
            }
            size="sm"
            className="h-8"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Solving...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Request Editor - Direct to Monaco */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0 relative">
          <div className="flex-1 min-h-0" data-testid="json-editor">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={jsonString}
              onChange={handleMonacoChange}
              onMount={handleEditorDidMount}
              options={{
                automaticLayout: true,
                fontSize: 12,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                lineNumbers: "on",
                folding: true,
                foldingStrategy: "indentation",
                foldingHighlight: true,
                unfoldOnClickAfterEndOfLine: true,
                showFoldingControls: "always",
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
                tabSize: 2,
                insertSpaces: true,
                renderWhitespace: "boundary",
                quickSuggestions: {
                  other: true,
                  comments: false,
                  strings: true,
                },
                suggest: {
                  showProperties: true,
                  showFields: true,
                  showValues: true,
                  showMethods: false,
                  showFunctions: false,
                  showKeywords: true,
                  showSnippets: false,
                  showColors: false,
                  showFiles: false,
                  showReferences: false,
                  showFolders: false,
                  showTypeParameters: false,
                  showIssues: false,
                  showUsers: false,
                  showWords: false,
                  showStatusBar: true,
                  insertMode: "replace",
                  filterGraceful: true,
                  snippetsPreventQuickSuggestions: false,
                  localityBonus: false,
                  shareSuggestSelections: false,
                  showInlineDetails: true,
                },
                contextmenu: true,
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: disabled,
                cursorStyle: "line",
                mouseWheelZoom: true,
                showUnused: true,
                showDeprecated: true,
              }}
              theme="vs"
            />
          </div>

          {/* Floating Validation Status */}
          <div className="absolute bottom-3 right-3 z-10">
            <div className="bg-background/95 backdrop-blur-sm border rounded-lg px-3 py-2 shadow-lg">
              {renderValidationStatus()}
            </div>
          </div>

          {renderValidationErrors()}
        </div>
      </div>

      {/* Response Display */}
      {responseData && (
        <div className="flex-1 flex flex-col min-h-0 border-t">
          <div className="flex items-center justify-between p-3 border-b bg-muted/50">
            <h3 className="text-sm font-medium">Response</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Success</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4" data-testid="json-editor">
            <JsonView
              value={responseData}
              style={{
                backgroundColor: "transparent",
                fontSize: "12px",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Monaco, Cascadia Code, Roboto Mono, Consolas, Liberation Mono, Menlo, monospace",
              }}
              displayDataTypes={false}
              displayObjectSize={false}
              collapsed={2}
              enableClipboard={false}
            />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {editorContent}

      {/* Load Job Dialog */}
      {onLoadJob && (
        <LoadJobDialog
          open={isLoadJobDialogOpen}
          onOpenChange={setIsLoadJobDialogOpen}
          onLoadJob={onLoadJob}
        />
      )}
    </>
  );
}

export function VrpJsonEditor(props: VrpJsonEditorProps) {
  return (
    <TooltipProvider>
      <VrpJsonEditorContent {...props} />
    </TooltipProvider>
  );
}
