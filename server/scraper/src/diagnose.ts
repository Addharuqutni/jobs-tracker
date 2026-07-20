/**
 * VPS environment diagnostic for the Puppeteer fallback path.
 *
 * Run with:  npx tsx server/scraper/src/diagnose.ts
 *
 * Use this after deploying to a fresh VPS to verify that Chrome and the
 * required shared libraries are present before the scraper ever runs.
 * The output tells you exactly what to install if something is missing.
 */
import { existsSync } from 'node:fs';
import { platform, arch } from 'node:os';
import { execSync } from 'node:child_process';

import { getBrowser, closeBrowser, findExecutable } from './utils/puppeteer-pool';

function header(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function check(label: string, ok: boolean, detail: string): void {
  const icon = ok ? 'OK' : 'FAIL';
  console.log(`[${icon}] ${label}: ${detail}`);
}

async function main(): Promise<void> {
  header('Platform');
  console.log(`platform: ${platform()} ${arch()}`);
  console.log(`node: ${process.version}`);

  header('Environment variables');
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH ?? process.env.CHROME_PATH;
  check('PUPPETEER_EXECUTABLE_PATH / CHROME_PATH', Boolean(envPath), envPath ?? '(not set)');

  header('Detected Chrome/Chromium');
  const exe = findExecutable();
  check('executable found', Boolean(exe), exe ?? 'none detected');

  if (platform() !== 'win32') {
    header('System package check (Linux/macOS)');
    const commands = [
      'google-chrome --version',
      'google-chrome-stable --version',
      'chromium --version',
      'chromium-browser --version',
    ];
    for (const cmd of commands) {
      try {
        const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        console.log(`[OK]   ${cmd} -> ${out}`);
      } catch {
        console.log(`[MISS] ${cmd}`);
      }
    }

    header('Required shared libraries (ldd)');
    if (exe && existsSync(exe)) {
      try {
        const ldd = execSync(`ldd "${exe}"`, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
        const missing = ldd
          .split('\n')
          .filter((line) => /not found/i.test(line));
        if (missing.length === 0) {
          console.log('[OK]   All shared libraries resolved.');
        } else {
          console.log('[FAIL] Missing shared libraries:');
          for (const line of missing) console.log(`       ${line.trim()}`);
          console.log('\nFix on Debian/Ubuntu:');
          console.log('  sudo apt-get update && sudo apt-get install -y \\');
          console.log('    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \\');
          console.log('    libxcomposite1 libxdamage1 libxrandr2 libgbm1 libpango-1.0-0 \\');
          console.log('    libcairo2 libasound2 libatspi2.0-0');
        }
      } catch (err) {
        console.log(`[WARN] ldd failed: ${err instanceof Error ? err.message : err}`);
      }
    } else {
      console.log('[SKIP] No executable to inspect. Install Chrome first.');
    }
  }

  header('Puppeteer launch test');
  try {
    const browser = await getBrowser();
    const version = await browser.version();
    check('browser launched', true, version);
    await closeBrowser();
  } catch (err) {
    check('browser launched', false, err instanceof Error ? err.message : String(err));
    console.log('\nAction needed: see the error above and docs/deployment.md.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
