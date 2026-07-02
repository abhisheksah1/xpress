import app from './src/app.js';
import connectDB from './src/config/db.js';
import config from './src/config/index.js';
import seedOnStartup from './src/seeds/superAdmin.seed.js';

const startServer = async () => {
  await connectDB();
  await seedOnStartup();

  app.listen(config.port, () => {
    console.log(`KoseliXpress API running on port ${config.port} [${config.env}]`);
    console.log(`API: http://localhost:${config.port}/api/${config.apiVersion}`);
  });
};

startServer();
