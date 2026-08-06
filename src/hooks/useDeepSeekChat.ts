"use client";

import { useState, useCallback, useRef } from "react";
import { useChat as useVercelChat } from "ai/react";
import type { Message } from "@/lib/types";
import { addMessageToThread, updateMessage } from "@/lib/db";
import { nanoid } from "nanoid";

interface UseDeepSeekChatOptions {
  initialMessages?: Message[];
  systemPrompt?: string;
  threadId?: string;
  onError?: (error: string) => void;
}

export function useDeepSeekChat({
  initialMessages = [],
  systemPrompt,
  threadId,
  onError,
}: UseDeepSeekChatOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Map our Message type to the AI SDK's message type
  const mappedMessages = initialMessages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const {
    messages: aiMessages,
    setMessages,
    append,
    reload,
    stop,
    error,
  } = useVercelChat({
    api: "/api/chat",
    initialMessages: mappedMessages,
    body: {
      systemPrompt: systemPrompt ?? "You are a helpful assistant.",
    },
    onFinish: async (message) => {
      setIsStreaming(false);
      // Persist the assistant message to IndexedDB
      if (threadId && message) {
        const newMsg: Message = {
          id: message.id,
          role: "assistant",
          content: message.content,
          createdAt: Date.now(),
        };
        await addMessageToThread(threadId, newMsg);
      }
    },
    onError: (err) => {
      setIsStreaming(false);
      onError?.(err.message);
    },
  });

  /** Send a user message and get streaming response */
  const sendMessage = useCallback(
    async (content: string) => {
      setIsStreaming(true);
      const userMsg: Message = {
        id: nanoid(),
        role: "user",
        content,
        createdAt: Date.now(),
      };

      // Persist user message
      if (threadId) {
        await addMessageToThread(threadId, userMsg);
      }

      await append({
        role: "user",
        content,
      });
    },
    [append, threadId]
  );

  /** Regenerate the last assistant response */
  const regenerate = useCallback(async () => {
    setIsStreaming(true);
    // Remove the last assistant message if any
    const msgs = [...aiMessages];
    if (msgs.length > 0 && msgs[msgs.length - 1].role === "assistant") {
      msgs.pop();
      setMessages(msgs);
    }
    await reload();
  }, [aiMessages, reload, setMessages]);

  /** Stop generation */
  const cancelGeneration = useCallback(() => {
    stop();
    setIsStreaming(false);
  }, [stop]);

  // Convert AI SDK messages to our Message type
  const messages: Message[] = aiMessages.map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    createdAt: Date.now(),
  }));

  return {
    messages,
    sendMessage,
    regenerate,
    cancelGeneration,
    isStreaming,
    error: error?.message ?? null,
  };
}