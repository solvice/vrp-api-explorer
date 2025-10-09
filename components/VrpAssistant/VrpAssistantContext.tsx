'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { Message, ExecutionMetadata } from '@/components/ui/chat-message'
import { OpenAIService, type CsvToVrpResponse } from '@/lib/openai-service'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { ErrorHandlingService, type VrpError } from '@/lib/error-handling-service'
import { useVrpMessages } from '@/lib/hooks/useVrpMessages'

export type ChatMode = 'modify' | 'analyze' | 'convert'

interface VrpAssistantContextType {
  isProcessing: boolean
  messages: Message[]
  vrpData: Vrp.VrpSyncSolveParams | null
  solution: Vrp.OnRouteResponse | null
  input: string
  isOpen: boolean
  chatMode: ChatMode
  setProcessing: (processing: boolean) => void
  addMessage: (role: 'user' | 'assistant' | 'system', content: string, executionMetadata?: ExecutionMetadata) => void
  clearMessages: () => void
  processUserMessage: (message: string) => Promise<void>
  processCsvUpload: (csvContent: string, filename: string) => Promise<void>
  processMultipleCsvUpload: (files: Array<{ content: string; name: string }>) => Promise<void>
  setVrpData: (data: Vrp.VrpSyncSolveParams | null) => void
  setSolution: (solution: Vrp.OnRouteResponse | null) => void
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e?: React.FormEvent) => void
  onVrpDataUpdate?: (data: Vrp.VrpSyncSolveParams) => void
  setOnVrpDataUpdate: (callback: (data: Vrp.VrpSyncSolveParams) => void) => void
  toggleAssistant: () => void
  openAssistant: () => void
  closeAssistant: () => void
  setChatMode: (mode: ChatMode) => void
}

const VrpAssistantContext = createContext<VrpAssistantContextType | undefined>(undefined)

interface VrpAssistantProviderProps {
  children: ReactNode
}

