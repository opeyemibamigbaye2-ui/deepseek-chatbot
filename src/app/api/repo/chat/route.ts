// API Route: /api/repo/chat
// Repo-aware chat: selects relevant context from indexed repo files,
// stuffs it into the system prompt, and streams the response via DeepSeek.

import { NextRequest } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import type { RepoChatRequest } from "@/lib/repo-types";
import { selectContext, buildRepoSystemPrompt } from "@/lib/context-selector";

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

  let body: RepoChatRequest;
  try {
    body = (await request.json()) as RepoChatRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.messages?.length || !body.repoFiles?.length) {
    return Response.json(
      { error: "Messages and repoFiles are required" },
      { status: 400 }
    );
  }

  // Get the last user message as the query for context selection
  const lastUserMsg = [...body.messages].reverse().find((m) => m.role === "user");
  const query = lastUserMsg?.content ?? "";

  // Select relevant context
  const { context, includedFiles } = selectContext(query, body.repoFiles);

  // Build the system prompt
  const repoSysPrompt = buildRepoSystemPrompt(
    body.repoMeta.fullName,
    includedFiles
  );

  // Combine with user's custom system prompt if provided
  const fullSystemPrompt = body.systemPrompt
    ? `${body.systemPrompt}\n\n${repoSysPrompt}`
    : repoSysPrompt;

  // Build messages: system prompt + context + conversation
  const contextBlock = context
    ? `\n\n---\n\n${context}\n\n---\n\nAnswer the user's question using the repository context above.`
    : "";

  try {
    const result = streamText({
      model: deepseek(DEFAULT_MODEL),
      system: fullSystemPrompt,
      messages: body.messages.map((m, i) => ({
        role: m.role as "user" | "assistant",
        // Prepend context to the last user message
        content:
          i === body.messages.length - 1 && m.role === "user"
            ? m.content + contextBlock
            : m.content,
      })),
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Repo chat error:", message);
    return Response.json({ error: `AI service error: ${message}` }, { status: 502 });
  }
}