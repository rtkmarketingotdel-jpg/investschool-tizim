import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ApiError } from '../lib/errors.js';
import { validateBody } from '../middleware/validate.js';
import { contractRepo } from '../repositories/contractRepo.js';
import { env } from '../env.js';
import { brand } from '../brand.config.js';
import { contractPdfFor, contractText, requestOtp, signContract } from '../services/contracts.js';

export const publicContractsRouter = Router();
publicContractsRouter.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false, message: { error: 'TOO_MANY_REQUESTS' } }));

async function byToken(token: string) {
  const c = await contractRepo.findByToken(token);
  // DRAFT and CANCELLED contracts are not exposed to parents.
  if (!c || c.status === 'DRAFT' || c.status === 'CANCELLED') throw new ApiError(404, 'NOT_FOUND');
  return c;
}

publicContractsRouter.get('/:token', async (req, res, next) => {
  try {
    const c = await byToken(req.params.token!);
    const { blocks } = await contractText(c);
    res.json({
      number: c.number, language: c.language, status: c.status, signedAt: c.signedAt, blocks,
      school: brand.name, demoMode: env.demoMode && !(await import('../services/sms.js')).smsConfigured(),
    });
  } catch (e) {
    next(e);
  }
});

publicContractsRouter.get('/:token/pdf', async (req, res, next) => {
  try {
    const c = await byToken(req.params.token!);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${c.number}.pdf"`);
    res.send(await contractPdfFor(c));
  } catch (e) {
    next(e);
  }
});

publicContractsRouter.post('/:token/otp', validateBody(z.object({ agree: z.literal(true) })), async (req, res, next) => {
  try {
    res.json(await requestOtp(await byToken(req.params.token!)));
  } catch (e) {
    next(e);
  }
});

publicContractsRouter.post('/:token/sign', validateBody(z.object({ code: z.string().regex(/^\d{6}$/) })), async (req, res, next) => {
  try {
    const c = await byToken(req.params.token!);
    const signed = await signContract(c, (req.body as { code: string }).code, { ip: req.ip ?? '', userAgent: req.headers['user-agent'] ?? '' });
    res.json({ status: signed.status, signedAt: signed.signedAt });
  } catch (e) {
    next(e);
  }
});
