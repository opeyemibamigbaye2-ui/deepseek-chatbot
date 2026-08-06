"use client";

import { useState, useCallback, useEffect } from "react";
import { Toaster, toast } from "react-hot-toast";
import Sidebar from "@/components/Sidebar";
import ChatWindow from "@/components/ChatWindow";
import SettingsPanel from "@/components/SettingsPanel";
import { useThreads } from "@/hooks/useThreads";
import { useSettings } from "@/hooks/useSettings";
import { useDeepSeekChat } from "@/hooks/useDeepSeekChat";
import { FiMenu } from "react-icons/fi";

export default function HomePage() {
  const { settings, isLoaded, updateSetting, toggleTheme } = useSettings();
  const {
    threads,
    activeThread,
    activeThreadId,
    loadThread,
    newThread,
    removeThread,
    rename,
    refreshThreads,
  } = useThreads();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Initialize chat once settings are loaded
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
    onError: (err) => {
      toast.error(err);
    },
  });

  // Auto-create a new thread on first load if no threads exist
  useEffect(() => {
    if (!isLoaded) return;
    if (threads.length === 0 && !activeThreadId) {
      newThread(settings.systemPrompt);
    }
  }, [isLoaded, threads.length, activeThreadId, settings.systemPrompt, newThread]);

  const handleNewChat = useCallback(async () => {
    await newThread(settings.systemPrompt);
    setSidebarOpen(false);
  }, [settings.systemPrompt, newThread]);

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
        {/* Sidebar */}
        <Sidebar
          threads={threads}
          activeThreadId={activeThreadId}
          isLoading={!isLoaded}
          onNewChat={handleNewChat}
          onSelectThread={handleSelectThread}
          onDeleteThread={handleDeleteThread}
          onRenameThread={handleRenameThread}
          onToggleSettings={() => setSettingsOpen(true)}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header with menu button */}
          <div
            className="md:hidden flex items-center gap-2 px-3 py-2 border-b"
            style={{
              backgroundColor: "var(--bg-primary)",
              borderColor: "var(--border-color)",
            }}
          >
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg"
              style={{ color: "var(--text-secondary)" }}
            >
              <FiMenu size={20} />
            </button>
            <span
              className="text-sm font-semibold truncate"
              style={{ color: "var(--text-primary)" }}
            >
              {activeThread?.title ?? "DeepSeek Chat"}
            </span>
          </div>

          {/* Chat Window */}
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            onRegenerate={regenerate}
            onStopGeneration={cancelGeneration}
            isStreaming={isStreaming}
            error={error}
            threadTitle={activeThread?.title}
          />
        </div>

        {/* Settings Panel */}
        <SettingsPanel
          settings={settings}
          isOpen={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onUpdateSetting={updateSetting}
          onToggleTheme={toggleTheme}
        />
      </div>
    </>
  );
}
