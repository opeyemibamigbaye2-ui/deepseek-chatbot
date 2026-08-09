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

  /**
   * Auto-generate a thread title from the first user message.
   * Truncates to ~40 characters and appends "…" if needed.
   */
  const autoTitleThread = useCallback(
    async (threadId: string, firstMessage: string) => {
      const cleaned = firstMessage.trim().replace(/\n/g, " ");
      const title = cleaned.length > 40 ? cleaned.slice(0, 40) + "…" : cleaned;
      await renameThread(threadId, title);
      await refreshThreads();
      if (activeThreadId === threadId && activeThread) {
        setActiveThread({ ...activeThread, title });
      }
    },
    [activeThreadId, activeThread, refreshThreads]
  );

  /** Clear the active thread (used for "New Chat" without creating a thread) */
  const clearActiveThread = useCallback(() => {
    setActiveThread(null);
    setActiveThreadId(null);
  }, []);

  /** Create a new repo-aware thread */
  const newRepoThread = useCallback(
    async (
      systemPrompt: string,
      repoMeta: import("@/lib/repo-types").RepoMeta,
      repoFiles: import("@/lib/repo-types").RepoFile[]
    ) => {
      const thread: Thread = {
        id: nanoid(),
        title: `Repo: ${repoMeta.fullName}`,
        messages: [],
        systemPrompt,
        type: "repo",
        repoMeta,
        repoFiles,
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

  return {
    threads,
    activeThread,
    activeThreadId,
    isLoading,
    loadThread,
    newThread,
    newRepoThread,
    removeThread,
    rename,
    addMessage,
    autoTitleThread,
    clearActiveThread,
    refreshThreads,
  };
}