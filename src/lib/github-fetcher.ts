// GitHub REST API integration for fetching public repository contents.
// No auth required for public repos (60 req/hr rate limit without token).

import type { RepoFile, RepoMeta } from "./repo-types";
import {
  SOURCE_EXTENSIONS,
  ALWAYS_INCLUDE_FILES,
  EXCLUDE_PATTERNS,
  BINARY_EXTENSIONS,
  MAX_FILE_CHARS,
} from "./repo-types";

/** Parse a GitHub URL into owner/repo */
export function parseGitHubUrl(
  url: string
): { owner: string; repo: string } | null {
  const trimmed = url.trim().replace(/\/$/, "").replace(/\.git$/, "");
  const match = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

interface GitHubContentItem {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url: string | null;
  size: number;
}

/** Fetch the default branch for a repo */
async function getDefaultBranch(
  owner: string,
  repo: string
): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Repository not found");
    if (res.status === 403) throw new Error("GitHub API rate limit exceeded. Try again later.");
    throw new Error(`GitHub API error: ${res.status}`);
  }
  const data = (await res.json()) as { default_branch: string };
  return data.default_branch;
}

/** Recursively list all files in a repo via the GitHub tree API */
async function listRepoFiles(
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubContentItem[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers: { Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) {
    throw new Error(`Failed to list repo contents: ${res.status}`);
  }
  const data = (await res.json()) as {
    tree: Array<{
      path: string;
      type: "blob" | "tree";
      size?: number;
    }>;
  };

  return data.tree
    .filter((item) => item.type === "blob")
    .map((item) => ({
      name: item.path.split("/").pop() ?? item.path,
      path: item.path,
      type: "file" as const,
      download_url: null, // filled later
      size: item.size ?? 0,
    }));
}

/** Check if a file should be included based on path and extension */
export function shouldIncludeFile(filePath: string): boolean {
  // Exclude by directory pattern
  for (const pattern of EXCLUDE_PATTERNS) {
    if (filePath.startsWith(pattern) || filePath.includes(`/${pattern}`)) {
      return false;
    }
  }

  const fileName = filePath.split("/").pop() ?? filePath;
  const ext = fileName.includes(".")
    ? "." + fileName.split(".").pop()?.toLowerCase()
    : "";

  // Always include certain files
  if (ALWAYS_INCLUDE_FILES.has(fileName)) return true;

  // Exclude binary extensions
  if (BINARY_EXTENSIONS.has(ext as typeof ext)) return false;

  // Exclude lockfiles
  if (fileName === "package-lock.json" || fileName === "yarn.lock" ||
      fileName === "pnpm-lock.yaml" || fileName === "Gemfile.lock" ||
      fileName === "Cargo.lock" || fileName === "poetry.lock") {
    return false;
  }

  // Exclude minified files
  if (fileName.includes(".min.")) return false;

  // Include recognized source extensions
  if (SOURCE_EXTENSIONS.has(ext)) return true;

  // Exclude everything else
  return false;
}

/** Fetch the content of a single file from GitHub */
async function fetchFileContent(
  owner: string,
  repo: string,
  filePath: string
): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filePath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > MAX_FILE_CHARS) return null;
    return text;
  } catch {
    return null;
  }
}

/** Main entry point: fetch and filter a GitHub repo */
export async function fetchGitHubRepo(
  url: string,
  onProgress?: (message: string) => void
): Promise<{ meta: RepoMeta; files: RepoFile[] }> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) throw new Error("Invalid GitHub URL. Expected format: https://github.com/owner/repo");

  const { owner, repo } = parsed;
  const fullName = `${owner}/${repo}`;

  onProgress?.(`Fetching default branch for ${fullName}...`);
  const defaultBranch = await getDefaultBranch(owner, repo);

  onProgress?.(`Listing files in ${fullName} (branch: ${defaultBranch})...`);
  const allItems = await listRepoFiles(owner, repo, defaultBranch);

  const filtered = allItems.filter((item) => shouldIncludeFile(item.path));
  onProgress?.(`Found ${allItems.length} files, ${filtered.length} after filtering.`);

  // Fetch file contents (with concurrency limit to avoid rate limits)
  const files: RepoFile[] = [];
  const CONCURRENCY = 5;
  const chunks: GitHubContentItem[][] = [];
  for (let i = 0; i < filtered.length; i += CONCURRENCY) {
    chunks.push(filtered.slice(i, i + CONCURRENCY));
  }

  let fetched = 0;
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (item) => {
        const content = await fetchFileContent(owner, repo, item.path);
        return { item, content };
      })
    );

    for (const { item, content } of results) {
      if (content !== null) {
        const lines = content.split("\n");
        files.push({
          path: item.path,
          content,
          lineCount: lines.length,
          charCount: content.length,
        });
      }
      fetched++;
    }
    onProgress?.(`Fetched ${fetched}/${filtered.length} files...`);
  }

  const totalChars = files.reduce((sum, f) => sum + f.charCount, 0);

  return {
    meta: {
      source: url,
      fullName,
      defaultBranch,
      totalFiles: allItems.length,
      indexedFiles: files.length,
      totalChars,
      fetchedAt: Date.now(),
    },
    files,
  };
}