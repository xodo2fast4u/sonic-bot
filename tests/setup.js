import { jest } from '@jest/globals';

const isUtilityOnlyTest =
  process.argv.some((argument) => argument.endsWith('utils.test.js')) &&
  !process.argv.some((argument) => argument.endsWith('database.test.js'));

if (!isUtilityOnlyTest) {
  await import('../src/config/config-manager.js');
  await import('../src/utils/utils.js');
  await import('../src/commands/middleware-pipeline.js');
}

await import('../src/utils/enhanced-logger.js');
await import('../src/utils/enhanced-cooldown.js');
await import('../src/cache/cache-manager.js');
await import('../src/database/connection-pool.js');
await import('../src/commands/command-registry.js');

process.env.NODE_ENV = 'test';
global.jest = jest;

import logger from '../src/utils/logger.js';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

global.testUtils = {
  createMockMessage: (overrides = {}) => {
    const conversation = overrides.message?.conversation ?? 'test message';
    const message = { conversation, ...overrides.message };
    const key = {
      remoteJid: '1234567890@s.whatsapp.net',
      id: 'test-message-id',
      participant: '1234567890@s.whatsapp.net',
      ...overrides.key,
    };

    if (overrides.key?.participant && !overrides.key.remoteJid) {
      key.remoteJid = overrides.key.participant;
    }

    if (message.extendedTextMessage) {
      message.extendedTextMessage = {
        text: conversation,
        ...message.extendedTextMessage,
      };
    }

    return {
      ...overrides,
      key,
      message,
      messageTimestamp: Date.now(),
    };
  },

  createMockUser: (overrides = {}) => ({
    id: '1234567890@s.whatsapp.net',
    balance: 1000,
    bank: 500,
    totalEarned: 2000,
    createdAt: Date.now() - 86400000, // 1 day ago
    ...overrides,
  }),

  createMockCommand: (overrides = {}) => ({
    cmd: ['test'],
    desc: 'Test command',
    run: jest.fn(),
    category: 'test',
    ...overrides,
  }),

  waitFor: (ms = 0) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),

  createMockContainer: () => {
    const services = new Map();

    return {
      register: (name, factory) => services.set(name, factory),
      resolve: (name) => {
        const factory = services.get(name);
        if (!factory) {
          throw new Error(`Service ${name} not registered`);
        }
        return typeof factory === 'function' ? factory() : factory;
      },
      has: (name) => services.has(name),
      clear: () => services.clear(),
    };
  },

  createMockLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    fatal: jest.fn(),
    trace: jest.fn(),
    timer: jest.fn(() => ({
      end: jest.fn(),
    })),
  }),

  createMockCache: () => {
    const cache = new Map();

    return {
      get: jest.fn((key) => cache.get(key) || null),
      set: jest.fn((key, value) => cache.set(key, value)),
      delete: jest.fn((key) => cache.delete(key)),
      clear: jest.fn(() => cache.clear()),
      has: jest.fn((key) => cache.has(key)),
      keys: jest.fn(() => Array.from(cache.keys())),
      size: jest.fn(() => cache.size),
    };
  },

  createMockDatabase: () => ({
    execute: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    transaction: jest.fn((callback) => callback()),
    close: jest.fn(),
  }),

  expectRejection: async (promise, expectedError) => {
    await expect(promise).rejects.toThrow(expectedError);
  },

  expectResolution: async (promise, expectedValue) => {
    await expect(promise).resolves.toBe(expectedValue);
  },
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception:', error);
});
