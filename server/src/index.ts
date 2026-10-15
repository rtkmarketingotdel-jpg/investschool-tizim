import { env } from './env.js';
import { createApp } from './app.js';
import { initStore, startAutoPersist } from './db/store.js';
import { startJobs } from './services/cron.js';
import { startTelegramBot } from './services/telegramBot.js';

const storage = await initStore();
startAutoPersist();
startJobs();
startTelegramBot();
createApp().listen(env.port, () => {
  console.log(`API listening on :${env.port} (${storage === 'database' ? 'Postgres' : 'in-memory demo data, no DATABASE_URL'})`);
});
