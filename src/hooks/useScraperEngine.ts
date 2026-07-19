import { useCallback, useState } from 'react';

import type { PythonScraperTool, ScraperEngine } from '../types';

const ENGINE_KEY = 'scraper-engine';
const TOOL_KEY = 'scraper-python-tool';

function readEngine(): ScraperEngine {
  return localStorage.getItem(ENGINE_KEY) === 'native' ? 'native' : 'hybrid';
}

function readTool(): PythonScraperTool {
  const value = localStorage.getItem(TOOL_KEY);
  return value === 'beautifulsoup'
    || value === 'scrapy'
    || value === 'selenium'
    || value === 'playwright'
    ? value
    : 'auto';
}

export function useScraperEngine() {
  const [engine, setEngineState] = useState<ScraperEngine>(readEngine);
  const [pythonTool, setPythonToolState] = useState<PythonScraperTool>(readTool);

  const setEngine = useCallback((value: ScraperEngine) => {
    localStorage.setItem(ENGINE_KEY, value);
    setEngineState(value);
  }, []);

  const setPythonTool = useCallback((value: PythonScraperTool) => {
    localStorage.setItem(TOOL_KEY, value);
    setPythonToolState(value);
  }, []);

  return { engine, pythonTool, setEngine, setPythonTool };
}
