/** Pure helpers of the persistence layer: JSON rows in, typed records out, and what changed since the last save. */

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** JSON.parse that turns timestamps written by JSON.stringify(Date) back into Date (plain YYYY-MM-DD strings stay strings). */
export const parseRecord = <T,>(json: string): T => JSON.parse(json, (_k, v) => (typeof v === 'string' && ISO_DATETIME.test(v) ? new Date(v) : v)) as T;

export interface RowChange {
  upserts: Array<{ id: string; json: string }>;
  deletes: string[];
}

/** Compares the current records with the JSON last written for them. */
export function diffRows(records: Array<{ id: string }>, saved: Map<string, string>): RowChange {
  const upserts: RowChange['upserts'] = [];
  const seen = new Set<string>();
  for (const r of records) {
    seen.add(r.id);
    const json = JSON.stringify(r);
    if (saved.get(r.id) !== json) upserts.push({ id: r.id, json });
  }
  return { upserts, deletes: [...saved.keys()].filter((id) => !seen.has(id)) };
}
