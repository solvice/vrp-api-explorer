import { ChatMessage } from './VrpAssistantContext'

const STORAGE_KEY = 'vrp-assistant-chat-history'

export class ChatPersistence {
  /**
   * Save chat messages to localStorage
   */
  static saveMessages(messages: ChatMessage[]): void {
    try {
      const serializedMessages = JSON.stringify(messages)
      localStorage.setItem(STORAGE_KEY, serializedMessages)
    } catch (error) {
      console.warn('Failed to save chat messages to localStorage:', error)
    }
  }

  /**
   * Load chat messages from localStorage
   */
  static loadMessages(): ChatMessage[] {
    try {
      const serializedMessages = localStorage.getItem(STORAGE_KEY)
      if (!serializedMessages) {
        return []
      }

      const messages = JSON.parse(serializedMessages)
      
      // Ensure timestamps are properly converted back to Date objects
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    } catch (error) {
      console.warn('Failed to load chat messages from localStorage:', error)
      return []
    }
  }

  /**
   * Clear all chat messages from localStorage
   */
  static clearMessages(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear chat messages from localStorage:', error)
    }
  }

  /**
   * Check if localStorage is available
   */
  static isStorageAvailable(): boolean {
    try {
      const testKey = '__vrp_assistant_storage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }
}