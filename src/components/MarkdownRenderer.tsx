"use client";

import { useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import type { RepoMeta, RepoFile } from "@/lib/repo-types";

interface MarkdownRendererProps {
  content: string;
  repoFiles?: RepoFile[];
  repoMeta?: RepoMeta;
  onCitationClick?: (
    filePath: string,
    startLine: number,
    endLine?: number
  ) => void;
}

/** Regex for citation patterns like [src/auth.ts:42] or [src/auth.ts:42-58] */
const CITATION_REGEX = /\[([^\]]+\.\w+):(\d+)(?:-(\d+))?\]/g;

/**
 * Pre-process markdown content: replace citation patterns with HTML spans
 * that bypass the markdown parser entirely. This avoids markdown's link
 * reference parsing from consuming the brackets.
 */
function preprocessCitations(
  raw: string,
  onClickAttr: string
): string {
  return raw.replace(
    CITATION_REGEX,
    (_full, filePath: string, startLine: string, endLine?: string) => {
      const display = endLine
        ? `${filePath}:${startLine}-${endLine}`
        : `${filePath}:${startLine}`;
      // Render as an HTML <span> with data attributes; rehype-raw passes
      // raw HTML through. A custom span component picks these up.
      return `<span class="citation-badge" data-file="${filePath}" data-start="${startLine}" data-end="${endLine ?? ""}" ${onClickAttr}>${display}</span>`;
    }
  );
}

export default function MarkdownRenderer({
  content,
  repoFiles,
  repoMeta,
  onCitationClick,
}: MarkdownRendererProps) {
  const hasRepoContext = !!repoFiles && !!repoMeta && !!onCitationClick;

  const handleCitationClick = useCallback(
    (filePath: string, startLine: number, endLine?: number) => {
      onCitationClick?.(filePath, startLine, endLine);
    },
    [onCitationClick]
  );

  // Pre-process content: replace [file:line] with HTML spans before
  // markdown parsing, so brackets aren't consumed as link references.
  const processedContent = useMemo(() => {
    if (!hasRepoContext) return content;
    return preprocessCitations(content, 'onclick="void(0)"');
  }, [content, hasRepoContext]);

  /** Custom span component — renders citation badges from pre-processed HTML */
  function CitationBadge(props: React.HTMLAttributes<HTMLSpanElement> & { "data-file"?: string; "data-start"?: string; "data-end"?: string }) {
    const filePath = props["data-file"];
    const startLine = props["data-start"] ? parseInt(props["data-start"], 10) : 0;
    const endLine = props["data-end"] ? parseInt(props["data-end"], 10) : undefined;
    const children = props.children;

    if (!filePath || !startLine) {
      return <span {...props}>{children}</span>;
    }

    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleCitationClick(filePath, startLine, endLine || undefined);
        }}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono cursor-pointer align-middle transition-all hover:ring-1 active:scale-95"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--accent)",
          border: `1px solid var(--border-color)`,
        }}
        title={`View ${filePath}, lines ${startLine}${endLine ? `-${endLine}` : ""}`}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        {children}
      </button>
    );
  }

  /** Custom code block renderer with syntax highlighting */
  function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
    const match = /language-(\w+)/.exec(className ?? "");
    const language = match?.[1];
    const code = String(children).replace(/\n$/, "");

    if (!language) {
      return <code className={className}>{children}</code>;
    }

    return (
      <SyntaxHighlighter
        style={oneDark}
        language={language}
        PreTag="div"
        customStyle={{
          borderRadius: "0.75rem",
          padding: "1rem",
          fontSize: "0.85em",
          margin: 0,
        }}
      >
        {code}
      </SyntaxHighlighter>
    );
  }

  const components: Components = {
    // Intercept our pre-processed citation <span> elements
    span: CitationBadge as Components["span"],
    code({ className, children, ...props }) {
      const isBlock = className?.startsWith("language-");
      if (isBlock) {
        return <CodeBlock className={className}>{children}</CodeBlock>;
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    a({ href, children }) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };

  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}