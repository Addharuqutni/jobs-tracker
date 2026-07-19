export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// ponytail: reject-only timeout; the wrapped promise keeps running in background.
// Use onTimeout to release resources (e.g. close browser) so they don't accumulate.
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  onTimeout?: () => Promise<void>,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } catch (err) {
    if (err instanceof TimeoutError && onTimeout) {
      // best-effort cleanup; never let it mask the timeout error
      try {
        await onTimeout();
      } catch {
        // ignore cleanup failure
      }
    }
    throw err;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
