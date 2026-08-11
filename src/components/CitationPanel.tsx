"use client";

import { useMemo } from "react";
import { FiX, FiExternalLink } from "react-icons/fi";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { RepoMeta, RepoFile } from "@/lib/repo-types";

interface CitationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  startLine: number;
  endLine?: number;
  repoFiles?: RepoFile[];
  repoMeta?: RepoMeta;
}

/** Detect language from file extension for syntax highlighting */
function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    py: "python", rb: "ruby", rs: "rust", go: "go",
    java: "java", kt: "kotlin", scala: "scala",
    c: "c", cpp: "cpp", cs: "csharp", h: "c",
    css: "css", scss: "scss", html: "html", svg: "xml",
    json: "json", yaml: "yaml", yml: "yaml", toml: "toml",
    md: "markdown", mdx: "markdown", sql: "sql",
    sh: "bash", bash: "bash", ps1: "powershell",
    graphql: "graphql", proto: "protobuf", prisma: "prisma",
    php: "php", dockerfile: "dockerfile",
  };
  return map[ext] ?? "text";
}

/** Build GitHub blob URL for a file at a line range */
function buildGitHubUrl(
  repoMeta: RepoMeta,
  filePath: string,
  startLine: number,
  endLine?: number
): string {
  const { fullName, defaultBranch } = repoMeta;
  const lineHash = endLine
    ? `#L${startLine}-L${endLine}`
    : `#L${startLine}`;
  return `https://github.com/${fullName}/blob/${defaultBranch}/${filePath}${lineHash}`;
}

export default function CitationPanel({
  isOpen,
  onClose,
  filePath,
  startLine,
  endLine,
  repoFiles,
  repoMeta,
}: CitationPanelProps) {
  // Look up the file content from indexed repo files
  const snippet = useMemo(() => {
    if (!repoFiles) return null;

    const file = repoFiles.find((f) => f.path === filePath);
    if (!file) return null;

    const lines = file.content.split("\n");
    const contextPad = 3;

    const snippetStart = Math.max(0, startLine - 1 - contextPad);
    const snippetEnd = Math.min(
      lines.length,
      (endLine ?? startLine) + contextPad
    );

    const snippetLines = lines.slice(snippetStart, snippetEnd);
    const displayStartLine = snippetStart + 1;

    return {
      code: snippetLines.join("\n"),
      displayStartLine,
      language: detectLanguage(filePath),
    };
  }, [filePath, startLine, endLine, repoFiles]);

  const gitHubUrl = repoMeta
    ? buildGitHubUrl(repoMeta, filePath, startLine, endLine)
    : null;

  if (!isOpen) return null;

  const displayRange = endLine
    ? `${filePath}:${startLine}-${endLine}`
    : `${filePath}:${startLine}`;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-xl z-50 shadow-2xl animate-slide-in overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderLeft: `1px solid var(--border-color)`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-color)",
          }}
        >
          <div className="min-w-0 flex-1 mr-2">
            <h2
              className="text-sm font-mono font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {displayRange}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {gitHubUrl && (
              <a
                href={gitHubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: "var(--accent)" }}
              >
                <FiExternalLink size={14} />
                <span className="hidden sm:inline">View on GitHub</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-secondary)" }}
            >
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {!snippet ? (
            <div className="text-center py-12">
              <p
                className="text-sm mb-3"
                style={{ color: "var(--text-secondary)" }}
              >
                Snippet not available in indexed data.
              </p>
              {gitHubUrl && (
                <a
                  href={gitHubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    color: "var(--accent)",
                  }}
                >
                  <FiExternalLink size={14} />
                  View on GitHub
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-color)" }}>
              <SyntaxHighlighter
                style={oneDark}
                language={snippet.language}
                PreTag="div"
                showLineNumbers
                startingLineNumber={snippet.displayStartLine}
                customStyle={{
                  margin: 0,
                  borderRadius: "0.75rem",
                  padding: "1rem",
                  fontSize: "0.8em",
                }}
                lineNumberStyle={{
                  minWidth: "2.5em",
                  paddingRight: "1em",
                  color: "var(--text-tertiary)",
                  userSelect: "none",
                }}
              >
                {snippet.code}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </>
  );
}