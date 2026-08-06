"use client";

import { useState, useCallback } from "react";
import { FiX, FiSave } from "react-icons/fi";
import type { AppSettings } from "@/lib/types";

interface SettingsPanelProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => void;
  onToggleTheme: () => void;
}

export default function SettingsPanel({
  settings,
  isOpen,
  onClose,
  onUpdateSetting,
  onToggleTheme,
}: SettingsPanelProps) {
  const [systemPrompt, setSystemPrompt] = useState(settings.systemPrompt);

  const handleSave = useCallback(() => {
    onUpdateSetting("systemPrompt", systemPrompt);
    onClose();
  }, [systemPrompt, onUpdateSetting, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 shadow-2xl animate-slide-in overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-primary)",
          borderLeft: `1px solid var(--border-color)`,
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10"
          style={{
            backgroundColor: "var(--bg-primary)",
            borderColor: "var(--border-color)",
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            style={{ color: "var(--text-secondary)" }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-6">
          {/* Theme */}
          <section>
            <h3
              className="text-sm font-semibold mb-3"
              style={{ color: "var(--text-primary)" }}
            >
              Appearance
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Dark Mode
              </span>
              <button
                onClick={onToggleTheme}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  settings.theme === "dark"
                    ? "bg-indigo-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
                    settings.theme === "dark" ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* System Prompt */}
          <section>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              System Prompt
            </h3>
            <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
              This prompt is sent to the AI at the start of every conversation. It
              sets the context and personality.
            </p>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className="w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-colors"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-color)",
                color: "var(--text-primary)",
              }}
              placeholder="You are a helpful assistant..."
            />
          </section>

          {/* Model info */}
          <section>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Model
            </h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Current model: <code className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: "var(--bg-tertiary)" }}>{settings.model}</code>
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
              Set via <code>DEEPSEEK_MODEL</code> environment variable.
            </p>
          </section>

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium transition-colors"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <FiSave size={16} />
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
}