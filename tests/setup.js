process.env.NODE_ENV = 'test';

const originalConsole = { ...console };

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

global.testUtils = {
  createMockMessage: (overrides = {}) => ({
    key: {
      remoteJid: '1234567890@s.whatsapp.net',
      id: 'test-message-id',
      participant: '1234567890@s.whatsapp.net',
      ...overrides.key,
    },
    message: {
      conversation: 'test message',
      extendedTextMessage: {
        text: 'test message',
      },
      ...overrides.message,
    },
    messageTimestamp: Date.now(),
    ...overrides,
  }),

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

  waitFor: (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms)),

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
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
