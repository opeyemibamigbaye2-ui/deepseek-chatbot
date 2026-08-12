"use client";

import { useState, useCallback } from "react";
import { FiCopy, FiCheck, FiRefreshCw } from "react-icons/fi";
import MarkdownRenderer from "./MarkdownRenderer";
import type { Message } from "@/lib/types";
import type { RepoMeta, RepoFile } from "@/lib/repo-types";

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  isLastAssistant?: boolean;
  isStreaming?: boolean;
  /** Indexed repo files for citation lookup */
  repoFiles?: RepoFile[];
  /** Repo metadata for GitHub URL generation */
  repoMeta?: RepoMeta;
  /** Called when a citation badge is clicked */
  onCitationClick?: (
    filePath: string,
    startLine: number,
    endLine?: number
  ) => void;
}

export default function MessageBubble({
  message,
  onRegenerate,
  isLastAssistant = false,
  isStreaming = false,
  repoFiles,
  repoMeta,
  onCitationClick,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4 animate-fade-in`}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? "text-white rounded-br-md"
            : "rounded-bl-md"
        }`}
        style={{
          backgroundColor: isUser ? "var(--user-bubble)" : "var(--assistant-bubble)",
          color: isUser ? "var(--user-text)" : "var(--assistant-text)",
        }}
      >
        {/* User messages: plain text + optional attachment indicator */}
        {isUser && (
          <>
            {/* Show attachment indicator if the message contains [Attached file:] blocks */}
            {message.content.includes("[Attached file:") && (
              <div className="flex items-center gap-1 mb-1.5 text-xs opacity-80">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>+ attached file(s)</span>
              </div>
            )}
            <p className="whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed">
              {message.content}
            </p>
          </>
        )}

        {/* Assistant messages: rendered markdown */}
        {!isUser && (
          <div className="text-sm md:text-base">
            <MarkdownRenderer
              content={message.content}
              repoFiles={repoFiles}
              repoMeta={repoMeta}
              onCitationClick={onCitationClick}
            />
          </div>
        )}

        {/* Action buttons for assistant messages */}
        {!isUser && message.content && !isStreaming && (
          <div className="flex items-center gap-1 mt-2 pt-1 border-t border-black/10 dark:border-white/10">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              style={{ color: "var(--text-secondary)" }}
              title="Copy to clipboard"
            >
              {copied ? <FiCheck size={14} /> : <FiCopy size={14} />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>

            {isLastAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                style={{ color: "var(--text-secondary)" }}
                title="Regenerate response"
              >
                <FiRefreshCw size={14} />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}