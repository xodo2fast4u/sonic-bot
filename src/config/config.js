import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import logger from '../utils/logger.js';

/** @param {string} key */
const loadEnvValue = (key) => {
  if (process.env[key]?.trim()) return process.env[key].trim();
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return undefined;

  const line = readFileSync(envPath, 'utf-8')
    .split('\n')
    .find((entry) => entry.trim().startsWith(`${key}=`));

  return line?.slice(line.indexOf('=') + 1).trim() || undefined;
};

/**
 * @param {string} key
 * @param {string} value
 */
const updateEnvFile = (key, value) => {
  const envPath = resolve(process.cwd(), '.env');
  const env = existsSync(envPath)
    ? Object.fromEntries(
        readFileSync(envPath, 'utf-8')
          .split('\n')
          .filter((l) => l.includes('='))
          .map((l) => {
            const separatorIndex = l.indexOf('=');
            return [l.slice(0, separatorIndex).trim(), l.slice(separatorIndex + 1).trim()];
          }),
      )
    : {};

  env[key] = value;
  writeFileSync(
    envPath,
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
};

export const config = Object.freeze({
  prefix: loadEnvValue('SONIC_PREFIX') || '!',
  ownerNumber: loadEnvValue('OWNER_NUMBER') || '',
  botName: 'Sonic',
  version: '3.5.0',
  authDir: 'sonic_session.db',
});

export const emoji = Object.freeze({
  sonic: '🦔',
  speed: '💨',
  bolt: '⚡',
  star: '⭐',
  ring: '💍',
  check: '✅',
  cross: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  menu: '📋',
  group: '👥',
  admin: '👑',
  user: '👤',
  time: '⏱️',
  ping: '🏓',
  rocket: '🚀',
  tool: '⚒️',
  maker: '✨',
  coin: '🪙',
  download: '⬇️',
  rpg: '⚔️',
  gambling: '🎰',
});

let ownerNumber = config.ownerNumber;

export const getOwner = () => ownerNumber;

/**
 * @param {string} number
 * @param {{ persist?: boolean }} [options]
 */
export const setOwner = (number, options = {}) => {
  ownerNumber = number.replace(/[^0-9]/g, '');
  const isTestRuntime =
    process.env['NODE_ENV'] === 'test' ||
    Boolean(process.env['JEST_WORKER_ID']) ||
    process.argv.some((argument) => argument.includes('jest'));
  const shouldPersist = options.persist ?? !isTestRuntime;
  if (shouldPersist) updateEnvFile('OWNER_NUMBER', ownerNumber);
  logger.info(`👑 Owner set to: ${ownerNumber}`);
};
