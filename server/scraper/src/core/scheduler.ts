import cron from 'node-cron';
import { orchestrator } from '../runtime';

const cronExpression = process.env.SCRAPER_CRON ?? '0 */6 * * *';

export function startScheduler(): void {
  cron.schedule(cronExpression, async () => {
    console.log(`[scheduler] Scheduled run starting at ${new Date().toISOString()}`);
    try {
      await orchestrator.run();
      console.log(`[scheduler] Scheduled run complete.`);
    } catch (err) {
      // ponytail: catch so cron process survives; upgrade to alerting if needed
      console.error(`[scheduler] Scheduled run failed:`, err instanceof Error ? err.message : err);
    }
  });

  console.log(`[scheduler] Started. Cron: "${cronExpression}".`);
}
