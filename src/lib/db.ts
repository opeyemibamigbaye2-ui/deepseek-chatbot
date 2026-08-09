// IndexedDB persistence layer using Dexie.js
// Handles CRUD operations for chat threads and application settings.
// Includes migration for old-format messages on read.

import Dexie, { type Table } from "dexie";
import type { Thread, Message, AppSettings } from "./types";
import { DEFAULT_SETTINGS, migrateMessage } from "./types";

/** Extended Dexie database with typed tables */
class ChatDatabase extends Dexie {
  threads!: Table<Thread, string>;
  messages!: Table<Message, string>;
  settings!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super("DeepSeekChatbot");
    this.version(1).stores({
      threads: "id, title, createdAt, updatedAt",
      messages: "id, role, createdAt",
      settings: "key",
    });
  }
}

const db = new ChatDatabase();

/**
 * Load messages for a thread, migrating any old-format records.
 * Old messages may have missing/undefined content or invalid roles;
 * migrateMessage normalizes them or returns null for unrecoverable rows.
 */
async function loadThreadMessages(messageIds: string[]): Promise<Message[]> {
  if (messageIds.length === 0) return [];

  const rawMessages = await db.messages.where("id").anyOf(messageIds).toArray();

  const migrated: Message[] = [];
  for (const raw of rawMessages) {
    const msg = migrateMessage(raw as unknown as Record<string, unknown>);
    if (msg) {
      migrated.push(msg);
    }
  }

  migrated.sort((a, b) => a.createdAt - b.createdAt);
  return migrated;
}

/** ---- Thread Operations ---- */

/** Fetch all threads, sorted by most recently updated */
export async function getAllThreads(): Promise<Thread[]> {
  const threads = await db.threads.orderBy("updatedAt").reverse().toArray();
  for (const thread of threads) {
    thread.messages = await loadThreadMessages(thread.messages.map((m) => m.id));
  }
  return threads;
}

/** Get a single thread by ID, with messages */
export async function getThread(id: string): Promise<Thread | undefined> {
  const thread = await db.threads.get(id);
  if (!thread) return undefined;
  thread.messages = await loadThreadMessages(thread.messages.map((m) => m.id));
  return thread;
}

/** Create a new thread */
export async function createThread(thread: Thread): Promise<void> {
  await db.threads.put(thread);
  for (const msg of thread.messages) {
    await db.messages.put(msg);
  }
}

/** Update an existing thread (title, messages, updatedAt) */
export async function updateThread(thread: Thread): Promise<void> {
  await db.threads.put(thread);
  for (const msg of thread.messages) {
    await db.messages.put(msg);
  }
}

/** Add a message to an existing thread */
export async function addMessageToThread(
  threadId: string,
  message: Message
): Promise<void> {
  await db.messages.put(message);
  const thread = await db.threads.get(threadId);
  if (thread) {
    thread.messages.push(message);
    thread.updatedAt = Date.now();
    await db.threads.put(thread);
  }
}

/** Update a specific message within a thread */
export async function updateMessage(
  threadId: string,
  messageId: string,
  content: string
): Promise<void> {
  await db.messages.update(messageId, { content });
  const thread = await db.threads.get(threadId);
  if (thread) {
    const msg = thread.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.content = content;
      thread.updatedAt = Date.now();
      await db.threads.put(thread);
    }
  }
}

/** Delete a thread and all its messages */
export async function deleteThread(id: string): Promise<void> {
  const thread = await db.threads.get(id);
  if (thread) {
    const messageIds = thread.messages.map((m) => m.id);
    await db.messages.bulkDelete(messageIds);
    await db.threads.delete(id);
  }
}

/** Rename a thread */
export async function renameThread(id: string, title: string): Promise<void> {
  await db.threads.update(id, { title, updatedAt: Date.now() });
}

/** ---- Settings Operations ---- */

/** Get a setting by key */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const entry = await db.settings.get(key);
  return (entry?.value as T) ?? fallback;
}

/** Set a setting value */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}

/** Load all app settings, merging with defaults */
export async function loadSettings(): Promise<AppSettings> {
  const systemPrompt = await getSetting(
    "systemPrompt",
    DEFAULT_SETTINGS.systemPrompt
  );
  const theme = await getSetting<"light" | "dark" | "system">(
    "theme",
    DEFAULT_SETTINGS.theme
  );
  const model = await getSetting("model", DEFAULT_SETTINGS.model);
  return { systemPrompt, theme, model };
}