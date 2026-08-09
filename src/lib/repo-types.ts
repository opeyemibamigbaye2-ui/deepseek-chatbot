// Repo-aware types — extends the existing Thread/Message model

/** Metadata about an indexed repository attached to a thread */
export interface RepoMeta {
  /** GitHub repo URL or "upload://" for uploaded repos */
  source: string;
  /** Owner/repo extracted from the URL (e.g. "facebook/react") */
  fullName: string;
  /** Default branch detected during fetch */
  defaultBranch: string;
  /** Total files discovered (before filtering) */
  totalFiles: number;
  /** Files kept after filtering */
  indexedFiles: number;
  /** Approximate total characters indexed */
  totalChars: number;
  /** When the repo was fetched */
  fetchedAt: number;
}

/** A single indexed file from the repository */
export interface RepoFile {
  /** Relative path from repo root (e.g. "src/lib/auth.ts") */
  path: string;
  /** File content as text */
  content: string;
  /** Number of lines */
  lineCount: number;
  /** Character count */
  charCount: number;
}

/** A chunk of a file for context stuffing */
export interface FileChunk {
  filePath: string;
  /** 1-based start line */
  startLine: number;
  /** 1-based end line */
  endLine: number;
  content: string;
}

/** Response from /api/repo/fetch */
export interface RepoFetchResponse {
  success: true;
  meta: RepoMeta;
  files: RepoFile[];
}

export interface RepoFetchError {
  success: false;
  error: string;
  code?: string;
}

/** Request body for /api/repo/chat */
export interface RepoChatRequest {
  messages: { role: "user" | "assistant"; content: string }[];
  repoMeta: RepoMeta;
  repoFiles: RepoFile[];
  systemPrompt?: string;
}

/** File extensions considered source code, config, or docs */
export const SOURCE_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
  // Web
  ".html", ".css", ".scss", ".less", ".svg",
  // Config
  ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".env.example",
  // Markdown / docs
  ".md", ".mdx", ".txt", ".rst",
  // Backend
  ".py", ".rb", ".php", ".go", ".rs", ".java", ".kt", ".scala",
  ".c", ".h", ".cpp", ".hpp", ".cc", ".cs",
  // Shell / infra
  ".sh", ".bash", ".zsh", ".fish", ".ps1",
  ".dockerfile", ".makefile", ".cmake",
  // Other
  ".graphql", ".proto", ".sql", ".prisma",
  // No extension but common config names
  "",
]);

/** File names that are always included even without a recognized extension */
export const ALWAYS_INCLUDE_FILES = new Set([
  "Dockerfile",
  "Makefile",
  "CMakeLists.txt",
  "README",
  "LICENSE",
  ".env.example",
  ".gitignore",
  "docker-compose.yml",
  "docker-compose.yaml",
]);

/** Directories / patterns to always exclude */
export const EXCLUDE_PATTERNS = [
  "node_modules/",
  ".git/",
  ".next/",
  "dist/",
  "build/",
  "out/",
  ".cache/",
  "__pycache__/",
  ".venv/",
  "venv/",
  "vendor/",
  ".idea/",
  ".vscode/",
  "coverage/",
  ".nyc_output/",
  "target/",        // Rust
  "bin/",
  "obj/",
  ".gradle/",
];

/** Binary / non-text extensions to exclude */
export const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".bmp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp3", ".mp4", ".wav", ".avi", ".mov", ".webm",
  ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".exe", ".dll", ".so", ".dylib", ".wasm",
  ".class", ".jar", ".war",
  ".o", ".a", ".lib",
  ".db", ".sqlite", ".sqlite3",
  ".lock",                           // package-lock.json handled separately
  ".map",                            // source maps
  ".tsbuildinfo",
]);

/** Max file size in characters (skip huge files) */
export const MAX_FILE_CHARS = 200_000;

/** Token budget for context stuffing (DeepSeek V4: ~128K context) */
export const MAX_CONTEXT_TOKENS = 100_000;

/** Rough estimate: 1 token ≈ 4 characters */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}