// API Route: /api/repo/chat
// Repo-aware chat: selects relevant context from indexed repo files,
// stuffs it into the system prompt, and streams the response via DeepSeek.
//
// Uses the same message normalization as /api/chat to handle both
// legacy { role, content } and UIMessage { role, parts } formats.

import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { normalizeIncomingMessage } from "@/lib/types";
import { selectContext, buildRepoSystemPrompt } from "@/lib/context-selector";
import type { RepoMeta, RepoFile } from "@/lib/repo-types";

const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
});

const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

export async function POST(request: NextRequest) {
  if (!process.env.DEEPSEEK_API_KEY?.trim()) {
    return Response.json(
      { error: "DEEPSEEK_API_KEY is not configured." },
      { status: 500 }
    );
  }

  // 1. Parse body as unknown, validate shape manually (same pattern as /api/chat)
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // 2. Validate and normalize messages
  const rawMessages = body.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return Response.json(
      { error: "Messages array is required and must not be empty" },
      { status: 400 }
    );
  }

  const normalized = rawMessages
    .map((m) =>
      normalizeIncomingMessage(m as Parameters<typeof normalizeIncomingMessage>[0])
    )
    .filter((m): m is NonNullable<typeof m> => m !== null);

  if (normalized.length === 0) {
    return Response.json(
      { error: "No valid messages after normalization" },
      { status: 400 }
    );
  }

  // 3. Extract repo metadata and files from the body
  const repoMeta = body.repoMeta as RepoMeta | undefined;
  const repoFiles = body.repoFiles as RepoFile[] | undefined;

  if (!repoMeta || !repoFiles || repoFiles.length === 0) {
    return Response.json(
      { error: "repoMeta and repoFiles are required for repo-aware chat" },
      { status: 400 }
    );
  }

  // 4. Get the last user message as the query for context selection
  const lastUserMsg = [...normalized].reverse().find((m) => m.role === "user");
  const query = lastUserMsg?.content ?? "";

  // 5. Select relevant context
  const { context, includedFiles } = selectContext(query, repoFiles);

  // 6. Build the system prompt
  const repoSysPrompt = buildRepoSystemPrompt(repoMeta.fullName, includedFiles);

  const customSystemPrompt =
    typeof body.systemPrompt === "string" ? body.systemPrompt.trim() : undefined;

  const fullSystemPrompt = customSystemPrompt
    ? `${customSystemPrompt}\n\n${repoSysPrompt}`
    : repoSysPrompt;

  // 7. Prepend context to the last user message
  const contextBlock = context
    ? `\n\n---\n\n${context}\n\n---\n\nAnswer the user's question using the repository context above.`
    : "";

  const messagesWithContext = normalized.map((m, i) => ({
    role: m.role,
    content:
      i === normalized.length - 1 && m.role === "user"
        ? m.content + contextBlock
        : m.content,
  }));

  // 8. Call the AI model with streaming
  try {
    const result = streamText({
      model: deepseek(DEFAULT_MODEL),
      system: fullSystemPrompt,
      messages: messagesWithContext,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Repo chat error:", message);
    return Response.json(
      { error: `AI service error: ${message}` },
      { status: 502 }
    );
  }
}