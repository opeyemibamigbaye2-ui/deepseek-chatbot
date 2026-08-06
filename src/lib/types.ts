// Core type definitions for the DeepSeek Chatbot application

/** A single message in a conversation */
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
}

/** Settings persisted across sessions */
export interface AppSettings {
  systemPrompt: string;
  theme: "light" | "dark" | "system";
  model: string;
}

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  systemPrompt: "You are a helpful, friendly AI assistant. Answer questions accurately and concisely.",
  theme: "system",
  model: "deepseek-chat",
};

/** API request body for /api/chat */
export interface ChatRequest {
  messages: Pick<Message, "role" | "content">[];
  model?: string;
  systemPrompt?: string;
}

/** API error response */
export interface APIError {
  error: string;
  code?: string;
}