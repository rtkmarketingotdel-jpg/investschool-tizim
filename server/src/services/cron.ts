import cron from 'node-cron';
import { dailyReport, markAbsentees } from './attendanceEffects.js';
import { runDebtAuto, runDueCampaigns } from './smsCampaigns.js';

export function startJobs() {
  const opts = { timezone: 'Asia/Tashkent' };
  cron.schedule('0 12 * * *', () => void markAbsentees().catch(console.error), opts);
  cron.schedule('0 9 * * *', () => void dailyReport().catch(console.error), opts);
  cron.schedule('* * * * *', () => void runDueCampaigns().catch(console.error), opts);
  cron.schedule('0 10 * * *', () => void runDebtAuto().catch(console.error), opts);
}
