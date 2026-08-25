import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import logger from '../utils/logger.js';

const ENV_PATH = resolve(process.cwd(), '.env');

/** @param {string} key */
const loadEnvValue = (key) => {
  if (process.env[key]?.trim()) return process.env[key].trim();
  if (!existsSync(ENV_PATH)) return undefined;

  const line = readFileSync(ENV_PATH, 'utf-8')
    .split('\n')
    .find((entry) => entry.trim().startsWith(`${key}=`));

  return line?.slice(line.indexOf('=') + 1).trim() || undefined;
};

/**
 * @param {string} key
 * @param {string} value
 */
const updateEnvFile = (key, value) => {
  const env = existsSync(ENV_PATH)
    ? Object.fromEntries(
        readFileSync(ENV_PATH, 'utf-8')
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
    ENV_PATH,
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n'),
  );
};

export const config = Object.freeze({
  prefix: loadEnvValue('SONIC_PREFIX') || '!',
  ownerNumber: loadEnvValue('OWNER_NUMBER') || '',
  botName: 'Sonic',
  version: '3.0.0',
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
  coin: '🪙',
});

let ownerNumber = config.ownerNumber;

export const getOwner = () => ownerNumber;

/** @param {string} number */
export const setOwner = (number) => {
  ownerNumber = number.replace(/[^0-9]/g, '');
  updateEnvFile('OWNER_NUMBER', ownerNumber);
  logger.info(`👑 Owner set to: ${ownerNumber}`);
};
