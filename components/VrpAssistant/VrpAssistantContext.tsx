'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface VrpAssistantContextType {
  isOpen: boolean
  isProcessing: boolean
  togglePane: () => void
  setProcessing: (processing: boolean) => void
}

const VrpAssistantContext = createContext<VrpAssistantContextType | undefined>(undefined)

interface VrpAssistantProviderProps {
  children: ReactNode
}

export function VrpAssistantProvider({ children }: VrpAssistantProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isProcessing, setIsProcessingState] = useState(false)

  const togglePane = () => {
    setIsOpen(prev => !prev)
  }

  const setProcessing = (processing: boolean) => {
    setIsProcessingState(processing)
  }

  const value: VrpAssistantContextType = {
    isOpen,
    isProcessing,
    togglePane,
    setProcessing
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