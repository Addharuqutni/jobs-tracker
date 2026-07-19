import { useCallback, useState } from 'react';
import type { JobSource } from '../types';

const STORAGE_KEY = 'scraper-sources';

function readFromStorage(): JobSource[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s): s is JobSource => typeof s === 'string');
  } catch {
    return [];
  }
}

function writeToStorage(sources: JobSource[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
  } catch {
    // localStorage unavailable
  }
}

interface UseScraperSourcesResult {
  selectedSources: JobSource[];
  toggleSource: (source: JobSource) => void;
  clearSources: () => void;
}

export function useScraperSources(): UseScraperSourcesResult {
  const [selectedSources, setSelectedSources] = useState<JobSource[]>(readFromStorage);

  const toggleSource = useCallback((source: JobSource) => {
    setSelectedSources((prev) => {
      const next = prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source];
      writeToStorage(next);
      return next;
    });
  }, []);

  const clearSources = useCallback(() => {
    setSelectedSources([]);
    writeToStorage([]);
  }, []);

  return { selectedSources, toggleSource, clearSources };
}
