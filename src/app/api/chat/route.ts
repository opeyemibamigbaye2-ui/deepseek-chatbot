// API Route: /api/chat
// Proxies chat requests to DeepSeek's OpenAI-compatible API server-side.
// Never exposes the API key to the client. Streams responses via SSE.

import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { ChatRequest } from "@/lib/types";

// Configure the OpenAI-compatible client pointing at DeepSeek's endpoint
const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
});

const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

/** Validate that required environment variables are present */
function validateEnv(): { valid: boolean; error?: string } {
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY.trim() === "") {
    return {
      valid: false,
      error: "DEEPSEEK_API_KEY is not configured. Please add it to your .env.local file.",
    };
  }
  return { valid: true };
}

export async function POST(request: NextRequest) {
  // 1. Validate environment
  const envCheck = validateEnv();
  if (!envCheck.valid) {
    return Response.json({ error: envCheck.error }, { status: 500 });
  }

  // 2. Parse and validate the request body
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json(
      { error: "Messages array is required and must not be empty" },
      { status: 400 }
    );
  }

  // 3. Build the messages array with optional system prompt
  const systemPrompt = body.systemPrompt?.trim();
  const messages = systemPrompt
    ? [{ role: "system" as const, content: systemPrompt }, ...body.messages]
    : body.messages;

  // 4. Call the AI model with streaming
  try {
    const result = streamText({
      model: deepseek(body.model ?? DEFAULT_MODEL),
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    });

    // Return the streaming response
    return result.toDataStreamResponse();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error calling the AI model";
    console.error("DeepSeek API error:", message);

    // Determine appropriate status code
    const status = message.includes("401") || message.includes("403")
      ? 401
      : message.includes("429")
        ? 429
        : 502;

    return Response.json(
      { error: `AI service error: ${message}` },
      { status }
    );
  }
}