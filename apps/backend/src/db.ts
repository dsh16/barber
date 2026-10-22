import { Sequelize } from 'sequelize';
import { config } from './config.js';

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 10, min: 0, acquire: 10000, idle: 10000 },
});
