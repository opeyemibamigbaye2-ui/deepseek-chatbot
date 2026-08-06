"use client";

import { useState, useEffect, useCallback } from "react";
import type { AppSettings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { loadSettings, setSetting } from "@/lib/db";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from IndexedDB on mount
  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setIsLoaded(true);
    });
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isLoaded) return;
    const root = document.documentElement;
    if (settings.theme === "dark") {
      root.classList.add("dark");
    } else if (settings.theme === "light") {
      root.classList.remove("dark");
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [settings.theme, isLoaded]);

  /** Update a single setting */
  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      await setSetting(key, value);
    },
    []
  );

  /** Toggle dark mode */
  const toggleTheme = useCallback(async () => {
    const next = settings.theme === "dark" ? "light" : "dark";
    await updateSetting("theme", next);
  }, [settings.theme, updateSetting]);

  return {
    settings,
    isLoaded,
    updateSetting,
    toggleTheme,
  };
}