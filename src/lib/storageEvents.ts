export type StorageStore = 'jobs' | 'applications' | 'logs';

export const STORAGE_EVENT = 'jobs-storage-changed';

const DEBOUNCE_MS = 120;

export interface StorageChangedDetail {
  stores: StorageStore[];
}

export function notifyStorageChanged(stores: StorageStore[]): void {
  window.dispatchEvent(
    new CustomEvent<StorageChangedDetail>(STORAGE_EVENT, {
      detail: { stores },
    }),
  );
}

/** Missing detail = any store (legacy-safe). Debounced. */
export function onStorageChanged(
  stores: StorageStore[] | 'any',
  cb: () => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const handler = (event: Event) => {
    const changed = (event as CustomEvent<StorageChangedDetail>).detail?.stores;
    if (stores !== 'any' && changed && !stores.some((s) => changed.includes(s))) {
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      cb();
    }, DEBOUNCE_MS);
  };

  window.addEventListener(STORAGE_EVENT, handler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    if (timer) clearTimeout(timer);
  };
}
