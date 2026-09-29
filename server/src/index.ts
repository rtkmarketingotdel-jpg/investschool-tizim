import { env } from './env.js';
import { createApp } from './app.js';
import { startJobs } from './services/cron.js';

startJobs();
createApp().listen(env.port, () => {
  console.log(`API listening on :${env.port} (mock data, no database)`);
});
