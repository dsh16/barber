import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://barber:barber_local@127.0.0.1:5432/barber',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
};
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}
