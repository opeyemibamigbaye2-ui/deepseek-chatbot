"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { FiSend, FiSquare, FiPlus, FiX, FiFile } from "react-icons/fi";
import { toast } from "react-hot-toast";

/** A file attached by the user for context */
export interface AttachedFile {
  name: string;
  content: string;
  size: number;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: AttachedFile[]) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
}

/** Text file extensions accepted by the file picker */
const ACCEPTED_EXTENSIONS = [
  ".txt", ".md", ".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs",
  ".py", ".rb", ".php", ".go", ".rs", ".java", ".kt", ".scala",
  ".c", ".h", ".cpp", ".hpp", ".cs",
  ".json", ".yaml", ".yml", ".toml", ".xml", ".csv",
  ".css", ".scss", ".less", ".html", ".svg",
  ".sql", ".graphql", ".proto", ".prisma",
  ".sh", ".bash", ".zsh", ".ps1",
  ".env", ".gitignore", ".dockerfile", "Dockerfile", "Makefile",
].join(",");

const MAX_FILE_SIZE = 500_000; // 500KB

/** Check if file content looks like text (not binary) */
function isTextContent(content: string): boolean {
  // Binary files typically have null bytes or high concentration of non-printable chars
  const nullByteIndex = content.indexOf("\0");
  if (nullByteIndex !== -1) return false;
  // Sample first 1000 chars: if >30% are non-printable, treat as binary
  const sample = content.slice(0, 1000);
  let nonPrintable = 0;
  for (let i = 0; i < sample.length; i++) {
    const code = sample.charCodeAt(i);
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      nonPrintable++;
    }
  }
  return nonPrintable / sample.length < 0.3;
}

export default function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || disabled || isStreaming) return;
    onSend(trimmed || "(see attached file)", attachments.length > 0 ? attachments : undefined);
    setInput("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, attachments, disabled, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const newAttachments: AttachedFile[] = [];

      for (const file of Array.from(files)) {
        // Size check
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name} is too large (max 500KB)`);
          continue;
        }

        // Read file
        try {
          const content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
          });

          // Binary check
          if (!isTextContent(content)) {
            toast.error(`${file.name} appears to be a binary file and cannot be attached`);
            continue;
          }

          newAttachments.push({
            name: file.name,
            content,
            size: file.size,
          });
        } catch {
          toast.error(`Failed to read ${file.name}`);
        }
      }

      if (newAttachments.length > 0) {
        setAttachments((prev) => [...prev, ...newAttachments]);
      }

      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    []
  );

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  return (
    <div
      className="flex flex-col border-t"
      style={{
        backgroundColor: "var(--bg-primary)",
        borderColor: "var(--border-color)",
      }}
    >
      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {attachments.map((file, idx) => (
            <span
              key={`${file.name}-${idx}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium animate-fade-in"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                border: `1px solid var(--border-color)`,
              }}
            >
              <FiFile size={12} style={{ color: "var(--accent)" }} />
              <span className="max-w-[120px] truncate">{file.name}</span>
              <span style={{ color: "var(--text-tertiary)" }}>
                {formatSize(file.size)}
              </span>
              <button
                onClick={() => removeAttachment(idx)}
                className="ml-0.5 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                style={{ color: "var(--text-tertiary)" }}
              >
                <FiX size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-end gap-2 p-3">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          multiple
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Attach button */}
        <button
          onClick={handleFilePick}
          disabled={disabled || isStreaming}
          className="flex-shrink-0 p-3 rounded-xl transition-colors disabled:opacity-50"
          style={{
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-secondary)",
          }}
          title="Attach file"
        >
          <FiPlus size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Shift+Enter for new line)"
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl border px-4 py-3 text-sm md:text-base focus:outline-none focus:ring-2 disabled:opacity-50 transition-colors"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border-color)",
            color: "var(--text-primary)",
            maxHeight: "200px",
          }}
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="flex-shrink-0 p-3 rounded-xl text-white transition-colors"
            style={{ backgroundColor: "#ef4444" }}
            title="Stop generating"
          >
            <FiSquare size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={disabled || (!input.trim() && attachments.length === 0)}
            className="flex-shrink-0 p-3 rounded-xl text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--accent)" }}
            title="Send message"
          >
            <FiSend size={18} />
          </button>
        )}
      </div>
    </div>
  );
}