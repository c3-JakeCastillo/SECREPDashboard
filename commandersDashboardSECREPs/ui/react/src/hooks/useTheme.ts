/*
 * Copyright 2009-2026 C3 AI (www.c3.ai). All Rights Reserved.
 */
import { useEffect, useState } from 'react';

export type ThemeType = 'light' | 'dark';

const STORAGE_KEY = 'ui-theme';

/**
 * Theme hook: toggles `dark` on <html> and persists preference.
 * Styling uses C3 tokens + shadcn CSS variables (no Kendo stylesheets).
 */
export const useTheme = (): { currentTheme: ThemeType; toggleTheme: () => void } => {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('light');

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('dark');

    const stored = localStorage.getItem(STORAGE_KEY) as ThemeType | null;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    let theme: ThemeType = 'light';
    if (stored === 'dark' || stored === 'light') {
      theme = stored;
    } else if (prefersDark) {
      theme = 'dark';
    }

    if (theme === 'dark') {
      html.classList.add('dark');
    }
    setCurrentTheme(theme);
  }, []);

  const toggleTheme = (): void => {
    const html = document.documentElement;
    const next: ThemeType = currentTheme === 'light' ? 'dark' : 'light';

    setCurrentTheme(next);
    html.classList.toggle('dark', next === 'dark');
    localStorage.setItem(STORAGE_KEY, next);
    localStorage.setItem('darkMode', next === 'dark' ? 'true' : 'false');

    document.dispatchEvent(new CustomEvent('c3-theme-changed', { detail: { theme: next } }));
  };

  return { currentTheme, toggleTheme };
};
