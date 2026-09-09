/**
 * Ejecuta tareas async con límite de concurrencia (cola simple).
 * Evita saturar CPU/red cuando hay muchos bots a la vez.
 */
export async function mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  const results = new Array<R>(items.length);
  let next = 0;

  async function runWorker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

/** Concurrencia por defecto para bots (env BOT_CONCURRENCY, default 2). */
export function botConcurrency(fallback = 2): number {
  const raw = Number(process.env.BOT_CONCURRENCY ?? fallback);
  if (!Number.isFinite(raw) || raw < 1) return fallback;
  return Math.min(Math.floor(raw), 8);
}
