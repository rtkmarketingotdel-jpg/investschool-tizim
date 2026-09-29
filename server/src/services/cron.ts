import cron from 'node-cron';
import { toLocalDate } from '../lib/date.js';
import { dailyReport, markAbsentees } from './attendanceEffects.js';
import { generateMonthlyCharges } from './finance.js';
import { runDebtAuto, runDueCampaigns } from './smsCampaigns.js';

export function startJobs() {
  const opts = { timezone: 'Asia/Tashkent' };
  cron.schedule('0 12 * * *', () => void markAbsentees().catch(console.error), opts);
  cron.schedule('0 9 * * *', () => void dailyReport().catch(console.error), opts);
  cron.schedule('* * * * *', () => void runDueCampaigns().catch(console.error), opts);
  cron.schedule('0 10 * * *', () => void runDebtAuto().catch(console.error), opts);
  cron.schedule('5 0 1 * *', () => void generateMonthlyCharges(toLocalDate().slice(0, 7)).catch(console.error), opts);
}
