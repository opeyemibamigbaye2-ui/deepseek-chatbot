"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import ChatInput, { type AttachedFile } from "./ChatInput";
import CitationPanel from "./CitationPanel";
import type { Message } from "@/lib/types";
import type { RepoMeta, RepoFile } from "@/lib/repo-types";
import { FiAlertCircle, FiChevronDown } from "react-icons/fi";

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string, attachments?: AttachedFile[]) => void;
  onRegenerate: () => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  error: string | null;
  threadTitle?: string;
  /** Indexed repo files for citation lookup */
  repoFiles?: RepoFile[];
  /** Repo metadata for GitHub URL generation */
  repoMeta?: RepoMeta;
}

interface CitationState {
  filePath: string;
  startLine: number;
  endLine?: number;
}

export default function ChatWindow({
  messages,
  onSendMessage,
  onRegenerate,
  onStopGeneration,
  isStreaming,
  error,
  threadTitle,
  repoFiles,
  repoMeta,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [citation, setCitation] = useState<CitationState | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const isNearBottomRef = useRef(true);

  /**
   * Check scroll position and update button visibility.
   * Uses functional state update to avoid depending on showScrollButton.
   */
  const checkNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threshold = 150;
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    isNearBottomRef.current = nearBottom;
    setShowScrollButton(
      (prev) =>
        !nearBottom && el.scrollHeight > el.clientHeight + 100
    );
  }, []);

  // Scroll event listener (throttled via rAF) — runs once on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          checkNearBottom();
          ticking = false;
        });
        ticking = true;
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    checkNearBottom(); // initial check
    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom when new messages arrive, but ONLY if the user
  // is already near the bottom. If they scrolled up to read, don't yank them.
  useEffect(() => {
    if (scrollRef.current && isNearBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    checkNearBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isStreaming]);

  /** Smooth-scroll to the bottom and hide the button */
  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setShowScrollButton(false);
  }, []);

  const handleSend = useCallback(
    (content: string, attachments?: AttachedFile[]) => {
      onSendMessage(content, attachments);
    },
    [onSendMessage]
  );

  const handleCitationClick = useCallback(
    (filePath: string, startLine: number, endLine?: number) => {
      setCitation({ filePath, startLine, endLine });
    },
    []
  );

  const handleCloseCitation = useCallback(() => {
    setCitation(null);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
        style={{ backgroundColor: "var(--bg-primary)" }}
      >
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-5xl mb-4" style={{ opacity: 0.3 }}>
              💬
            </div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Start a conversation
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Type a message below to chat with DeepSeek AI.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onRegenerate={onRegenerate}
            isLastAssistant={
              !isStreaming &&
              msg.role === "assistant" &&
              idx === messages.length - 1
            }
            isStreaming={false}
            repoFiles={repoFiles}
            repoMeta={repoMeta}
            onCitationClick={handleCitationClick}
          />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex justify-start mb-4">
            <div
              className="rounded-2xl rounded-bl-md px-4 py-3"
              style={{ backgroundColor: "var(--assistant-bubble)" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{ backgroundColor: "var(--accent)" }}
                />
                <div
                  className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{
                    backgroundColor: "var(--accent)",
                    animationDelay: "0.2s",
                  }}
                />
                <div
                  className="w-2 h-2 rounded-full animate-pulse-dot"
                  style={{
                    backgroundColor: "var(--accent)",
                    animationDelay: "0.4s",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div
            className="flex items-start gap-3 mx-auto my-4 p-4 rounded-xl border max-w-lg"
            style={{
              backgroundColor: "var(--error-bg)",
              borderColor: "var(--error-border)",
              color: "var(--error-text)",
            }}
          >
            <FiAlertCircle className="flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="font-semibold text-sm">Something went wrong</p>
              <p className="text-sm mt-1 opacity-90">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollButton && (
        <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2 z-10">
          <button
            onClick={scrollToBottom}
            className="flex items-center justify-center w-10 h-10 rounded-full shadow-lg transition-all duration-200 hover:scale-110 active:scale-95 animate-fade-in"
            style={{
              backgroundColor: "var(--bg-secondary)",
              color: "var(--accent)",
              border: `1px solid var(--border-color)`,
              boxShadow: "var(--shadow-md)",
            }}
            title="Scroll to bottom"
          >
            <FiChevronDown size={20} />
          </button>
        </div>
      )}

      {/* Input bar */}
      <ChatInput
        onSend={handleSend}
        onStop={onStopGeneration}
        isStreaming={isStreaming}
        disabled={false}
      />

      {/* Citation Panel */}
      {citation && (
        <CitationPanel
          isOpen={true}
          onClose={handleCloseCitation}
          filePath={citation.filePath}
          startLine={citation.startLine}
          endLine={citation.endLine}
          repoFiles={repoFiles}
          repoMeta={repoMeta}
        />
      )}
    </div>
  );
}