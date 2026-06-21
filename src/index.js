import { startSocket } from './core/socket.js';
import { config } from './config/config.js';
import logger from './utils/logger.js';

logger.info(`SONIC WHATSAPP BOT 🦔`);
logger.info(`v${config.version}`);
logger.info(`Prefix: ${config.prefix}`);

startSocket().catch((err) => {
  logger.fatal('💥 Fatal:', err);
  process.exit(1);
});
