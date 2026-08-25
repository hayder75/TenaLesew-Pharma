import { createApp } from './app';
import { config } from './config';
import { prisma } from './db';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`TenaLesew API listening on :${config.port} (${config.isProd ? 'production' : 'dev'})`);
});

const shutdown = async (signal: string) => {
  console.log(`${signal} received — shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
