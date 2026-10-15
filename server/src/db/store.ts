import pg from 'pg';
import { apiKeys, courseLinks } from '../data/integration.js';
import { coursePlans, groupPlans } from '../data/lessonPlans.js';
import { feedbacks } from '../data/feedback.js';
import { auditLogs, charges, contractTemplates, contracts, notifications, payments, payrolls, adjustments } from '../data/mockFinance.js';
import { lastDebtSms, smsCampaigns, smsTemplates } from '../data/mockSms.js';
import { attendances, branches, settings, users } from '../data/mockStore.js';
import { courses, groups, students } from '../data/mockStudents.js';
import { diffRows, parseRecord } from './rows.js';

/**
 * Postgres persistence. The app keeps working on the in-memory arrays (repositories and services are unchanged);
 * this module loads them from the database at start-up and writes back only the records that changed.
 * Each record is one JSONB row keyed by (collection, id). Without DATABASE_URL the app runs on the demo data in memory.
 */

const collections: Record<string, Array<{ id: string }>> = {
  users, branches, attendances, courses, groups, students, charges, payments, adjustments, payrolls,
  contractTemplates, contracts, notifications, auditLogs, smsTemplates, smsCampaigns, apiKeys, courseLinks, coursePlans, groupPlans, feedbacks,
};

/** Singletons kept as rows of the "meta" collection. */
const meta = {
  read: () => [
    { id: 'settings', ...settings },
    { id: 'lastDebtSms', at: Object.fromEntries(lastDebtSms) },
  ],
  apply(rows: Array<Record<string, unknown> & { id: string }>) {
    for (const { id, ...data } of rows) {
      if (id === 'settings') Object.assign(settings, data);
      if (id === 'lastDebtSms') {
        lastDebtSms.clear();
        for (const [k, v] of Object.entries((data.at ?? {}) as Record<string, string>)) lastDebtSms.set(k, new Date(v));
      }
    }
  },
};

let pool: pg.Pool | null = null;
/** collection -> (id -> JSON last written), so a save only touches what changed. */
const saved = new Map<string, Map<string, string>>();

export const dbEnabled = () => !!pool;

export async function initStore(): Promise<'database' | 'memory'> {
  const url = process.env.DATABASE_URL;
  if (!url) return 'memory';
  pool = new pg.Pool({ connectionString: url, max: 5, ssl: /localhost|127\.0\.0\.1|\.railway\.internal/.test(url) ? undefined : { rejectUnauthorized: false } });
  await pool.query(`CREATE TABLE IF NOT EXISTS records (
    collection text NOT NULL,
    id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (collection, id)
  )`);
  const { rows } = await pool.query<{ collection: string; id: string; data: string }>('SELECT collection, id, data::text AS data FROM records');
  if (rows.length === 0) {
    // first start on an empty database: the demo examples become the initial data
    await saveNow();
    console.log('[db] empty database seeded with the demo data');
    return 'database';
  }
  const byCollection = new Map<string, Array<{ id: string; data: string }>>();
  for (const r of rows) (byCollection.get(r.collection) ?? byCollection.set(r.collection, []).get(r.collection)!).push(r);
  for (const [name, arr] of Object.entries(collections)) {
    const list = byCollection.get(name) ?? [];
    arr.splice(0, arr.length, ...list.map((r) => parseRecord<{ id: string }>(r.data)));
    // remember the JSON as the app would write it, so an untouched record is not rewritten
    saved.set(name, new Map(arr.map((rec) => [rec.id, JSON.stringify(rec)])));
  }
  meta.apply((byCollection.get('meta') ?? []).map((r) => parseRecord<Record<string, unknown> & { id: string }>(r.data)));
  saved.set('meta', new Map(meta.read().map((rec) => [rec.id, JSON.stringify(rec)])));
  console.log(`[db] loaded ${rows.length} records`);
  return 'database';
}

async function saveNow() {
  if (!pool) return;
  const all: Array<[string, Array<{ id: string }>]> = [...Object.entries(collections), ['meta', meta.read()]];
  const changes = all.map(([name, arr]) => ({ name, ...diffRows(arr, saved.get(name) ?? new Map()) })).filter((c) => c.upserts.length || c.deletes.length);
  if (!changes.length) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of changes) {
      for (const u of c.upserts) {
        await client.query(
          `INSERT INTO records (collection, id, data, updated_at) VALUES ($1, $2, $3::jsonb, now())
           ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
          [c.name, u.id, u.json],
        );
      }
      if (c.deletes.length) await client.query('DELETE FROM records WHERE collection = $1 AND id = ANY($2)', [c.name, c.deletes]);
    }
    await client.query('COMMIT');
    // only after the commit: a failed save is retried on the next call
    for (const c of changes) {
      const m = saved.get(c.name) ?? saved.set(c.name, new Map()).get(c.name)!;
      for (const u of c.upserts) m.set(u.id, u.json);
      for (const id of c.deletes) m.delete(id);
    }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

let running: Promise<void> | null = null;
let again = false;
let timer: NodeJS.Timeout | null = null;

/** Saves now; calls made while a save is running are folded into one more save afterwards. */
export function flush(): Promise<void> {
  if (!pool) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await saveNow();
      } while (again);
    } catch (e) {
      console.error('[db] save failed', e);
    } finally {
      running = null;
    }
  })();
  return running;
}

/** Debounced save after a change (a burst of writes becomes one transaction). */
export function schedulePersist(delayMs = 200) {
  if (!pool) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void flush();
  }, delayMs);
}

/** Background work (SMS sending, cron jobs) also changes data: a periodic sweep catches it. */
export function startAutoPersist(everyMs = 15_000) {
  if (!pool) return;
  setInterval(() => void flush(), everyMs).unref();
  const stop = async () => {
    await flush();
    await pool?.end();
    process.exit(0);
  };
  process.once('SIGTERM', () => void stop());
  process.once('SIGINT', () => void stop());
}
