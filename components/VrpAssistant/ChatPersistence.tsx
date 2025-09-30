import { Message } from '@/components/ui/chat-message'

const STORAGE_KEY = 'vrp-assistant-chat-history'
const TIMESTAMP_KEY = 'vrp-assistant-chat-timestamp'

export class ChatPersistence {
  /**
   * Save chat messages to localStorage with current date
   */
  static saveMessages(messages: Message[]): void {
    try {
      const serializedMessages = JSON.stringify(messages)
      const today = new Date().toDateString()
      localStorage.setItem(STORAGE_KEY, serializedMessages)
      localStorage.setItem(TIMESTAMP_KEY, today)
    } catch (error) {
      console.warn('Failed to save chat messages to localStorage:', error)
    }
  }

  /**
   * Load chat messages from localStorage, clearing them if they're from a previous day
   */
  static loadMessages(): Message[] {
    try {
      const savedDate = localStorage.getItem(TIMESTAMP_KEY)
      const today = new Date().toDateString()

      // If messages are from a previous day, clear them
      if (savedDate && savedDate !== today) {
        this.clearMessages()
        return []
      }

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
      localStorage.removeItem(TIMESTAMP_KEY)
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