import { Orchestrator } from './core/orchestrator';
import { ScraperQueue, type ScraperJobParams, type ScraperJobView, type QueueSnapshot } from './queue';

export const orchestrator = new Orchestrator();
export const scraperQueue = new ScraperQueue(orchestrator);

export function enqueueScraperRun(params: ScraperJobParams) {
  return scraperQueue.enqueue(params);
}

export function getScraperRun(runId: string): ScraperJobView | null {
  return scraperQueue.getRun(runId);
}

export function getQueueSnapshot(): QueueSnapshot {
  return scraperQueue.snapshot();
}
