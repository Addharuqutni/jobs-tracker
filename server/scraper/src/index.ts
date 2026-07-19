export { Orchestrator } from './core/orchestrator';
export { startScheduler } from './core/scheduler';
export { dedupEngine } from './core/dedup';
export { orchestrator } from './runtime';

import { pathToFileURL } from 'node:url';

import { orchestrator } from './runtime';
import { startScheduler } from './core/scheduler';

function parseArgs(): {
  sources?: string[];
  keywords?: string[];
  engine?: 'native' | 'hybrid';
  pythonTool?: 'auto' | 'beautifulsoup' | 'scrapy' | 'selenium' | 'playwright';
  once: boolean;
  cron: boolean;
} {
  const args = process.argv.slice(2);
  let sources: string[] | undefined;
  let keywords: string[] | undefined;
  let once = false;
  let cron = false;
  let engine: 'native' | 'hybrid' | undefined;
  let pythonTool: 'auto' | 'beautifulsoup' | 'scrapy' | 'selenium' | 'playwright' | undefined;

  for (const arg of args) {
    if (arg === '--once') once = true;
    else if (arg === '--cron') cron = true;
    else if (arg.startsWith('--source=')) sources = arg.slice(9).split(',').filter(Boolean);
    else if (arg.startsWith('--keyword=')) keywords = arg.slice(10).split(',').filter(Boolean);
    else if (arg === '--engine=native' || arg === '--engine=hybrid')
      engine = arg.slice(9) as 'native' | 'hybrid';
    else if (arg.startsWith('--python-tool=')) {
      const candidate = arg.slice(14);
      if (['auto', 'beautifulsoup', 'scrapy', 'selenium', 'playwright'].includes(candidate)) {
        pythonTool = candidate as typeof pythonTool;
      }
    }
  }

  return { sources, keywords, engine, pythonTool, once, cron };
}

async function main(): Promise<void> {
  const { sources, keywords, engine, pythonTool, once, cron } = parseArgs();
  if (once) {
    console.log('[cli] Running scraper once...');
    await orchestrator.run(sources, keywords, { engine, pythonTool });
  } else if (cron) {
    startScheduler();
  } else {
    console.log('[cli] Running scraper once (default mode)...');
    await orchestrator.run(sources, keywords, { engine, pythonTool });
  }
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  main().catch((err: unknown) => {
    console.error('[cli] Fatal error:', err);
    process.exit(1);
  });
}
