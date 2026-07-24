import app from './src/app.js';
import connectDB from './src/config/db.js';
import config from './src/config/index.js';
import seedOnStartup from './src/seeds/superAdmin.seed.js';
import { startForexScheduler } from './src/services/forex.service.js';
import { startPaymentReconcileScheduler } from './src/services/paymentReconcile.service.js';
import { logBrevoConfigStatus } from './src/services/email.service.js';

const startServer = async () => {
  await connectDB();
  try {
    await seedOnStartup();
  } catch (err) {
    console.error('[seed] Startup seed failed (API will still start):', err.message);
  }
  startForexScheduler();
  startPaymentReconcileScheduler();
  await logBrevoConfigStatus();

  app.listen(config.port, () => {
    console.log(`KoseliXpress API running on port ${config.port} [${config.env}]`);
    console.log(`API: http://localhost:${config.port}/api/${config.apiVersion}`);
  });
};

startServer().catch((err) => {
  console.error('[fatal] API failed to start:', err);
  process.exit(1);
});
