'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { Message } from '@/components/ui/chat-message'
import { ChatPersistence } from './ChatPersistence'
import { OpenAIService } from './OpenAIService'
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp'
import { ErrorHandlingService, type VrpError } from '@/lib/error-handling-service'

interface VrpAssistantContextType {
  isProcessing: boolean
  messages: Message[]
  vrpData: Vrp.VrpSyncSolveParams | null
  input: string
  setProcessing: (processing: boolean) => void
  addMessage: (role: 'user' | 'assistant' | 'system', content: string) => void
  clearMessages: () => void
  processUserMessage: (message: string) => Promise<void>
  processCsvUpload: (csvContent: string, filename: string) => Promise<void>
  setVrpData: (data: Vrp.VrpSyncSolveParams | null) => void
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleSubmit: (e?: React.FormEvent) => void
  onVrpDataUpdate?: (data: Vrp.VrpSyncSolveParams) => void
  setOnVrpDataUpdate: (callback: (data: Vrp.VrpSyncSolveParams) => void) => void
}

const VrpAssistantContext = createContext<VrpAssistantContextType | undefined>(undefined)

interface VrpAssistantProviderProps {
  children: ReactNode
}

export function VrpAssistantProvider({ children }: VrpAssistantProviderProps) {
  const [isProcessing, setIsProcessingState] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [vrpData, setVrpDataState] = useState<Vrp.VrpSyncSolveParams | null>(null)
  const [input, setInput] = useState('')
  const [openAIService] = useState<OpenAIService | null>(null)
  const [onVrpDataUpdate, setOnVrpDataUpdateState] = useState<((data: Vrp.VrpSyncSolveParams) => void) | undefined>()

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = ChatPersistence.loadMessages()
    if (savedMessages.length > 0) {
      setMessages(savedMessages)
    }
  }, [])

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      ChatPersistence.saveMessages(messages)
    }
  }, [messages])

  const setProcessing = (processing: boolean) => {
    setIsProcessingState(processing)
  }

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content: content.trim(),
      createdAt: new Date()
    }
    setMessages(prev => {
      const updatedMessages = [...prev, newMessage]
      return updatedMessages
    })
  }

  const clearMessages = () => {
    setMessages([])
    ChatPersistence.clearMessages()
  }

  const setVrpData = (data: Vrp.VrpSyncSolveParams | null) => {
    setVrpDataState(data)
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

      // Process with OpenAI
      const modificationRequest = {
        currentData: vrpData,
        userRequest: message
      }
      const modifiedData = await aiService.modifyVrpData(modificationRequest)
      
      if (modifiedData?.modifiedData) {
        // Success - we have modified data
        const explanation = modifiedData.explanation || 'I\'ve processed your request and modified the VRP data accordingly.'
        addMessage('assistant', explanation)
        
        // Update the VRP data in the editor through the callback
        if (onVrpDataUpdate) {
          try {
            onVrpDataUpdate(modifiedData.modifiedData)
            setVrpData(modifiedData.modifiedData)
            
            // Add a success message with change summary
            if (modifiedData.changes && modifiedData.changes.length > 0) {
              const changesSummary = modifiedData.changes
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
        if (modifiedData.changes && modifiedData.changes.length > 0) {
          console.log('VRP Changes applied:', modifiedData.changes)
        }
      } else {
        addMessage('assistant', 'I wasn\'t able to modify the VRP data based on your request. Could you please try rephrasing or being more specific?')
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

      // Convert CSV to VRP
      const conversionResult = await aiService.convertCsvToVrp(csvContent, filename)

      if (conversionResult?.vrpData) {
        // Success - we have converted VRP data
        const explanation = conversionResult.explanation || 'Successfully converted your CSV file to VRP format.'
        addMessage('assistant', explanation)

        // Update the VRP data in the editor through the callback
        if (onVrpDataUpdate) {
          try {
            onVrpDataUpdate(conversionResult.vrpData)
            setVrpData(conversionResult.vrpData)

            // Add success message with conversion details
            const successMessage = `✅ Converted ${filename} to VRP format (${conversionResult.rowsProcessed} rows processed)`
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
          filename,
          rowsProcessed: conversionResult.rowsProcessed,
          notes: conversionResult.conversionNotes
        })
      } else {
        addMessage('assistant', 'I wasn\'t able to convert your CSV file to VRP format. Please check that it contains latitude and longitude columns.')
      }

    } catch (error) {
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
        addMessage('assistant', `Failed to convert CSV file: ${errorMessage}. Please check your file format and try again.`)
      }
    } finally {
      setProcessing(false)
    }
  }

  const value: VrpAssistantContextType = {
    isProcessing,
    messages,
    vrpData,
    input,
    setProcessing,
    addMessage,
    clearMessages,
    processUserMessage,
    processCsvUpload,
    setVrpData,
    handleInputChange,
    handleSubmit,
    onVrpDataUpdate,
    setOnVrpDataUpdate
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