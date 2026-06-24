import { ImageWatcher } from './services/ImageWatcher.js';
import { logger } from './utils/logger.js';

async function main() {
  await logger.initialize();
  logger.info('SPIRA Pinterest Agent started');

  const watcher = new ImageWatcher('content/new');
  await watcher.initialize();
  watcher.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    logger.info('Shutting down...');
    watcher.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Shutting down...');
    watcher.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Failed to start agent:', error);
  process.exit(1);
});