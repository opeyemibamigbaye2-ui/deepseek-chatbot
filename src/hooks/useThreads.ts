"use client";

import { useState, useEffect, useCallback } from "react";
import type { Thread, Message } from "@/lib/types";
import {
  getAllThreads,
  getThread,
  createThread,
  deleteThread,
  renameThread,
  addMessageToThread,
} from "@/lib/db";
import { nanoid } from "nanoid";

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Load all threads from IndexedDB */
  const refreshThreads = useCallback(async () => {
    const all = await getAllThreads();
    setThreads(all);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  /** Load a specific thread */
  const loadThread = useCallback(async (id: string) => {
    const thread = await getThread(id);
    setActiveThread(thread ?? null);
    setActiveThreadId(id);
  }, []);

  /** Create a new thread */
  const newThread = useCallback(
    async (systemPrompt: string, initialMessages: Message[] = []) => {
      const thread: Thread = {
        id: nanoid(),
        title: "New Chat",
        messages: initialMessages,
        systemPrompt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await createThread(thread);
      await refreshThreads();
      setActiveThread(thread);
      setActiveThreadId(thread.id);
      return thread;
    },
    [refreshThreads]
  );

  /** Delete a thread */
  const removeThread = useCallback(
    async (id: string) => {
      await deleteThread(id);
      if (activeThreadId === id) {
        setActiveThread(null);
        setActiveThreadId(null);
      }
      await refreshThreads();
    },
    [activeThreadId, refreshThreads]
  );

  /** Rename a thread */
  const rename = useCallback(
    async (id: string, title: string) => {
      await renameThread(id, title);
      await refreshThreads();
      if (activeThreadId === id && activeThread) {
        setActiveThread({ ...activeThread, title });
      }
    },
    [activeThreadId, activeThread, refreshThreads]
  );

  /** Add a message to the active thread (used by chat) */
  const addMessage = useCallback(
    async (message: Message) => {
      if (!activeThreadId) return;
      await addMessageToThread(activeThreadId, message);
    },
    [activeThreadId]
  );

  return {
    threads,
    activeThread,
    activeThreadId,
    isLoading,
    loadThread,
    newThread,
    removeThread,
    rename,
    addMessage,
    refreshThreads,
  };
}