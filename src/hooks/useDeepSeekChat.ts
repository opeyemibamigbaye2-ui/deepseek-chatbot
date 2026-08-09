"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { UIMessage } from "ai";
import type { Message } from "@/lib/types";
import { uiMessageToMessage } from "@/lib/types";
import { addMessageToThread } from "@/lib/db";
import { nanoid } from "nanoid";

interface UseDeepSeekChatOptions {
  initialMessages?: Message[];
  systemPrompt?: string;
  threadId?: string;
  onError?: (error: string) => void;
  /**
   * Called when the user sends their first message but no thread exists yet.
   * The callback should create a thread, auto-title it, and return the new
   * thread ID. This enables lazy thread creation (no empty threads).
   */
  onEnsureThread?: (firstMessage: string) => Promise<string>;
  /** If set, the chat uses /api/repo/chat with repo context */
  repoMeta?: import("@/lib/repo-types").RepoMeta;
  repoFiles?: import("@/lib/repo-types").RepoFile[];
}

/** Convert our internal Message to AI SDK UIMessage format */
function messageToUIMessage(m: Message): UIMessage {
  return {
    id: m.id,
    role: m.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: m.content }],
  };
}

export function useDeepSeekChat({
  initialMessages = [],
  systemPrompt,
  threadId,
  onError,
  onEnsureThread,
  repoMeta,
  repoFiles,
}: UseDeepSeekChatOptions = {}) {
  const isRepoThread = !!repoMeta && !!repoFiles;
  // ---- Refs to avoid stale closures in callbacks ----
  const threadIdRef = useRef(threadId);
  threadIdRef.current = threadId;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onEnsureThreadRef = useRef(onEnsureThread);
  onEnsureThreadRef.current = onEnsureThread;

  // Track previous threadId to detect switches
  const prevThreadIdRef = useRef<string | undefined>(threadId);

  // ---- Memoize transport so useChat doesn't reinitialize on every render ----
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: isRepoThread ? "/api/repo/chat" : "/api/chat",
        body: isRepoThread
          ? {
              systemPrompt: systemPrompt ?? "You are a helpful assistant.",
              repoMeta,
              repoFiles,
            }
          : {
              systemPrompt: systemPrompt ?? "You are a helpful assistant.",
            },
      }),
    [systemPrompt, isRepoThread, repoMeta, repoFiles]
  );

  // Convert initial messages once on mount
  const initialUIMessages: UIMessage[] = useMemo(
    () => initialMessages.map(messageToUIMessage),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const {
    messages: aiMessages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    setMessages,
  } = useChat({
    transport,
    messages: initialUIMessages,
    onFinish: async ({ message }) => {
      const currentThreadId = threadIdRef.current;
      if (currentThreadId && message) {
        const msg = uiMessageToMessage(message);
        await addMessageToThread(currentThreadId, msg);
      }
    },
    onError: (err) => {
      onErrorRef.current?.(err.message);
    },
  });

  // ---- Sync messages when the user switches threads ----
  useEffect(() => {
    if (threadId !== prevThreadIdRef.current) {
      prevThreadIdRef.current = threadId;
      if (initialMessages.length > 0) {
        setMessages(initialMessages.map(messageToUIMessage));
      } else {
        setMessages([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  const isStreaming = status === "streaming" || status === "submitted";

  /** Send a user message and get streaming response */
  const handleSendMessage = useCallback(
    async (content: string) => {
      // Lazy thread creation: if no thread exists yet, create one now
      let currentThreadId = threadIdRef.current;
      if (!currentThreadId && onEnsureThreadRef.current) {
        currentThreadId = await onEnsureThreadRef.current(content);
        threadIdRef.current = currentThreadId;
      }

      const userMsg: Message = {
        id: nanoid(),
        role: "user",
        content,
        createdAt: Date.now(),
      };

      if (currentThreadId) {
        await addMessageToThread(currentThreadId, userMsg);
      }

      sendMessage({ text: content });
    },
    [sendMessage]
  );

  /** Regenerate the last assistant response */
  const handleRegenerate = useCallback(() => {
    regenerate();
  }, [regenerate]);

  /** Stop generation */
  const handleCancelGeneration = useCallback(() => {
    stop();
  }, [stop]);

  // Convert AI SDK UIMessage[] to our internal Message[]
  const messages: Message[] = useMemo(
    () => aiMessages.map(uiMessageToMessage),
    [aiMessages]
  );

  return {
    messages,
    sendMessage: handleSendMessage,
    regenerate: handleRegenerate,
    cancelGeneration: handleCancelGeneration,
    isStreaming,
    error: error?.message ?? null,
  };
}