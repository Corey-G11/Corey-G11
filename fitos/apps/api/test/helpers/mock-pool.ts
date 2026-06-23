import type { Pool, PoolClient } from 'pg';

/**
 * A scripted result for a single (non-transaction) query call. Provide `rows`
 * (and optionally `rowCount`), or an `error` to make the call reject.
 */
export interface ScriptedResult {
  rows?: unknown[];
  rowCount?: number;
  error?: unknown;
}

export interface QueryCall {
  text: string;
  params: unknown[];
}

export interface MockPool {
  pool: Pool;
  calls: QueryCall[];
  release: jest.Mock;
}

const TXN = new Set(['BEGIN', 'COMMIT', 'ROLLBACK']);

/**
 * Build a fake pg Pool that returns scripted results in FIFO order. Transaction
 * statements (BEGIN/COMMIT/ROLLBACK) are answered transparently and do NOT
 * consume a scripted result, so scripts only describe "real" queries.
 */
export function createMockPool(script: ScriptedResult[] = []): MockPool {
  const queue = [...script];
  const calls: QueryCall[] = [];
  const release = jest.fn();

  const handler = (text: string, params?: unknown[]): Promise<unknown> => {
    if (TXN.has(text.trim().toUpperCase())) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    calls.push({ text, params: params ?? [] });
    const next = queue.shift();
    if (next?.error) {
      return Promise.reject(next.error);
    }
    const rows = next?.rows ?? [];
    return Promise.resolve({
      rows,
      rowCount: next?.rowCount ?? rows.length,
    });
  };

  const client = {
    query: handler,
    release,
  } as unknown as PoolClient;

  const pool = {
    query: handler,
    connect: (): Promise<PoolClient> => Promise.resolve(client),
  } as unknown as Pool;

  return { pool, calls, release };
}