export function VrpAssistantProvider({ children }: VrpAssistantProviderProps) {
  // Use custom hooks for message management
  const { messages, addMessage, clearMessages } = useVrpMessages()

  // State management
  const [isProcessing, setIsProcessingState] = useState(false)
  const [vrpData, setVrpDataState] = useState<Vrp.VrpSyncSolveParams | null>(null)
  const [solution, setSolutionState] = useState<Vrp.OnRouteResponse | null>(null)
  const [input, setInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [chatMode, setChatModeState] = useState<ChatMode>('modify')
  const [openAIService] = useState<OpenAIService | null>(null)
  const [onVrpDataUpdate, setOnVrpDataUpdateState] = useState<((data: Vrp.VrpSyncSolveParams) => void) | undefined>()

  // Agent state management
  const [agentThreadId, setAgentThreadId] = useState<string | undefined>()
  const [agentAssistantId, setAgentAssistantId] = useState<string | undefined>()

  const setProcessing = (processing: boolean) => {
    setIsProcessingState(processing)
  }

  const setVrpData = (data: Vrp.VrpSyncSolveParams | null) => {
    setVrpDataState(data)
  }

  const setSolution = (sol: Vrp.OnRouteResponse | null) => {
    setSolutionState(sol)
  }

  const setOnVrpDataUpdate = useCallback((callback: (data: Vrp.VrpSyncSolveParams) => void) => {
    setOnVrpDataUpdateState(() => callback)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isProcessing) return
    
    const userMessage = input.trim()
    setInput('')
    
    await processUserMessage(userMessage)
  }

  const processUserMessage = async (message: string) => {
    try {
      setProcessing(true)

      // Add user message
      addMessage('user', message)

      if (!vrpData) {
        addMessage('assistant', 'I need VRP data to help you. Please make sure you have a VRP request loaded in the editor.')
        return
      }

      // Create OpenAI service lazily
      let aiService = openAIService
      if (!aiService) {
        try {
          aiService = new OpenAIService()
        } catch {
          addMessage('assistant', 'OpenAI service is not configured. Please check your API key configuration.')
          return
        }
      }

      // Route to different handlers based on mode
      switch (chatMode) {
        case 'modify':
          await handleModifyMode(aiService, message, vrpData)
          break
        case 'analyze':
          await handleAnalyzeMode(aiService, message, vrpData)
          break
        case 'convert':
          addMessage('assistant', 'Please upload CSV files using the paperclip button for conversion.')
          break
      }

    } catch (error) {
      console.error('Error processing user message:', error)

      // Handle VrpError with detailed user feedback
      if (error && typeof error === 'object' && 'type' in error) {
        const vrpError = error as VrpError
        const userMessage = ErrorHandlingService.formatUserError(vrpError)
        addMessage('assistant', userMessage)

        // Add specific suggestions as separate messages for better UX
        if (vrpError.suggestions.length > 0) {
          const suggestionMessage = vrpError.suggestions.length === 1
            ? `💡 **Suggestion:** ${vrpError.suggestions[0]}`
            : `💡 **Here are some suggestions:**\n${vrpError.suggestions.map((s) => `• ${s}`).join('\n')}`

          // Add suggestions after a brief delay for better visual flow
          setTimeout(() => {
            addMessage('system', suggestionMessage)
          }, 800)
        }
      } else {
        // Fallback for unknown errors
        addMessage('assistant', 'I encountered an unexpected error while processing your request. Please try again or rephrase your message.')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleModifyMode = async (aiService: OpenAIService, message: string, vrpData: Vrp.VrpSyncSolveParams) => {
    // Use VRP Agent with Code Interpreter + function tools
    const agentRequest = {
      message,
      threadId: agentThreadId,
      assistantId: agentAssistantId,
      vrpData,
      solution: solution || undefined
    }

    const agentResponse = await aiService.useVrpAgent(agentRequest)

    // Update agent state for conversation continuity
    setAgentThreadId(agentResponse.threadId)
    setAgentAssistantId(agentResponse.assistantId)

    // Add assistant's response
    addMessage('assistant', agentResponse.response)

    // Handle VRP data modifications if any
    if (agentResponse.modifiedData) {
      if (onVrpDataUpdate) {
        try {
          onVrpDataUpdate(agentResponse.modifiedData)
          setVrpData(agentResponse.modifiedData)

          // Add a success message with change summary
          if (agentResponse.changes && agentResponse.changes.length > 0) {
            const changesSummary = agentResponse.changes
              .map(change => `${change.type} ${change.target}`)
              .join(', ')

            setTimeout(() => {
              addMessage('system', `✅ Changes applied: ${changesSummary}`)
            }, 500)
          }
        } catch (error) {
          console.error('Failed to apply VRP changes:', error)
          addMessage('assistant', 'The changes were processed but failed to apply to the editor. Please try again.')
        }
      } else {
        addMessage('assistant', 'Changes processed successfully, but the editor connection is not available.')
      }

      // Log changes for debugging
      if (agentResponse.changes && agentResponse.changes.length > 0) {
        console.log('VRP Agent Changes applied:', agentResponse.changes)
      }
    }

    // Handle code outputs (charts, calculations) if any
    if (agentResponse.codeOutputs && agentResponse.codeOutputs.length > 0) {
      console.log('📊 Code Interpreter outputs:', agentResponse.codeOutputs)
      // Future: Display charts/images in the chat
    }
  }

  const handleAnalyzeMode = async (aiService: OpenAIService, message: string, vrpData: Vrp.VrpSyncSolveParams) => {
    // Use VRP Agent - it handles both analysis and modifications
    // When in analyze mode, the agent will prefer Code Interpreter for calculations
    const agentRequest = {
      message,
      threadId: agentThreadId,
      assistantId: agentAssistantId,
      vrpData,
      solution: solution || undefined
    }

    const agentResponse = await aiService.useVrpAgent(agentRequest)

    // Update agent state for conversation continuity
    setAgentThreadId(agentResponse.threadId)
    setAgentAssistantId(agentResponse.assistantId)

    // Add assistant's response
    addMessage('assistant', agentResponse.response)

    // Handle code outputs (charts, calculations) if any
    if (agentResponse.codeOutputs && agentResponse.codeOutputs.length > 0) {
      console.log('📊 Code Interpreter outputs:', agentResponse.codeOutputs)
      // Future: Display charts/images in the chat
    }
  }

  const processCsvUpload = async (csvContent: string, filename: string) => {
    try {
      setProcessing(true)

      // Add user message
      addMessage('user', `📎 Uploaded CSV file: ${filename}`)

      // Create OpenAI service lazily
      let aiService = openAIService
      if (!aiService) {
        try {
          aiService = new OpenAIService()
        } catch {
          addMessage('assistant', 'OpenAI service is not configured. Please check your API key configuration.')
          return
        }
      }

      // Convert CSV to VRP using Code Interpreter first, fallback to traditional method
      let conversionResult
      try {
        // Try Code Interpreter first for better data processing
        addMessage('system', '🤖 Using OpenAI Code Interpreter for advanced CSV processing...')
        conversionResult = await aiService.convertCsvToVrpWithCodeInterpreter(csvContent, filename)
        addMessage('system', '✅ Code Interpreter processing completed successfully')
      } catch (codeInterpreterError) {
        console.warn('Code Interpreter failed, falling back to traditional method:', codeInterpreterError)
        addMessage('system', '⚠️ Code Interpreter unavailable, using traditional CSV processing...')
        conversionResult = await aiService.convertCsvToVrp(csvContent, filename)
      }

      await handleConversionResult(conversionResult, filename)
    } catch (error) {
      await handleConversionError(error)
    } finally {
      setProcessing(false)
    }
  }

  const processMultipleCsvUpload = async (files: Array<{ content: string; name: string }>) => {
    try {
      setProcessing(true)

      // Add user message
      const fileNames = files.map(f => f.name).join(', ')
      addMessage('user', `📎 Uploaded ${files.length} CSV files: ${fileNames}`)

      // Create OpenAI service lazily
      let aiService = openAIService
      if (!aiService) {
        try {
          aiService = new OpenAIService()
        } catch {
          addMessage('assistant', 'OpenAI service is not configured. Please check your API key configuration.')
          return
        }
      }

      // Convert multiple CSVs to VRP using Code Interpreter (no fallback for multi-file)
      addMessage('system', `🤖 Using OpenAI Code Interpreter to process and merge ${files.length} CSV files...`)
      const conversionResult = await aiService.convertCsvToVrpWithCodeInterpreter(files)
      addMessage('system', '✅ Multi-file Code Interpreter processing completed successfully')

      await handleConversionResult(conversionResult, `${files.length} files`)
    } catch (error) {
      await handleConversionError(error)
    } finally {
      setProcessing(false)
    }
  }

  const handleConversionResult = async (conversionResult: CsvToVrpResponse | null, sourceDescription: string) => {

    if (conversionResult?.vrpData) {
      // Success - we have converted VRP data
      const explanation = conversionResult.explanation || `Successfully converted ${sourceDescription} to VRP format.`
      addMessage('assistant', explanation, conversionResult.executionMetadata)

      // Update the VRP data in the editor through the callback
      if (onVrpDataUpdate) {
        try {
          onVrpDataUpdate(conversionResult.vrpData)
          setVrpData(conversionResult.vrpData)

          // Add success message with conversion details
          const successMessage = `✅ Converted ${sourceDescription} to VRP format (${conversionResult.rowsProcessed} rows processed)`
          setTimeout(() => {
            addMessage('system', successMessage)
          }, 500)

          // Add conversion notes if available
          if (conversionResult.conversionNotes && conversionResult.conversionNotes.length > 0) {
            const notesMessage = `📋 **Conversion Notes:**\n${conversionResult.conversionNotes.map((note) => `• ${note}`).join('\n')}`
            setTimeout(() => {
              addMessage('system', notesMessage)
            }, 1000)
          }

        } catch (error) {
          console.error('Failed to apply CSV conversion:', error)
          addMessage('assistant', 'The CSV was converted but failed to apply to the editor. Please try again.')
        }
      } else {
        addMessage('assistant', 'CSV converted successfully, but the editor connection is not available.')
      }

      // Log conversion for debugging
      console.log('CSV Conversion completed:', {
        source: sourceDescription,
        rowsProcessed: conversionResult.rowsProcessed,
        notes: conversionResult.conversionNotes
      })
    } else {
      addMessage('assistant', `I wasn't able to convert ${sourceDescription} to VRP format. Please check the file format and try again.`)
    }
  }

  const handleConversionError = async (error: unknown) => {
    console.error('Error processing CSV upload:', error)

    // Handle VrpError with detailed user feedback
    if (error && typeof error === 'object' && 'type' in error) {
      const vrpError = error as VrpError
      const userMessage = ErrorHandlingService.formatUserError(vrpError)
      addMessage('assistant', userMessage)

      // Add specific suggestions as separate messages for better UX
      if (vrpError.suggestions.length > 0) {
        const suggestionMessage = vrpError.suggestions.length === 1
          ? `💡 **Suggestion:** ${vrpError.suggestions[0]}`
          : `💡 **Here are some suggestions:**\n${vrpError.suggestions.map((s) => `• ${s}`).join('\n')}`

        // Add suggestions after a brief delay for better visual flow
        setTimeout(() => {
          addMessage('system', suggestionMessage)
        }, 800)
      }
    } else {
      // Fallback for unknown errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during CSV conversion'
      addMessage('assistant', `Failed to convert CSV files: ${errorMessage}. Please check your file format and try again.`)
    }
  }

  // Assistant toggle functions
  const toggleAssistant = () => {
    setIsOpen(!isOpen)
  }

  const openAssistant = () => {
    setIsOpen(true)
  }

  const closeAssistant = () => {
    setIsOpen(false)
  }

  // Chat mode functions
  const setChatMode = useCallback((mode: ChatMode) => {
    setChatModeState(mode)
  }, [])

  // Keyboard shortcut for mode switching (Shift+Tab)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === 'Tab' && isOpen) {
        event.preventDefault()
        const modes: ChatMode[] = ['modify', 'analyze', 'convert']
        const currentIndex = modes.indexOf(chatMode)
        const nextIndex = (currentIndex + 1) % modes.length
        setChatMode(modes[nextIndex])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [chatMode, isOpen, setChatMode])

  const value: VrpAssistantContextType = {
    isProcessing,
    messages,
    vrpData,
    solution,
    input,
    isOpen,
    chatMode,
    setProcessing,
    addMessage,
    clearMessages,
    processUserMessage,
    processCsvUpload,
    processMultipleCsvUpload,
    setVrpData,
    setSolution,
    handleInputChange,
    handleSubmit,
    onVrpDataUpdate,
    setOnVrpDataUpdate,
    toggleAssistant,
    openAssistant,
    closeAssistant,
    setChatMode
  }

  return (
    <VrpAssistantContext.Provider value={value}>
      {children}
    </VrpAssistantContext.Provider>
  )
}

export function useVrpAssistant() {
  const context = useContext(VrpAssistantContext)
  if (context === undefined) {
    throw new Error('useVrpAssistant must be used within a VrpAssistantProvider')
  }
  return context
}