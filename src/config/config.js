import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import logger from '../utils/logger.js'

const ENV_PATH = resolve(process.cwd(), '.env')

const updateEnvFile = (key, value) => {
  const env = existsSync(ENV_PATH)
    ? Object.fromEntries(
        readFileSync(ENV_PATH, 'utf-8')
          .split('\n')
          .filter(l => l.includes('='))
          .map(l => l.split('=').map(s => s.trim()))
      )
    : {}

  env[key] = value
  writeFileSync(
    ENV_PATH,
    Object.entries(env)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
  )
}

export const config = Object.freeze({
  prefix: process.env.PREFIX || '!',
  ownerNumber: process.env.OWNER_NUMBER || '',
  botName: 'Sonic',
  version: '3.0.0',
  authDir: 'sonic_session.db',
})

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
})

let ownerNumber = config.ownerNumber

export const getOwner = () => ownerNumber

export const setOwner = number => {
  ownerNumber = number.replace(/[^0-9]/g, '')
  updateEnvFile('OWNER_NUMBER', ownerNumber)
  logger.info(`👑 Owner set to: ${ownerNumber}`)
}
