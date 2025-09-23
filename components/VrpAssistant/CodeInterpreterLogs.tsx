'use client'

import React, { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight, Copy, Clock, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ExecutionMetadata } from '@/components/ui/chat-message'
import { ExecutionLog } from '@/app/api/openai/code-interpreter/logs/route'

interface CodeInterpreterLogsProps {
  executionMetadata: ExecutionMetadata
  className?: string
}

export function CodeInterpreterLogs({ executionMetadata, className = '' }: CodeInterpreterLogsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async () => {
    if (logs.length > 0) return // Already loaded

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/openai/code-interpreter/logs?threadId=${executionMetadata.threadId}&runId=${executionMetadata.runId}`
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setLogs(data.logs)
      } else {
        throw new Error(data.error || 'Failed to fetch execution logs')
      }
    } catch (err) {
      console.error('Failed to fetch execution logs:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch logs')
    } finally {
      setIsLoading(false)
    }
  }, [executionMetadata.threadId, executionMetadata.runId, logs.length])

  const toggleExpanded = useCallback(async () => {
    if (!isExpanded) {
      await fetchLogs()
    }
    setIsExpanded(!isExpanded)
  }, [isExpanded, fetchLogs])

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code)
  }, [])

  const formatDuration = (createdAt: number, completedAt?: number) => {
    if (!completedAt) return 'In progress...'
    const duration = (completedAt - createdAt) * 1000 // Convert to ms
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />
    }
  }

  if (!executionMetadata.hasLogs) {
    return null
  }

  return (
    <div className={`mt-3 border border-gray-200 rounded-lg ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleExpanded}
        className="w-full justify-start p-3 h-auto font-normal"
        disabled={isLoading}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 mr-2" />
        ) : (
          <ChevronRight className="h-4 w-4 mr-2" />
        )}
        <span className="text-sm text-gray-600">
          {isExpanded ? 'Hide' : 'Show'} execution logs ({executionMetadata.stepCount} steps)
        </span>
        {isLoading && (
          <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500" />
        )}
      </Button>

      {isExpanded && (
        <div className="border-t border-gray-200 p-3 bg-gray-50 max-h-96 overflow-y-auto">
          {error ? (
            <div className="text-red-600 text-sm">
              Failed to load execution logs: {error}
            </div>
          ) : logs.length === 0 && isLoading ? (
            <div className="text-gray-500 text-sm">Loading execution logs...</div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-md p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium text-sm">Step {log.stepNumber}</span>
                      <span className="text-xs text-gray-500">
                        {formatDuration(log.createdAt, log.completedAt)}
                      </span>
                    </div>
                  </div>

                  {log.input && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">Code:</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyCode(log.input!)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
                        <code>{log.input}</code>
                      </pre>
                    </div>
                  )}

                  {log.outputs && log.outputs.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-gray-700 block mb-1">Output:</span>
                      <div className="space-y-1">
                        {log.outputs.map((output, index) => (
                          <div key={index}>
                            {output.type === 'logs' && (
                              <pre className="bg-blue-50 text-blue-900 p-2 rounded text-xs overflow-x-auto">
                                <code>{output.content}</code>
                              </pre>
                            )}
                            {output.type === 'image' && (
                              <div className="text-xs text-gray-600 italic">
                                Image generated: {output.content}
                              </div>
                            )}
                            {output.type === 'error' && (
                              <pre className="bg-red-50 text-red-900 p-2 rounded text-xs overflow-x-auto">
                                <code>{output.content}</code>
                              </pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}