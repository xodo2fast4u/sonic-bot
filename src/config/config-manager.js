import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { container } from '../core/container.js'

const CONFIG_SCHEMA = {
  prefix: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 10,
    default: '!',
  },
  ownerNumber: {
    type: 'string',
    required: false,
    pattern: /^[0-9]+$/,
  },
  botName: {
    type: 'string',
    required: true,
    minLength: 1,
    maxLength: 50,
    default: 'Sonic',
  },
  version: {
    type: 'string',
    required: true,
    pattern: /^\d+\.\d+\.\d+$/,
    default: '1.0.0',
  },
  authDir: {
    type: 'string',
    required: true,
    default: 'sonic_session.db',
  },
  environment: {
    type: 'string',
    required: true,
    enum: ['development', 'production', 'test'],
    default: 'development',
  },
  logLevel: {
    type: 'string',
    required: true,
    enum: ['fatal', 'error', 'warn', 'info', 'debug', 'trace'],
    default: 'info',
  },
}

export const CONSTANTS = Object.freeze({
  DB_CONNECTION_TIMEOUT: 30000,
  DB_MAX_CONNECTIONS: 10,
  DB_QUERY_TIMEOUT: 10000,

  COOLDOWN_GLOBAL_DURATION: 1000,
  COOLDOWN_WARN_THRESHOLD: 3,
  COOLDOWN_IGNORE_THRESHOLD: 5,

  DAILY_COOLDOWN: 86400000, // 24 hours
  WORK_COOLDOWN: 3600000, // 1 hour
  BEG_COOLDOWN: 300000, // 5 minutes

  JOB_MIN_PAYOUT: 15,
  JOB_MAX_PAYOUT: 250,

  MAX_MESSAGE_LENGTH: 4096,
  MAX_MENTIONS: 5,

  CACHE_TTL_USER: 300000, // 5 minutes
  CACHE_TTL_COMMANDS: 600000, // 10 minutes
  CACHE_TTL_PERMISSIONS: 900000, // 15 minutes

  MAX_CONCURRENT_COMMANDS: 10,
  COMMAND_TIMEOUT: 30000,

  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 30,
})

const ENVIRONMENT_CONFIGS = {
  development: {
    logLevel: 'debug',
    dbPath: './data/sonic_dev.db',
    enableDebugCommands: true,
    enableHotReload: false,
  },
  production: {
    logLevel: 'info',
    dbPath: './data/sonic.db',
    enableDebugCommands: false,
    enableHotReload: false,
  },
  test: {
    logLevel: 'error',
    dbPath: ':memory:',
    enableDebugCommands: true,
    enableHotReload: false,
  },
}

class ConfigValidator {
  static validate(config, schema = CONFIG_SCHEMA) {
    const errors = []
    const validated = {}

    for (const [key, rules] of Object.entries(schema)) {
      const value = config[key]

      if (rules.required && (value === undefined || value === null)) {
        errors.push(`Missing required field: ${key}`)
        continue
      }

      const finalValue = value !== undefined ? value : rules.default

      if (finalValue !== undefined && rules.type && typeof finalValue !== rules.type) {
        errors.push(`Invalid type for ${key}: expected ${rules.type}, got ${typeof finalValue}`)
        continue
      }

      if (typeof finalValue === 'string') {
        if (rules.minLength && finalValue.length < rules.minLength) {
          errors.push(`${key} must be at least ${rules.minLength} characters`)
          continue
        }
        if (rules.maxLength && finalValue.length > rules.maxLength) {
          errors.push(`${key} must be at most ${rules.maxLength} characters`)
          continue
        }
        if (rules.pattern && !rules.pattern.test(finalValue)) {
          errors.push(`Invalid format for ${key}`)
          continue
        }
        if (rules.enum && !rules.enum.includes(finalValue)) {
          errors.push(`${key} must be one of: ${rules.enum.join(', ')}`)
          continue
        }
      }

      validated[key] = finalValue
    }

    return { valid: errors.length === 0, errors, config: validated }
  }
}

export class ConfigManager {
  constructor() {
    this.config = null
    this.envConfig = null
    this.logger = null
  }

  async initialize() {
    this.logger = container.resolve('logger')

    const envConfig = this.loadEnvironmentConfig()

    const validation = ConfigValidator.validate(envConfig)

    if (!validation.valid) {
      throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`)
    }

    this.config = Object.freeze({
      ...validation.config,
      ...ENVIRONMENT_CONFIGS[validation.config.environment],
      constants: CONSTANTS,
    })

    this.logger.info('Configuration loaded and validated', {
      environment: this.config.environment,
      logLevel: this.config.logLevel,
    })
  }

  loadEnvironmentConfig() {
    const envPath = resolve(process.cwd(), '.env')
    let envVars = {}

    if (existsSync(envPath)) {
      const envContent = readFileSync(envPath, 'utf-8')
      envVars = Object.fromEntries(
        envContent
          .split('\n')
          .filter(line => line.includes('='))
          .map(line => line.split('=').map(s => s.trim()))
      )
    }

    return {
      prefix: process.env.PREFIX || envVars.PREFIX,
      ownerNumber: process.env.OWNER_NUMBER || envVars.OWNER_NUMBER,
      botName: process.env.BOT_NAME || envVars.BOT_NAME,
      version: process.env.VERSION || envVars.VERSION,
      authDir: process.env.AUTH_DIR || envVars.AUTH_DIR,
      environment: process.env.NODE_ENV || envVars.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || envVars.LOG_LEVEL,
    }
  }

  get(key) {
    if (!this.config) {
      throw new Error('Configuration not initialized')
    }
    return this.config[key]
  }

  getAll() {
    if (!this.config) {
      throw new Error('Configuration not initialized')
    }
    return this.config
  }

  isFeatureEnabled(feature) {
    return this.get(feature) === true
  }

  constant(key) {
    return this.get('constants')[key]
  }
}

container.singleton('configManager', () => new ConfigManager())

export const config = () => container.resolve('configManager').getAll()
export const get = key => container.resolve('configManager').get(key)
export const constant = key => container.resolve('configManager').constant(key)
