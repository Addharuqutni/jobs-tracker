import { existsSync } from 'node:fs';

import type { Browser, Page } from 'puppeteer';

import { withTimeout } from './timeout';

let browserInstance: Browser | null = null;

const LAUNCH_TIMEOUT_MS = 30_000;
const CLOSE_TIMEOUT_MS = 8_000;
const PAGE_CLOSE_TIMEOUT_MS = 5_000;
const PAGE_NEW_TIMEOUT_MS = 10_000;

function findExecutable(): string | undefined {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    process.env.PROGRAMFILES && `${process.env.PROGRAMFILES}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env['PROGRAMFILES(X86)'] && `${process.env['PROGRAMFILES(X86)']}\\Google\\Chrome\\Application\\chrome.exe`,
    process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
  ];
  return candidates.find((candidate): candidate is string => Boolean(candidate && existsSync(candidate)));
}

export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
  const puppeteer = await import('puppeteer');
  browserInstance = await withTimeout(
    puppeteer.default.launch({
      headless: true,
      executablePath: findExecutable(),
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }),
    LAUNCH_TIMEOUT_MS,
    'puppeteer.launch',
  );
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
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    if (waitSelector) {
      await page.waitForSelector(waitSelector, { timeout: timeoutMs });
    }
    return await withTimeout(page.content(), timeoutMs, 'page.content');
  } finally {
    await closePage(page);
  }
}
