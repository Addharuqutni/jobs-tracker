import { api } from './api';
import { ApiClientError, getUserMessage } from './errors';
import {
  getActiveRunId,
  ingestRunResult,
  onActiveRunIdChange,
  setActiveRunId,
} from './scraperIngest';
import type { ScraperEnqueueResponse, ScraperRunParams, ScraperRunResponse } from '../types';

const POLL_MS = 3000;

export interface ScraperRunSnapshot {
  run: ScraperRunResponse | null;
  runId: string | null;
  isActive: boolean;
  loading: boolean;
  error: string | null;
}

const IDLE: ScraperRunSnapshot = {
  run: null,
  runId: null,
  isActive: false,
  loading: false,
  error: null,
};

const listeners = new Set<() => void>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let fetchGen = 0;
let bootstrapped = false;

let snapshot: ScraperRunSnapshot = {
  ...IDLE,
  runId: getActiveRunId(),
};

function isRunActive(runId: string | null, run: ScraperRunResponse | null): boolean {
  return Boolean(runId) && (run?.status === 'queued' || run?.status === 'running');
}

function isTerminal(status: ScraperRunResponse['status']): boolean {
  return status === 'failed' || status === 'succeeded';
}

function isExpiredError(err: unknown, message: string): boolean {
  if (err instanceof ApiClientError && err.code === 'NOT_FOUND') return true;
  return /not found|expired/i.test(message);
}

function emit(): void {
  for (const listener of listeners) listener();
}

function setState(partial: Partial<ScraperRunSnapshot>): void {
  const next = { ...snapshot, ...partial };
  next.isActive = isRunActive(next.runId, next.run);
  snapshot = next;
  syncPoll();
  emit();
}

function stopPoll(): void {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

function syncPoll(): void {
  if (!snapshot.isActive) {
    stopPoll();
    return;
  }
  if (!pollTimer) {
    pollTimer = setInterval(() => {
      void fetchRun();
    }, POLL_MS);
  }
}

function clearActiveTracking(partial: Partial<ScraperRunSnapshot> = {}): void {
  setState({ runId: null, ...partial });
  setActiveRunId(null);
}

async function fetchRun(): Promise<void> {
  const runId = snapshot.runId;
  if (!runId) return;

  const gen = ++fetchGen;
  try {
    const data = await api.getScraperRun(runId);
    if (gen !== fetchGen) return;

    if (isTerminal(data.status)) {
      clearActiveTracking({ run: data, error: data.errorMessage ?? null });
      if (data.status === 'succeeded' && data.result) {
        await ingestRunResult(data.runId, data.result);
      }
      return;
    }

    setState({ run: data, error: null });
  } catch (err) {
    if (gen !== fetchGen) return;
    const message = getUserMessage(err);
    if (isExpiredError(err, message)) {
      clearActiveTracking({ run: null, error: message });
      return;
    }
    setState({ error: message });
  }
}

function ensureBootstrapped(): void {
  if (bootstrapped) return;
  bootstrapped = true;

  onActiveRunIdChange((id) => {
    if (id === snapshot.runId) return;
    if (!id) {
      setState({ runId: null });
      return;
    }
    setState({ runId: id });
    void fetchRun();
  });

  if (snapshot.runId) void fetchRun();
}

export function subscribe(listener: () => void): () => void {
  ensureBootstrapped();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): ScraperRunSnapshot {
  ensureBootstrapped();
  return snapshot;
}

export function getServerSnapshot(): ScraperRunSnapshot {
  return IDLE;
}

export async function start(
  params?: ScraperRunParams,
): Promise<ScraperEnqueueResponse | null> {
  ensureBootstrapped();
  setState({ loading: true, error: null });
  try {
    const enqueued = await api.runScraper(params);
    const run: ScraperRunResponse = {
      runId: enqueued.runId,
      status: enqueued.status,
      position: enqueued.position,
      queueLength: enqueued.queueLength,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      errorMessage: null,
      result: null,
    };
    // state before sessionStorage so onActiveRunIdChange sees matching runId
    setState({ run, runId: enqueued.runId, loading: false, error: null });
    setActiveRunId(enqueued.runId);
    return enqueued;
  } catch (err) {
    setState({ loading: false, error: getUserMessage(err) });
    throw err;
  }
}

export function clear(): void {
  ensureBootstrapped();
  clearActiveTracking({ run: null, error: null });
}

export function refetch(): void {
  ensureBootstrapped();
  void fetchRun();
}
