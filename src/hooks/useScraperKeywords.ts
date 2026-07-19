import { useCallback, useState } from 'react';

const STORAGE_KEY = 'scraper-keywords';
const MAX_KEYWORDS = 20;

function readFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((k): k is string => typeof k === 'string');
  } catch {
    return [];
  }
}

function writeToStorage(keywords: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keywords));
  } catch {
    // localStorage unavailable (private mode) — in-memory only
  }
}

interface UseScraperKeywordsResult {
  keywords: string[];
  addKeyword: (raw: string) => void;
  removeKeyword: (keyword: string) => void;
  clearKeywords: () => void;
}

export function useScraperKeywords(): UseScraperKeywordsResult {
  const [keywords, setKeywords] = useState<string[]>(readFromStorage);

  const addKeyword = useCallback((raw: string) => {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return;
    setKeywords((prev) => {
      if (prev.some((k) => k === trimmed)) return prev;
      if (prev.length >= MAX_KEYWORDS) return prev;
      const next = [...prev, trimmed];
      writeToStorage(next);
      return next;
    });
  }, []);

  const removeKeyword = useCallback((keyword: string) => {
    setKeywords((prev) => {
      const next = prev.filter((k) => k !== keyword);
      writeToStorage(next);
      return next;
    });
  }, []);

  const clearKeywords = useCallback(() => {
    setKeywords([]);
    writeToStorage([]);
  }, []);

  return { keywords, addKeyword, removeKeyword, clearKeywords };
}
