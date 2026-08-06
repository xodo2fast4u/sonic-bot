import { container } from './container.js';
import '../utils/enhanced-logger.js';
import '../commands/command-registry.js';
import '../commands/middleware-pipeline.js';
import './message-router.js';
import '../cache/cache-manager.js';
import '../config/config-manager.js';
import '../utils/enhanced-cooldown.js';

let runtimeInitialized = false;

export const ensureRuntimeInitialized = async () => {
  if (runtimeInitialized) return;

  const configManager = container.resolve('configManager');
  await configManager.initialize();

  const cache = container.resolve('cache');
  await cache.initialize?.();

  const cooldownManager = container.resolve('cooldownManager');
  await cooldownManager.initialize?.();

  const commandRegistry = container.resolve('commandRegistry');
  await commandRegistry.initialize?.();

  const middlewarePipeline = container.resolve('middlewarePipeline');
  await middlewarePipeline.initialize?.();

  const messageRouter = container.resolve('messageRouter');
  await messageRouter.initialize?.();

  runtimeInitialized = true;
};

/** @param {any} sonic @param {import('../../types/index.js').WhatsAppMessage} msg */
export const handleMessage = async (sonic, msg) => {
  await ensureRuntimeInitialized();
  const messageRouter = container.resolve('messageRouter');
  return messageRouter.processMessage(sonic, msg);
};
