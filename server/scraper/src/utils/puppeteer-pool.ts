import { existsSync } from 'node:fs';
import { platform } from 'node:os';

import type { Browser, Page } from 'puppeteer';

import { withTimeout } from './timeout';

let browserInstance: Browser | null = null;

const LAUNCH_TIMEOUT_MS = 30_000;
const CLOSE_TIMEOUT_MS = 8_000;
const PAGE_CLOSE_TIMEOUT_MS = 5_000;
const PAGE_NEW_TIMEOUT_MS = 10_000;

/**
 * Common Chrome/Chromium executable locations across platforms.
 * Order matters: system Chrome is preferred over bundled Chromium on Linux VPS
 * because the bundled Chromium often lacks required shared libraries.
 */
const LINUX_EXECUTABLES = [
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/snap/bin/chromium',
  '/opt/google/chrome/chrome',
];

const WINDOWS_EXECUTABLES = [
  process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
  process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
];

const MAC_EXECUTABLES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
];

export function findExecutable(): string | undefined {
  // 1. Explicit env override always wins.
  const envCandidates = [process.env.PUPPETEER_EXECUTABLE_PATH, process.env.CHROME_PATH];

  // 2. Platform-specific well-known locations.
  const isWindows = platform() === 'win32';
  const isMac = platform() === 'darwin';
  const platformCandidates = isWindows
    ? WINDOWS_EXECUTABLES
    : isMac
      ? MAC_EXECUTABLES
      : LINUX_EXECUTABLES;

  const candidates = [...envCandidates, ...platformCandidates];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
}

/**
 * Launch args tuned for headless Linux servers (VPS).
 * --no-sandbox is required when running as root (common in containers/PM2).
 * The rest avoid crashes from missing GPU/audio and reduce bot-detection surface.
 */
const HEADLESS_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
  '--single-process',
  '--disable-extensions',
  '--disable-component-extensions-with-background-pages',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows',
  '--disable-ipc-flooding-protection',
  '--disable-client-side-phishing-detection',
  '--disable-default-apps',
  '--disable-hang-monitor',
  '--disable-prompt-on-repost',
  '--disable-sync',
  '--disable-translate',
  '--disable-domain-reliability',
  '--disable-features=AudioServiceOutOfProcess,IsolateOrigins,site-per-process',
  '--metrics-recording-only',
  '--mute-audio',
  '--safebrowsing-disable-auto-update',
  '--password-store=basic',
  '--use-mock-keychain',
  '--window-size=1920,1080',
];

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  const puppeteer = await import('puppeteer');
  const executablePath = findExecutable();

  // If no system Chrome is found, fall back to Puppeteer's bundled Chromium.
  // On Linux VPS this usually needs `npx puppeteer browsers install chrome` +
  // apt deps (see docs/deployment.md). We log clearly so the operator can fix it.
  if (!executablePath) {
    console.warn(
      '[puppeteer] No system Chrome/Chromium detected. ' +
        'Falling back to bundled Chromium. ' +
        'If you see "No usable sandbox" or missing-library errors on Linux, ' +
        'install Chrome and set PUPPETEER_EXECUTABLE_PATH. ' +
        'See docs/deployment.md for VPS setup instructions.',
    );
  }

  try {
    browserInstance = await withTimeout(
      puppeteer.default.launch({
        headless: true,
        executablePath,
        args: HEADLESS_ARGS,
        ignoreDefaultArgs: ['--disable-extensions', '--enable-automation'],
      }),
      LAUNCH_TIMEOUT_MS,
      'puppeteer.launch',
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Surface a actionable error so the operator knows this is an environment issue,
    // not a selector/scrape bug. Common on fresh Linux VPS without Chrome deps.
    throw new Error(
      `[puppeteer] Failed to launch browser: ${msg}. ` +
        'On Linux VPS install Chrome and its deps, then set PUPPETEER_EXECUTABLE_PATH. ' +
        'See docs/deployment.md. Detected executable: ' +
        `${executablePath ?? 'none (using bundled Chromium)'}`,
    );
  }
  return browserInstance;
}

export async function newPage(): Promise<Page> {
  const browser = await getBrowser();
  return withTimeout(browser.newPage(), PAGE_NEW_TIMEOUT_MS, 'browser.newPage');
}

// ponytail: force-kill the Chrome process if graceful close hangs so the run can finish.
export async function closeBrowser(): Promise<void> {
  const instance = browserInstance;
  if (!instance) return;
  browserInstance = null;
  try {
    await withTimeout(instance.close(), CLOSE_TIMEOUT_MS, 'browser.close');
  } catch (err) {
    const pid = instance.process()?.pid;
    if (pid) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // process already gone
      }
    }
    throw err;
  }
}

export async function closePage(page: { close: () => Promise<void> }): Promise<void> {
  try {
    await withTimeout(page.close(), PAGE_CLOSE_TIMEOUT_MS, 'page.close');
  } catch {
    // ponytail: page leak is acceptable; closeBrowser() reclaims it. Never let close hang the run.
  }
}

export async function fetchWithPuppeteer(url: string, waitSelector?: string, timeoutMs: number = 30000): Promise<string> {
  const page = await newPage();
  try {
    // A realistic desktop UA reduces the chance of JobStreet/Cloudflare bot walls.
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    );
    await page.setViewport({ width: 1920, height: 1080 });
    // navigator.webdriver = true is a dead giveaway for bot detection. Strip it.
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    if (waitSelector) {
      try {
        await page.waitForSelector(waitSelector, { timeout: timeoutMs });
      } catch {
        // Selector didn't appear. Capture diagnostics so the operator can tell
        // whether this is a bot-block page, a selector change, or a real empty page.
        const html = await withTimeout(page.content(), timeoutMs, 'page.content');
        const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '').trim();
        const isBlockedPage =
          /just a moment|checking your browser|captcha|access denied|blocked|verify you are human/i.test(
            html,
          );
        throw new Error(
          `[puppeteer] Selector "${waitSelector}" not found within ${timeoutMs}ms. ` +
            `URL: ${url}. Page title: "${title}". ` +
            (isBlockedPage
              ? 'This looks like a bot-detection/block page. Consider rotating UA, adding delays, or using a residential proxy.'
              : 'The page loaded but the expected element is missing. The site markup may have changed.'),
        );
      }
    }
    return await withTimeout(page.content(), timeoutMs, 'page.content');
  } finally {
    await closePage(page);
  }
}
