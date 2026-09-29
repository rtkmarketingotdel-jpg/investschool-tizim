import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { ApiError } from '../lib/errors.js';
import { UPLOAD_DIR } from './attendance.js';

const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'image/webp': (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  'application/pdf': (b) => b.subarray(0, 5).toString() === '%PDF-',
};
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
export const DOC_MIMES = [...IMAGE_MIMES, 'application/pdf'];

/** Validates a data URL (mime allow-list, size, magic bytes) and stores it under uploads/<dir>. */
export async function saveDataUrl(dataUrl: string, allowed: string[], maxBytes: number, dir: string) {
  const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(dataUrl);
  if (!m || !allowed.includes(m[1]!)) throw new ApiError(400, 'FILE_INVALID_TYPE');
  const mime = m[1]!;
  const buf = Buffer.from(m[2]!, 'base64');
  if (buf.length > maxBytes) throw new ApiError(400, 'FILE_TOO_LARGE');
  if (!SIGNATURES[mime]?.(buf)) throw new ApiError(400, 'FILE_INVALID_TYPE');
  const rel = path.join(dir, `${randomBytes(12).toString('hex')}.${EXT[mime]}`);
  const abs = path.join(UPLOAD_DIR, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return { url: `/uploads/${rel.split(path.sep).join('/')}`, mime };
}

export async function removeUpload(url: string | null) {
  if (!url?.startsWith('/uploads/')) return;
  const abs = path.join(UPLOAD_DIR, url.slice('/uploads/'.length));
  if (!abs.startsWith(UPLOAD_DIR)) return; // never delete outside the uploads folder
  await fs.rm(abs, { force: true }).catch(() => undefined);
}
