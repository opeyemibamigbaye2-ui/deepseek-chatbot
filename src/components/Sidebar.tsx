"use client";

import { useState, useCallback } from "react";
import { FiPlus, FiTrash2, FiEdit3, FiMessageSquare, FiCheck, FiX } from "react-icons/fi";
import type { Thread } from "@/lib/types";

interface SidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  isLoading: boolean;
  onNewChat: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  onToggleSettings: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  threads,
  activeThreadId,
  isLoading,
  onNewChat,
  onSelectThread,
  onDeleteThread,
  onRenameThread,
  onToggleSettings,
  isOpen,
  onToggle,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const handleStartRename = useCallback((thread: Thread, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(thread.id);
    setEditTitle(thread.title);
  }, []);

  const handleConfirmRename = useCallback(
    (id: string) => {
      const trimmed = editTitle.trim();
      if (trimmed) {
        onRenameThread(id, trimmed);
      }
      setEditingId(null);
    },
    [editTitle, onRenameThread]
  );

  const handleCancelRename = useCallback(() => {
    setEditingId(null);
  }, []);

  const handleDelete = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteThread(id);
    },
    [onDeleteThread]
  );

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden"
        }`}
        style={{
          backgroundColor: "var(--bg-sidebar)",
          borderRight: `1px solid var(--border-color)`,
        }}
      >
        {/* New Chat + Settings */}
        <div className="flex-shrink-0 p-3 flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <FiPlus size={16} />
            <span>New Chat</span>
          </button>
          <button
            onClick={onToggleSettings}
            className="p-2.5 rounded-xl text-sm transition-colors"
            style={{
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-secondary)",
            }}
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div
                className="w-5 h-5 border-2 rounded-full animate-spin-slow"
                style={{
                  borderColor: "var(--border-color)",
                  borderTopColor: "var(--accent)",
                }}
              />
            </div>
          )}

          {!isLoading && threads.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                No conversations yet. Start a new chat!
              </p>
            </div>
          )}

          {threads.map((thread) => (
            <div
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={`group flex items-center gap-2 px-3 py-2.5 my-0.5 rounded-xl cursor-pointer transition-colors ${
                activeThreadId === thread.id ? "font-medium" : ""
              }`}
              style={{
                backgroundColor:
                  activeThreadId === thread.id
                    ? "var(--bg-tertiary)"
                    : "transparent",
                color: "var(--text-primary)",
              }}
            >
              <FiMessageSquare
                size={14}
                className="flex-shrink-0"
                style={{ color: "var(--text-tertiary)" }}
              />

              <div className="flex-1 min-w-0">
                {editingId === thread.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleConfirmRename(thread.id);
                        if (e.key === "Escape") handleCancelRename();
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-1 py-0.5 text-xs rounded border focus:outline-none focus:ring-1"
                      style={{
                        backgroundColor: "var(--bg-primary)",
                        borderColor: "var(--accent)",
                        color: "var(--text-primary)",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmRename(thread.id);
                      }}
                      className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                    >
                      <FiCheck size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCancelRename();
                      }}
                      className="p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                    >
                      <FiX size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="text-xs truncate">{thread.title}</p>
                  </div>
                )}
                {editingId !== thread.id && (
                  <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                    {formatDate(thread.updatedAt)}
                  </p>
                )}
              </div>

              {/* Action buttons - show on hover */}
              {editingId !== thread.id && (
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleStartRename(thread, e)}
                    className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                    title="Rename"
                  >
                    <FiEdit3 size={12} style={{ color: "var(--text-tertiary)" }} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(thread.id, e)}
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                    title="Delete"
                  >
                    <FiTrash2
                      size={12}
                      className="hover:text-red-500 transition-colors"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 p-3 border-t text-center"
          style={{ borderColor: "var(--border-color)" }}
        >
          <p className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
            DeepSeek Chatbot • Powered by DeepSeek V4
          </p>
        </div>
      </aside>
    </>
  );
}