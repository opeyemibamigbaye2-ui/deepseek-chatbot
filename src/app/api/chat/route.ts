// API Route: /api/chat
// Proxies chat requests to DeepSeek's OpenAI-compatible API server-side.
// Never exposes the API key to the client. Streams responses via SSE.
// Uses AI SDK v7 with UIMessage stream format.
//
// Handles both legacy { role, content } and UIMessage { role, parts }
// formats from the client, normalizing them before calling streamText().

import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { normalizeIncomingMessage } from "@/lib/types";

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
      error:
        "DEEPSEEK_API_KEY is not configured. Please add it to your .env.local file.",
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

  // 2. Parse the request body (use unknown first, validate shape manually)
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return Response.json(
      { error: "Messages array is required and must not be empty" },
      { status: 400 }
    );
  }

  // 3. Extract system prompt — AI SDK v7 requires it via the `system`
  //    parameter, NOT as a role:"system" entry inside `messages`.
  const systemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : undefined;

  // 4. Normalize every incoming message to the shape streamText expects.
  //    This handles both legacy { role, content } and UIMessage { role, parts }
  //    formats, filters out system messages, and rejects invalid roles.
  const normalized = rawMessages
    .map((m) => normalizeIncomingMessage(m as Parameters<typeof normalizeIncomingMessage>[0]))
    .filter((m): m is NonNullable<typeof m> => m !== null);

  if (normalized.length === 0) {
    return Response.json(
      { error: "No valid messages after normalization" },
      { status: 400 }
    );
  }

  // 5. Call the AI model with streaming
  try {
    const result = streamText({
      model: deepseek(
        typeof body.model === "string" ? body.model : DEFAULT_MODEL
      ),
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: normalized,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error calling the AI model";
    console.error("DeepSeek API error:", message);

    const status = message.includes("401") || message.includes("403")
      ? 401
      : message.includes("429")
        ? 429
        : 502;

    return Response.json({ error: `AI service error: ${message}` }, { status });
  }
}