import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { toLocalDate } from '../lib/date.js';
import { ApiError } from '../lib/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { branchRepo } from '../repositories/branchRepo.js';
import { courseRepo } from '../repositories/courseRepo.js';
import { groupRepo, groupStatus } from '../repositories/groupRepo.js';
import { contractRepo } from '../repositories/contractRepo.js';
import { fullName, studentRepo } from '../repositories/studentRepo.js';
import { audit } from '../repositories/notificationRepo.js';
import { toPublicUser, userRepo } from '../repositories/userRepo.js';
import { syncCourseCharge } from '../services/finance.js';
import { findStartChat, getBotUsername, sendTelegram } from '../services/telegram.js';
import { linkedMessage } from '../services/telegramText.js';
import { env } from '../env.js';
import { randomBytes } from 'node:crypto';

export const meRouter = Router();
meRouter.use(requireAuth);

meRouter.get('/', (req, res) => {
  res.json({ user: toPublicUser(req.user!) });
});

const languageSchema = z.object({ language: z.enum(['uz', 'ru']) });
meRouter.patch('/language', validateBody(languageSchema), async (req, res, next) => {
  try {
    const user = await userRepo.update(req.user!.id, { language: req.body.language });
    res.json({ user: toPublicUser(user!) });
  } catch (e) {
    next(e);
  }
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
meRouter.post('/password', validateBody(passwordSchema), async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body as z.infer<typeof passwordSchema>;
    if (!(await bcrypt.compare(currentPassword, req.user!.passwordHash))) {
      throw new ApiError(400, 'AUTH_WRONG_PASSWORD');
    }
    await userRepo.update(req.user!.id, { passwordHash: await bcrypt.hash(newPassword, 10) });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ---------- personal Telegram (salary notices) ----------
const LINK_TTL_MS = 15 * 60 * 1000;
/** userId -> one-time code the employee sends to the bot as "/start <code>" through the t.me link. */
const linkCodes = new Map<string, { code: string; expiresAt: number }>();

meRouter.get('/telegram', (req, res) => {
  res.json({ linked: !!req.user!.telegramChatId, botConfigured: !!env.telegramToken });
});

meRouter.post('/telegram/link', async (req, res, next) => {
  try {
    const bot = await getBotUsername();
    if (!bot) throw new ApiError(400, 'TELEGRAM_NOT_CONFIGURED');
    const code = randomBytes(8).toString('hex');
    linkCodes.set(req.user!.id, { code, expiresAt: Date.now() + LINK_TTL_MS });
    res.json({ url: `https://t.me/${bot}?start=${code}` });
  } catch (e) {
    next(e);
  }
});

/** Polled by the profile page after the employee opened the bot: links the chat that sent this user's code. */
meRouter.post('/telegram/link/check', async (req, res, next) => {
  try {
    const me = req.user!;
    const pending = linkCodes.get(me.id);
    if (!pending || pending.expiresAt < Date.now()) return res.json({ linked: !!me.telegramChatId, expired: !me.telegramChatId });
    const chatId = await findStartChat(pending.code);
    if (!chatId) return res.json({ linked: false, expired: false });
    linkCodes.delete(me.id);
    await userRepo.update(me.id, { telegramChatId: chatId });
    await audit(me.id, 'telegram.link', 'user', me.id);
    await sendTelegram(linkedMessage(me.fullName.split(' ').slice(1).join(' ') || me.fullName), chatId);
    res.json({ linked: true, expired: false });
  } catch (e) {
    next(e);
  }
});

meRouter.delete('/telegram', async (req, res, next) => {
  try {
    await userRepo.update(req.user!.id, { telegramChatId: null });
    await audit(req.user!.id, 'telegram.unlink', 'user', req.user!.id);
    res.json({ linked: false });
  } catch (e) {
    next(e);
  }
});

/**
 * Everything a teacher needs about their own work: the groups they lead with the full roster and contacts.
 * No money fields (prices/debts) are exposed here.
 */
meRouter.get('/teaching', async (req, res, next) => {
  try {
    const me = req.user!;
    const contracts = new Map<string, { status: string; number: string }>();
    for (const c of await contractRepo.all()) {
      if (c.status === 'CANCELLED') continue;
      const cur = contracts.get(c.studentId);
      if (!cur || c.number > cur.number) contracts.set(c.studentId, { status: c.status, number: c.number });
    }
    const occ = await studentRepo.occupancy();
    const groups = [];
    for (const g of (await groupRepo.list()).filter((x) => x.teacherId === me.id)) {
      const [branch, course] = await Promise.all([g.branchId ? branchRepo.findById(g.branchId) : null, courseRepo.findById(g.courseId)]);
      const roster = (await studentRepo.list({ groupId: g.id, sort: 'name' })).filter((s) => s.status !== 'LEFT');
      const taken = occ.get(g.id) ?? roster.length;
      groups.push({
        id: g.id, name: g.name, courseName: course?.name ?? '—', status: groupStatus(g), startDate: g.startDate, endDate: g.endDate,
        days: g.days, timeStart: g.timeStart, timeEnd: g.timeEnd, room: g.room,
        capacity: g.capacity, studentCount: taken, freeSeats: Math.max(0, g.capacity - taken), branchName: branch?.name ?? null,
        men: roster.filter((s) => s.gender === 'MALE').length, women: roster.filter((s) => s.gender === 'FEMALE').length,
        students: roster.map((s) => ({
          id: s.id, fullName: fullName(s), firstName: s.firstName, lastName: s.lastName, gender: s.gender, birthDate: s.birthDate, status: s.status,
          phone: s.phone, phone2: s.phone2, district: s.district, address: s.address, enrolledAt: s.enrolledAt, contract: contracts.get(s.id)?.status ?? 'NONE',
        })),
      });
    }
    res.json({ specialty: me.specialty, isTeacher: me.isTeacher, position: me.position, groups });
  } catch (e) {
    next(e);
  }
});

const phoneRe = /^\+998\d{9}$/;
const optionalStr = z.string().trim().max(500).nullable().transform((v) => v || null);
const groupStudentSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  middleName: optionalStr,
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  gender: z.enum(['MALE', 'FEMALE']),
  phone: z.string().regex(phoneRe),
  phone2: z.string().regex(phoneRe).nullable(),
  address: optionalStr,
  district: optionalStr,
});

/** A teacher enrols trainees into their own group at the course list price (management applies discounts). */
meRouter.post('/group/:groupId/students', validateBody(groupStudentSchema), async (req, res, next) => {
  try {
    const group = await groupRepo.findById(req.params.groupId!);
    if (!group) throw new ApiError(404, 'NOT_FOUND');
    if (group.teacherId !== req.user!.id) throw new ApiError(403, 'FORBIDDEN');
    if (groupStatus(group) === 'FINISHED') throw new ApiError(409, 'GROUP_FINISHED');
    const taken = (await studentRepo.occupancy()).get(group.id) ?? 0;
    if (taken >= group.capacity) throw new ApiError(409, 'GROUP_FULL');
    const course = await courseRepo.findById(group.courseId);
    const body = req.body as z.infer<typeof groupStudentSchema>;
    const rec = await studentRepo.create({
      ...body, groupId: group.id, passport: null, pinfl: null, externalId: null, externalCourse: null, coursePrice: course?.price ?? 0, discountPercent: 0, status: 'ACTIVE',
      enrolledAt: toLocalDate(), leftAt: null, notes: null,
    });
    await syncCourseCharge(rec);
    res.status(201).json({ id: rec.id, fullName: fullName(rec) });
  } catch (e) {
    next(e);
  }
});
