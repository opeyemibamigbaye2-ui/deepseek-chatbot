// API Route: /api/repo/fetch
// Fetches and indexes a public GitHub repository.
// Returns filtered file list + metadata for client-side storage.

import { NextRequest } from "next/server";
import { fetchGitHubRepo } from "@/lib/github-fetcher";
import type { RepoFetchResponse, RepoFetchError } from "@/lib/repo-types";

export async function POST(request: NextRequest) {
  let body: { url: string };
  try {
    body = (await request.json()) as { url: string };
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON body" } satisfies RepoFetchError,
      { status: 400 }
    );
  }

  if (!body.url || typeof body.url !== "string") {
    return Response.json(
      { success: false, error: "GitHub URL is required" } satisfies RepoFetchError,
      { status: 400 }
    );
  }

  try {
    const { meta, files } = await fetchGitHubRepo(body.url);

    return Response.json({
      success: true,
      meta,
      files,
    } satisfies RepoFetchResponse);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error fetching repository";

    const code = message.includes("rate limit")
      ? "RATE_LIMITED"
      : message.includes("not found")
        ? "NOT_FOUND"
        : message.includes("Invalid GitHub URL")
          ? "INVALID_URL"
          : undefined;

    console.error("Repo fetch error:", message);

    return Response.json(
      { success: false, error: message, code } satisfies RepoFetchError,
      {
        status: code === "RATE_LIMITED" ? 429 : code === "NOT_FOUND" ? 404 : 500,
      }
    );
  }
}