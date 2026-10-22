import { SequelizeStorage, Umzug } from 'umzug';
import { sequelize } from './db.js';
import { migrations } from './migrations.js';

const migrator = new Umzug({
  migrations,
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
