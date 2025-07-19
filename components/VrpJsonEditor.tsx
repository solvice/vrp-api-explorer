'use client'

import { useEffect, useState, useCallback } from 'react'
import JsonView from '@uiw/react-json-view'
import { Editor } from '@monaco-editor/react'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { validateVrpRequest, ValidationResult } from '@/lib/vrp-schema'
import { CheckCircle, XCircle, Loader2, Play, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SAMPLE_DATASETS, SampleType, getSampleVrpData } from '@/lib/sample-data'
import { cn } from '@/lib/utils'

interface VrpJsonEditorProps {
  requestData: Record<string, unknown>
  responseData?: Vrp.OnRouteResponse | null
  onChange: (data: Record<string, unknown>) => void
  onValidationChange: (result: ValidationResult) => void
  isLoading?: boolean
  className?: string
  onSend?: () => void
  disabled?: boolean
  apiKeyStatus?: { type: 'demo' | 'user', masked: string }
  onApiKeyChange?: (apiKey: string | null) => void
  currentSample?: SampleType
  onSampleChange?: (sample: SampleType) => void
}

export function VrpJsonEditor({
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
  currentSample = 'simple',
  onSampleChange
}: VrpJsonEditorProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult>({ valid: true, errors: [] })
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [tempApiKey, setTempApiKey] = useState('')
  const [jsonString, setJsonString] = useState(() => JSON.stringify(requestData, null, 2))
  const [parseError, setParseError] = useState<string | null>(null)

  // Validate data and notify parent
  const validateData = useCallback((data: Record<string, unknown>) => {
    const result = validateVrpRequest(data)
    setValidationResult(result)
    onValidationChange(result)
  }, [onValidationChange])

  // Keep JSON string in sync with requestData changes (from sample selection)
  useEffect(() => {
    const newJsonString = JSON.stringify(requestData, null, 2)
    if (newJsonString !== jsonString) {
      setJsonString(newJsonString)
      setParseError(null)
    }
  }, [requestData, jsonString])

  // Initial validation
  useEffect(() => {
    validateData(requestData)
  }, [requestData, validateData])

  const handleRequestChange = (value: Record<string, unknown>) => {
    onChange(value)
    validateData(value)
  }

  const handleMonacoChange = (value: string | undefined) => {
    if (value === undefined) return
    
    setJsonString(value)
    
    try {
      const parsed = JSON.parse(value)
      setParseError(null)
      handleRequestChange(parsed)
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON')
      // Don't update the parent data when JSON is invalid
    }
  }


  const handleApiKeySubmit = () => {
    if (onApiKeyChange) {
      onApiKeyChange(tempApiKey || null)
      setTempApiKey('')
      setIsPopoverOpen(false)
    }
  }

  const handlePopoverCancel = () => {
    setTempApiKey('')
    setIsPopoverOpen(false)
  }

  const handleSampleChange = (sampleType: SampleType) => {
    if (onSampleChange) {
      onSampleChange(sampleType)
      const newData = getSampleVrpData(sampleType)
      const newJsonString = JSON.stringify(newData, null, 2)
      setJsonString(newJsonString)
      setParseError(null)
      onChange(newData as unknown as Record<string, unknown>)
      validateData(newData as unknown as Record<string, unknown>)
    }
  }


  const renderValidationStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span data-testid="editor-loading">Validating...</span>
        </div>
      )
    }

    if (parseError) {
      return (
        <div className="flex items-center space-x-2 text-sm">
          <XCircle className="h-4 w-4 text-red-600" />
          <span data-testid="validation-status" className="text-red-600">Parse Error</span>
        </div>
      )
    }

    return (
      <div className="flex items-center space-x-2 text-sm">
        {validationResult.valid ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span data-testid="validation-status" className="text-green-600">Valid</span>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-red-600" />
            <span data-testid="validation-status" className="text-red-600">Invalid</span>
          </>
        )}
      </div>
    )
  }

  const renderValidationErrors = () => {
    const hasParseError = parseError !== null
    const hasValidationErrors = !validationResult.valid && validationResult.errors.length > 0
    
    if (!hasParseError && !hasValidationErrors) {
      return null
    }

    return (
      <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
        {hasParseError && (
          <>
            <h4 className="text-sm font-medium text-red-800 mb-2">JSON Parse Error:</h4>
            <div className="text-xs text-red-700 font-mono mb-3">
              {parseError}
            </div>
          </>
        )}
        {hasValidationErrors && (
          <>
            <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors:</h4>
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
    )
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col h-full", className)}>
        {/* Controls Header - Single Line */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between">
            {/* Left side: Endpoint and Settings */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Label className="text-xs text-muted-foreground">Endpoint:</Label>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  POST /v2/vrp/solve/sync
                </code>
              </div>

              {/* API Key Settings Button with Tooltip */}
              {apiKeyStatus && (
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                        >
                          <Settings className="h-3 w-3" />
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
                        <h4 className="font-medium leading-none">API Key Settings</h4>
                        <p className="text-sm text-muted-foreground">
                          Configure your Solvice VRP API key for solving problems.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Current Key</Label>
                          <div className="text-xs font-mono bg-muted px-2 py-1 rounded">
                            {apiKeyStatus.type === 'demo' ? 'Demo Key (Limited)' : `User Key: ${apiKeyStatus.masked}`}
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
                            Get your API key from{' '}
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
                            {apiKeyStatus.type === 'user' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (onApiKeyChange) {
                                    onApiKeyChange(null)
                                    setIsPopoverOpen(false)
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
            </div>

            {/* Right side: Send Button */}
            <Button
              onClick={onSend}
              disabled={!validationResult.valid || isLoading || parseError !== null}
              size="sm"
              className="min-w-[80px]"
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

      {/* Request Editor */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between p-3 border-b bg-muted/50">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-medium">Request</h3>
            <Select value={currentSample} onValueChange={handleSampleChange}>
              <SelectTrigger className="w-[300px] h-7 text-xs">
                <SelectValue>
                  {(() => {
                    const sample = SAMPLE_DATASETS.find(s => s.id === currentSample)
                    return sample ? `${sample.name}: ${sample.description}` : "Select sample..."
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
          {renderValidationStatus()}
        </div>
        
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0" data-testid="json-editor">
            <Editor
              height="100%"
              defaultLanguage="json"
              value={jsonString}
              onChange={handleMonacoChange}
              options={{
                automaticLayout: true,
                fontSize: 12,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                lineNumbers: 'on',
                folding: true,
                bracketPairColorization: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
                tabSize: 2,
                insertSpaces: true,
                renderWhitespace: 'boundary',
                quickSuggestions: true,
                contextmenu: true,
                selectOnLineNumbers: true,
                roundedSelection: false,
                readOnly: disabled,
                cursorStyle: 'line',
                mouseWheelZoom: true,
                showUnused: true,
                showDeprecated: true
              }}
              theme="vs"
            />
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
                backgroundColor: 'transparent',
                fontSize: '12px',
                fontFamily: 'ui-monospace, SFMono-Regular, Monaco, Cascadia Code, Roboto Mono, Consolas, Liberation Mono, Menlo, monospace'
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
    </TooltipProvider>
  )
}