import { SequelizeStorage, Umzug } from 'umzug';
import { sequelize } from './db.js';

// Add versioned migrations here. Never use sync({ alter: true }) in production.
const migrator = new Umzug({
  migrations: [],
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});
try {
  await sequelize.authenticate();
  await migrator.up();
} finally {
  await sequelize.close();
}
