import { Message } from '@/components/ui/chat-message'

const STORAGE_KEY = 'vrp-assistant-chat-history'

export class ChatPersistence {
  /**
   * Save chat messages to localStorage
   */
  static saveMessages(messages: Message[]): void {
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
  static loadMessages(): Message[] {
    try {
      const serializedMessages = localStorage.getItem(STORAGE_KEY)
      if (!serializedMessages) {
        return []
      }

      const messages = JSON.parse(serializedMessages)
      
      // Ensure createdAt dates are properly converted back to Date objects
      return messages.map((msg: Record<string, unknown>) => ({
        ...msg,
        createdAt: msg.createdAt ? new Date(msg.createdAt as string) : undefined
      })) as Message[]
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