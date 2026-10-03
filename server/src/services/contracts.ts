import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { env } from '../env.js';
import type { Contract } from '../data/types.js';
import { ApiError } from '../lib/errors.js';
import { classRepo } from '../repositories/classRepo.js';
import { contractRepo, templateRepo } from '../repositories/contractRepo.js';
import { audit, notifyRoles } from '../repositories/notificationRepo.js';
import { studentRepo } from '../repositories/studentRepo.js';
import { brand } from '../brand.config.js';
import { contractPdf, contractValues, parseBlocks, renderTemplate } from './pdf.js';
import { sendSms, smsConfigured } from './sms.js';
import { sendTelegram } from './telegram.js';
import { contractSignedMessage, otpMessage } from './telegramText.js';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function context(c: Contract) {
  const [student, template] = await Promise.all([studentRepo.findById(c.studentId), templateRepo.findById(c.templateId)]);
  if (!student || !template) throw new ApiError(404, 'NOT_FOUND');
  const cls = student.classId ? await classRepo.findById(student.classId) : null;
  return { student, template, values: contractValues(c, student, cls?.name ?? null) };
}

export async function contractText(c: Contract) {
  const { template, values } = await context(c);
  return { blocks: parseBlocks(renderTemplate(template.body, values)), values };
}

export async function contractPdfFor(c: Contract) {
  const { template, values } = await context(c);
  return contractPdf(c, template, values);
}

/** Creates an OTP for the public signing page and delivers it (SMS, or DEMO channels). */
export async function requestOtp(c: Contract) {
  if (c.status !== 'SENT') throw new ApiError(409, 'CONTRACT_NOT_SIGNABLE');
  if (c.otpExpiresAt && c.otpExpiresAt.getTime() - OTP_TTL_MS + 30_000 > Date.now()) throw new ApiError(429, 'OTP_TOO_SOON');
  const code = String(randomInt(100000, 1000000));
  const { student } = await context(c);
  const sms = smsConfigured() && (await sendSms(student.parentPhone, `${brand.name}: ${code}`));
  await contractRepo.update(c.id, {
    otpHash: await bcrypt.hash(code, 8), otpExpiresAt: new Date(Date.now() + OTP_TTL_MS), otpAttempts: 0,
    otpDemoCode: sms ? null : env.demoMode ? code : null,
  });
  if (!sms) {
    // DEMO mode: staff read the code from the contracts table / bell and the Telegram group.
    await notifyRoles(['DIRECTOR', 'MANAGER'], 'notif.otp', { number: c.number, code }, '/finance/contracts');
    await sendTelegram(otpMessage(c.number, code));
  }
  return { delivery: sms ? 'sms' : 'demo' } as const;
}

export async function signContract(c: Contract, code: string, meta: { ip: string; userAgent: string }) {
  if (c.status !== 'SENT') throw new ApiError(409, 'CONTRACT_NOT_SIGNABLE');
  if (!c.otpHash || !c.otpExpiresAt) throw new ApiError(400, 'OTP_NOT_REQUESTED');
  if (c.otpExpiresAt.getTime() < Date.now()) throw new ApiError(400, 'OTP_EXPIRED');
  if (c.otpAttempts >= MAX_ATTEMPTS) throw new ApiError(429, 'OTP_TOO_MANY_ATTEMPTS');
  if (!(await bcrypt.compare(code, c.otpHash))) {
    await contractRepo.update(c.id, { otpAttempts: c.otpAttempts + 1 });
    throw new ApiError(400, 'OTP_INVALID');
  }
  const { student } = await context(c);
  const signed = (await contractRepo.update(c.id, {
    status: 'SIGNED', signedAt: new Date(), signedIp: meta.ip, signedUserAgent: meta.userAgent, signerPhone: student.parentPhone,
    otpHash: null, otpExpiresAt: null, otpDemoCode: null,
  }))!;
  await audit(null, 'contract.sign', 'contract', c.id, { ip: meta.ip });
  await notifyRoles(['DIRECTOR', 'MANAGER'], 'notif.contractSigned', { number: c.number, student: `${student.lastName} ${student.firstName}` }, '/finance/contracts');
  await sendTelegram(contractSignedMessage(c.number));
  return signed;
}
