"use client"

import { cn } from "@/lib/utils"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt?: Date
  toolInvocations?: Array<{
    state: "call" | "result"
    toolCallId: string
    toolName: string
    args: any
    result?: any
  }>
  parts?: Array<any>
}

export interface ChatMessageProps extends Message {
  showTimeStamp?: boolean
  actions?: React.ReactNode
}

export function ChatMessage({
  role,
  content,
  showTimeStamp,
  createdAt,
  actions,
}: ChatMessageProps) {
  const isUser = role === "user"

  return (
    <div
      className={cn(
        "group relative flex gap-3 p-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%]",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {showTimeStamp && createdAt && (
          <span className="text-xs text-muted-foreground">
            {createdAt.toLocaleTimeString()}
          </span>
        )}
        {actions && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
