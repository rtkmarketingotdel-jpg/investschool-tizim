import { randomBytes } from 'node:crypto';
import type { Student } from '../data/types.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { getBotUsername } from './telegram.js';
import { STUDENT_PREFIX } from './telegramBot.js';

/** The trainee's personal bot link; the code is made on first use and kept until renewed. */
export async function studentBotLink(s: Student, renew = false): Promise<string | null> {
  const bot = await getBotUsername();
  if (!bot) return null;
  let code = s.telegramCode;
  if (!code || renew) {
    code = randomBytes(9).toString('base64url');
    await studentRepo.update(s.id, { telegramCode: code });
  }
  return `https://t.me/${bot}?start=${STUDENT_PREFIX}${code}`;
}
