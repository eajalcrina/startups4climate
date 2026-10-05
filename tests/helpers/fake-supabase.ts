import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Minimal chainable fake of the Supabase query builder.
 *
 * Every builder method (select, eq, gte, insert, upsert, update, maybeSingle…)
 * is recorded and returns the same builder. Awaiting the builder calls the
 * provided resolver with the table name and the recorded operations, so each
 * test decides what the "database" answers.
 */
export interface RecordedOp {
  method: string
  args: unknown[]
}

export interface RecordedQuery {
  table: string
  ops: RecordedOp[]
}

export interface FakeResult {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

export type Resolver = (query: RecordedQuery) => FakeResult | Promise<FakeResult>

export interface FakeSupabase {
  client: SupabaseClient
  queries: RecordedQuery[]
  /** Queries whose op list contains the given method (e.g. 'insert'). */
  callsTo: (table: string, method: string) => RecordedQuery[]
}

export function createFakeSupabase(resolver: Resolver): FakeSupabase {
  const queries: RecordedQuery[] = []

  function makeBuilder(query: RecordedQuery): unknown {
    const target = {}
    const proxy: unknown = new Proxy(target, {
      get(_t, prop) {
        if (prop === 'then') {
          return (
            onFulfilled?: (v: FakeResult) => unknown,
            onRejected?: (e: unknown) => unknown,
          ) => Promise.resolve().then(() => resolver(query)).then(onFulfilled, onRejected)
        }
        return (...args: unknown[]) => {
          query.ops.push({ method: String(prop), args })
          return proxy
        }
      },
    })
    return proxy
  }

  const client = {
    from(table: string) {
      const query: RecordedQuery = { table, ops: [] }
      queries.push(query)
      return makeBuilder(query)
    },
  }

  return {
    client: client as unknown as SupabaseClient,
    queries,
    callsTo: (table, method) =>
      queries.filter((q) => q.table === table && q.ops.some((o) => o.method === method)),
  }
}

export function hasOp(query: RecordedQuery, method: string): boolean {
  return query.ops.some((o) => o.method === method)
}

export function opArgs(query: RecordedQuery, method: string): unknown[] | undefined {
  return query.ops.find((o) => o.method === method)?.args
}
