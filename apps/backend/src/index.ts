import { createApp } from './app.js';
import { config } from './config.js';
import { sequelize } from './db.js';

await sequelize.authenticate();
const server = createApp(() => sequelize.authenticate()).listen(config.port, () => {
  console.log(`Backend listening on port ${config.port}`);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      await sequelize.close();
      clearTimeout(timeout);
      process.exit(0);
    });
  });
}
