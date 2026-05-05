import 'dotenv/config';
import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

async function main() {
  await connectDatabase();

  const server = app.listen(PORT, () => {
    logger.info(`AccountIQ API running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Startup failed', err);
  process.exit(1);
});
