// Core type definitions for the DeepSeek Chatbot application
import type { UIMessage } from "ai";

/** A single message in a conversation (our internal representation) */
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number; // epoch timestamp
}

/** A conversation thread */
export interface Thread {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  createdAt: number; // epoch timestamp
  updatedAt: number; // epoch timestamp
  /** Thread type — "default" for normal chat, "repo" for repo-aware */
  type?: "default" | "repo";
  /** Repository metadata (only present for repo threads) */
  repoMeta?: import("./repo-types").RepoMeta;
  /** Indexed repo files (only present for repo threads, stored separately in IDB) */
  repoFiles?: import("./repo-types").RepoFile[];
}

/** Settings persisted across sessions */
export interface AppSettings {
  systemPrompt: string;
  theme: "light" | "dark" | "system";
  model: string;
}

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  systemPrompt:
    "You are a helpful, friendly AI assistant. Answer questions accurately and concisely.",
  theme: "system",
  model: "deepseek-chat",
};

// ---- API types ----

/**
 * A message as it may arrive at the API route.
 * Supports both the legacy { role, content } format AND the
 * UIMessage-style { role, parts } format sent by DefaultChatTransport.
 */
export type IncomingMessage =
  | { role: string; content?: string; parts?: never }
  | { role: string; content?: never; parts?: Array<{ type: string; text?: string }> };

/** API request body for /api/chat */
export interface ChatRequest {
  messages: IncomingMessage[];
  model?: string;
  systemPrompt?: string;
}

/** API error response */
export interface APIError {
  error: string;
  code?: string;
}

// ---- Conversion helpers ----

/** Allowed roles for model messages */
const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);

/**
 * Normalize an incoming message (any format) into the shape that
 * streamText() expects: { role: "user" | "assistant", content: string }.
 * Returns null if the message cannot be normalized (invalid role, no text).
 */
export function normalizeIncomingMessage(
  msg: IncomingMessage
): { role: "user" | "assistant"; content: string } | null {
  // Validate role
  if (!msg.role || !ALLOWED_ROLES.has(msg.role)) {
    return null;
  }
  const role = msg.role as "user" | "assistant" | "system";

  // Skip system messages — they're handled via the `system` param
  if (role === "system") return null;

  // Extract text content from either format
  let content = "";

  if (msg.parts && Array.isArray(msg.parts)) {
    // UIMessage format: { role, parts: [{ type: "text", text: "..." }] }
    content = msg.parts
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text!)
      .join("");
  } else if (typeof msg.content === "string") {
    // Legacy format: { role, content: "..." }
    content = msg.content;
  }

  // Reject empty messages
  if (!content.trim()) return null;

  return { role: role as "user" | "assistant", content };
}

/**
 * Extract the concatenated text content from a UIMessage's parts array.
 * AI SDK v7 uses `parts` instead of a flat `content` string.
 */
export function getUIMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/**
 * Convert a UIMessage (AI SDK v7) to our internal Message type.
 */
export function uiMessageToMessage(ui: UIMessage): Message {
  return {
    id: ui.id,
    role: ui.role as "user" | "assistant" | "system",
    content: getUIMessageText(ui),
    createdAt: Date.now(),
  };
}

/**
 * Migrate a message that may be in an old/broken format to our
 * canonical internal Message shape. Used when loading from IndexedDB.
 */
export function migrateMessage(raw: Record<string, unknown>): Message | null {
  const role = raw.role;
  if (typeof role !== "string" || !ALLOWED_ROLES.has(role)) return null;

  let content = "";
  if (typeof raw.content === "string") {
    content = raw.content;
  } else if (Array.isArray(raw.parts)) {
    content = (raw.parts as Array<{ type?: string; text?: string }>)
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text!)
      .join("");
  }

  return {
    id: typeof raw.id === "string" ? raw.id : "",
    role: role as "user" | "assistant" | "system",
    content,
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
  };
}