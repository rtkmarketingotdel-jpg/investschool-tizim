import { describe, expect, it } from 'vitest';
import { diffRows, parseRecord } from '../../db/rows.js';

describe('parseRecord', () => {
  it('revives timestamps but keeps plain dates as strings', () => {
    const r = parseRecord<{ at: Date; day: string; n: null }>(JSON.stringify({ at: new Date('2026-10-13T09:00:00Z'), day: '2026-10-13', n: null }));
    expect(r.at).toBeInstanceOf(Date);
    expect(r.at.toISOString()).toBe('2026-10-13T09:00:00.000Z');
    expect(r.day).toBe('2026-10-13');
  });
});

describe('diffRows', () => {
  it('finds new, changed and removed records only', () => {
    const saved = new Map([['a', JSON.stringify({ id: 'a', v: 1 })], ['b', JSON.stringify({ id: 'b', v: 1 })], ['c', JSON.stringify({ id: 'c' })]]);
    const d = diffRows([{ id: 'a', v: 1 } as { id: string }, { id: 'b', v: 2 } as { id: string }, { id: 'd' }], saved);
    expect(d.upserts.map((u) => u.id)).toEqual(['b', 'd']);
    expect(d.deletes).toEqual(['c']);
  });
});
