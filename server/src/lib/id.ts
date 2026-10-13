import { randomBytes } from 'node:crypto';

/**
 * Unique record id ("s" + time + random). Ids must stay unique after the data is reloaded from the database,
 * so per-process counters (s1, s2, …) are not safe.
 */
export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${randomBytes(3).toString('hex')}`;
