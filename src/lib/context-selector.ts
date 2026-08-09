// Context selection for repo-aware chat.
// Given a user question and indexed repo files, selects the most relevant
// file chunks to stuff into the prompt context, respecting a token budget.

import type { RepoFile, FileChunk } from "./repo-types";
import { estimateTokens, MAX_CONTEXT_TOKENS } from "./repo-types";

/** Chunk a single file into overlapping segments */
function chunkFile(file: RepoFile, maxChunkLines = 200, overlapLines = 20): FileChunk[] {
  const lines = file.content.split("\n");
  const chunks: FileChunk[] = [];

  if (lines.length <= maxChunkLines) {
    chunks.push({
      filePath: file.path,
      startLine: 1,
      endLine: lines.length,
      content: file.content,
    });
    return chunks;
  }

  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + maxChunkLines, lines.length);
    chunks.push({
      filePath: file.path,
      startLine: start + 1,
      endLine: end,
      content: lines.slice(start, end).join("\n"),
    });
    start += maxChunkLines - overlapLines;
  }

  return chunks;
}

/** Score a chunk against a query using simple keyword matching */
function scoreChunk(chunk: FileChunk, query: string): number {
  const queryLower = query.toLowerCase();
  const contentLower = chunk.content.toLowerCase();
  const pathLower = chunk.filePath.toLowerCase();

  let score = 0;

  // Exact phrase matches
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
  for (const word of queryWords) {
    // File path matches are very strong signals
    if (pathLower.includes(word)) score += 10;
    // Content matches
    const regex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    const matches = contentLower.match(regex);
    if (matches) score += matches.length;
  }

  // Boost README and entry-point files
  const fileName = chunk.filePath.split("/").pop()?.toLowerCase() ?? "";
  if (fileName === "readme.md" || fileName === "readme") score += 5;
  if (fileName.includes("index.")) score += 3;
  if (fileName.includes("main.")) score += 3;
  if (fileName.includes("app.")) score += 3;

  return score;
}

/** Format a chunk as a markdown code block for the prompt */
function formatChunk(chunk: FileChunk): string {
  const ext = chunk.filePath.split(".").pop() ?? "";
  return [
    `### ${chunk.filePath}:${chunk.startLine}-${chunk.endLine}`,
    "```" + ext,
    chunk.content,
    "```",
    "",
  ].join("\n");
}

/**
 * Select the most relevant file chunks for a user query, respecting
 * the token budget. Returns formatted context string + list of
 * included file paths for citation metadata.
 */
export function selectContext(
  query: string,
  files: RepoFile[],
  tokenBudget: number = MAX_CONTEXT_TOKENS
): { context: string; includedFiles: string[] } {
  // Chunk all files
  const allChunks: FileChunk[] = [];
  for (const file of files) {
    allChunks.push(...chunkFile(file));
  }

  // Score and sort
  const scored = allChunks
    .map((chunk) => ({ chunk, score: scoreChunk(chunk, query) }))
    .sort((a, b) => b.score - a.score);

  // Greedy selection within token budget
  const selected: FileChunk[] = [];
  let usedTokens = 0;

  // Reserve ~2000 tokens for the system prompt + user message
  const availableBudget = tokenBudget - 2000;

  for (const { chunk } of scored) {
    const formatted = formatChunk(chunk);
    const chunkTokens = estimateTokens(formatted);

    if (usedTokens + chunkTokens > availableBudget) {
      // If this is the first chunk and it doesn't fit alone, include it anyway
      // (truncated) so we at least have something
      if (selected.length === 0) {
        selected.push(chunk);
      }
      break;
    }

    selected.push(chunk);
    usedTokens += chunkTokens;
  }

  // Build context string
  const context = selected.map(formatChunk).join("");

  // Deduplicate file paths
  const includedFiles = [...new Set(selected.map((c) => c.filePath))];

  return { context, includedFiles };
}

/**
 * Build the system prompt for a repo-aware chat thread.
 * Instructs the model to cite file paths and line numbers.
 */
export function buildRepoSystemPrompt(
  repoName: string,
  includedFiles: string[]
): string {
  const fileList = includedFiles.slice(0, 30).join(", ");
  const truncationNote =
    includedFiles.length > 30
      ? ` (and ${includedFiles.length - 30} more files)`
      : "";

  return [
    `You are analyzing the repository "${repoName}".`,
    `The following files were selected as potentially relevant to the user's question: ${fileList}${truncationNote}.`,
    "",
    "RULES:",
    "- Answer questions using ONLY the code provided in the context below.",
    "- Every factual claim about the code MUST cite the specific file and line number(s) it came from.",
    '- Use the format `[filename:line]` for citations (e.g., "The auth logic is in [src/auth.ts:42-58]").',
    "- If the answer cannot be determined from the provided context, say so clearly.",
    "- Do not invent code, file paths, or line numbers that are not in the context.",
    "",
    "REPOSITORY CONTEXT:",
  ].join("\n");
}