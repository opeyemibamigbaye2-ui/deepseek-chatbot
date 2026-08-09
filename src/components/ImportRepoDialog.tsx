"use client";

import { useState, useCallback } from "react";
import { FiX, FiLoader, FiGithub } from "react-icons/fi";
import type { RepoMeta, RepoFile, RepoFetchResponse, RepoFetchError } from "@/lib/repo-types";

interface ImportRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (meta: RepoMeta, files: RepoFile[]) => void;
}

export default function ImportRepoDialog({
  isOpen,
  onClose,
  onImport,
}: ImportRepoDialogProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  const handleImport = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setProgress("Fetching repository...");

    try {
      const res = await fetch("/api/repo/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = (await res.json()) as RepoFetchResponse | RepoFetchError;

      if (!data.success) {
        setError(data.error);
        setLoading(false);
        return;
      }

      setProgress(
        `Indexed ${data.meta.indexedFiles} files (${(data.meta.totalChars / 1000).toFixed(0)}K chars)`
      );

      // Short delay so user sees the success message
      await new Promise((r) => setTimeout(r, 600));
      onImport(data.meta, data.files);
      setUrl("");
      setProgress("");
      setLoading(false);
      onClose();
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }, [url, onImport, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !loading) handleImport();
    },
    [onClose, handleImport, loading]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div
          className="w-full max-w-md rounded-2xl shadow-2xl p-6 animate-fade-in"
          style={{
            backgroundColor: "var(--bg-primary)",
            border: `1px solid var(--border-color)`,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Import Repository
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              style={{ color: "var(--text-secondary)" }}
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Input */}
          <div className="mb-4">
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              GitHub Repository URL
            </label>
            <div className="flex items-center gap-2">
              <FiGithub
                size={18}
                style={{ color: "var(--text-tertiary)" }}
                className="flex-shrink-0"
              />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                disabled={loading}
                className="flex-1 px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Progress / Error */}
          {progress && (
            <div
              className="mb-4 px-3 py-2 rounded-lg text-xs flex items-center gap-2"
              style={{
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-secondary)",
              }}
            >
              <FiLoader size={14} className="animate-spin-slow flex-shrink-0" />
              <span>{progress}</span>
            </div>
          )}

          {error && (
            <div
              className="mb-4 px-3 py-2 rounded-lg text-xs"
              style={{
                backgroundColor: "var(--error-bg)",
                color: "var(--error-text)",
                border: `1px solid var(--error-border)`,
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
              style={{
                color: "var(--text-secondary)",
                backgroundColor: "var(--bg-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={loading || !url.trim()}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--accent)" }}
            >
              {loading ? "Importing…" : "Import"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}