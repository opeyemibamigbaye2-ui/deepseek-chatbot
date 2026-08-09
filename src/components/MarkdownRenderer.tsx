"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
}

/** Regex for citation patterns like [src/auth.ts:42] or [src/auth.ts:42-58] */
const CITATION_REGEX = /\[([^\]]+\.\w+):(\d+)(?:-(\d+))?\]/g;

/** Render a paragraph, replacing citation patterns with styled badges */
function Paragraph({ children }: { children?: React.ReactNode }) {
  // Only process string children
  if (typeof children !== "string") {
    return <p>{children}</p>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = CITATION_REGEX.exec(children)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(children.slice(lastIndex, match.index));
    }

    const filePath = match[1];
    const startLine = match[2];
    const endLine = match[3];
    const display = endLine ? `${filePath}:${startLine}-${endLine}` : `${filePath}:${startLine}`;

    parts.push(
      <span
        key={match.index}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded text-xs font-mono cursor-default align-middle"
        style={{
          backgroundColor: "var(--bg-tertiary)",
          color: "var(--accent)",
          border: `1px solid var(--border-color)`,
        }}
        title={`${filePath}, lines ${startLine}${endLine ? `-${endLine}` : ""}`}
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
        {display}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < children.length) {
    parts.push(children.slice(lastIndex));
  }

  return <p>{parts.length > 0 ? parts : children}</p>;
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
  p: Paragraph,
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

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}