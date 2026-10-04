import { contractTemplates, contracts, nextContractSeq } from '../data/mockFinance.js';
import type { Contract, ContractTemplate } from '../data/types.js';
import { randomBytes } from 'node:crypto';

let counter = 1;

export const contractRepo = {
  async all() {
    return contracts;
  },
  async findById(id: string) {
    return contracts.find((c) => c.id === id) ?? null;
  },
  async findByToken(token: string) {
    return contracts.find((c) => c.publicToken === token) ?? null;
  },
  async create(data: Omit<Contract, 'id' | 'number' | 'publicToken' | 'createdAt' | 'otpHash' | 'otpExpiresAt' | 'otpAttempts' | 'otpDemoCode' | 'signedAt' | 'signedIp' | 'signedUserAgent' | 'signerPhone' | 'snapshot'>, prefix: string) {
    const rec: Contract = {
      id: `ctn${counter++}`,
      number: `${prefix}-${new Date().getFullYear()}-${String(nextContractSeq()).padStart(4, '0')}`,
      publicToken: randomBytes(16).toString('hex'),
      createdAt: new Date(),
      otpHash: null, otpExpiresAt: null, otpAttempts: 0, otpDemoCode: null,
      signedAt: null, signedIp: null, signedUserAgent: null, signerPhone: null, snapshot: null,
      ...data,
    };
    contracts.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Contract>) {
    const rec = contracts.find((c) => c.id === id);
    return rec ? Object.assign(rec, patch) : null;
  },
};

export const templateRepo = {
  async all() {
    return contractTemplates;
  },
  async findById(id: string) {
    return contractTemplates.find((t) => t.id === id) ?? null;
  },
  async create(data: Omit<ContractTemplate, 'id'>) {
    const rec = { id: `tn${counter++}`, ...data };
    if (rec.isDefault) contractTemplates.forEach((t) => t.language === rec.language && (t.isDefault = false));
    contractTemplates.push(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<ContractTemplate, 'id'>>) {
    const rec = contractTemplates.find((t) => t.id === id);
    if (!rec) return null;
    if (patch.isDefault) contractTemplates.forEach((t) => t.language === (patch.language ?? rec.language) && (t.isDefault = false));
    return Object.assign(rec, patch);
  },
  async remove(id: string) {
    const i = contractTemplates.findIndex((t) => t.id === id);
    if (i >= 0) contractTemplates.splice(i, 1);
  },
};
