"use client";

import { useState, useCallback, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import SettingsPanel from "@/components/SettingsPanel";
import ImportRepoDialog from "@/components/ImportRepoDialog";
import { useThreads } from "@/hooks/useThreads";
import { useSettings } from "@/hooks/useSettings";
import { useDeepSeekChat } from "@/hooks/useDeepSeekChat";
import { FiMenu, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { RepoMeta, RepoFile } from "@/lib/repo-types";

const COLLAPSED_STORAGE_KEY = "deepseek-sidebar-collapsed";

export default function HomePage() {
  const { settings, isLoaded, updateSetting, toggleTheme } = useSettings();
  const {
    threads,
    activeThread,
    activeThreadId,
    loadThread,
    newThread,
    newRepoThread,
    removeThread,
    rename,
    autoTitleThread,
    clearActiveThread,
    refreshThreads,
  } = useThreads();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Sync collapsed state from localStorage after mount (client-only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSED_STORAGE_KEY);
      if (stored === "true") setSidebarCollapsed(true);
    } catch { /* ignore */ }
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(COLLAPSED_STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // ---- Lazy thread creation ----
  const handleEnsureThread = useCallback(
    async (firstMessage: string): Promise<string> => {
      const thread = await newThread(settings.systemPrompt);
      await autoTitleThread(thread.id, firstMessage);
      return thread.id;
    },
    [settings.systemPrompt, newThread, autoTitleThread]
  );

  // ---- Repo import ----
  const handleImportRepo = useCallback(
    async (meta: RepoMeta, files: RepoFile[]) => {
      await newRepoThread(settings.systemPrompt, meta, files);
      toast.success(`Imported ${meta.fullName} (${files.length} files)`);
    },
    [settings.systemPrompt, newRepoThread]
  );

  // Determine if the active thread is a repo thread
  const isRepoThread = activeThread?.type === "repo";
  const repoMeta = isRepoThread ? activeThread?.repoMeta : undefined;
  const repoFiles = isRepoThread ? activeThread?.repoFiles : undefined;

  // Initialize chat
  const {
    messages,
    sendMessage,
    regenerate,
    cancelGeneration,
    isStreaming,
    error,
  } = useDeepSeekChat({
    initialMessages: activeThread?.messages ?? [],
    systemPrompt: settings.systemPrompt,
    threadId: activeThreadId ?? undefined,
    onEnsureThread: handleEnsureThread,
    repoMeta,
    repoFiles,
    onError: (err) => {
      toast.error(err);
    },
  });

  // ---- Handlers ----
  const handleNewChat = useCallback(() => {
    clearActiveThread();
    setSidebarOpen(false);
  }, [clearActiveThread]);

  const handleSelectThread = useCallback(
    (id: string) => {
      loadThread(id);
      setSidebarOpen(false);
    },
    [loadThread]
  );

  const handleDeleteThread = useCallback(
    (id: string) => {
      removeThread(id);
      toast.success("Chat deleted");
    },
    [removeThread]
  );

  const handleRenameThread = useCallback(
    (id: string, title: string) => {
      rename(id, title);
    },
    [rename]
  );

  const handleSendMessage = useCallback(
    (content: string) => {
      sendMessage(content);
    },
    [sendMessage]
  );

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "12px",
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            fontSize: "14px",
            border: "1px solid var(--border-color)",
          },
        }}
      />

      <div className="flex h-screen overflow-hidden">
        <Sidebar
          threads={threads}
          activeThreadId={activeThreadId}
          isLoading={!isLoaded}
          onNewChat={handleNewChat}
          onSelectThread={handleSelectThread}
          onDeleteThread={handleDeleteThread}
          onRenameThread={handleRenameThread}
          onToggleSettings={() => setSettingsOpen(true)}
          onImportRepo={() => setImportDialogOpen(true)}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />

        <div className="flex-1 flex flex-col min-w-0">
          <div
            className="flex items-center gap-2 px-3 py-2 border-b"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-color)",
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg"
              style={{ color: "var(--text-secondary)" }}
              title="Open sidebar"
            >
              <FiMenu size={20} />
            </button>

            <button
              onClick={handleToggleCollapse}
              className="hidden md:flex p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: "var(--text-secondary)" }}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <FiChevronRight size={20} />
              ) : (
                <FiChevronLeft size={20} />
              )}
            </button>

            <span
              className="text-sm font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {activeThread?.title ?? "DeepSeek Chat"}
            </span>
          </div>

          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            onRegenerate={regenerate}
            onStopGeneration={cancelGeneration}
            isStreaming={isStreaming}
            error={error}
            threadTitle={activeThread?.title}
            repoFiles={activeThread?.repoFiles}
            repoMeta={activeThread?.repoMeta}
          />
        </div>

        <SettingsPanel
          settings={settings}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onUpdateSetting={updateSetting}
          onToggleTheme={toggleTheme}
        />

        <ImportRepoDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          onImport={handleImportRepo}
        />
      </div>
    </>
  );
}
