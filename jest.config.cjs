module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js', '!src/**/*.spec.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 25,
      lines: 20,
      statements: 20,
    },
    './src/core/': {
      branches: 25,
      functions: 25,
      lines: 25,
      statements: 25,
    },
    './src/database/': {
      branches: 30,
      functions: 30,
      lines: 30,
      statements: 30,
    },
  },
  setupFiles: ['./tests/setup-env.cjs'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@cache/(.*)$': '<rootDir>/src/cache/$1',
  },
  transform: {},
  transformIgnorePatterns: ['node_modules/(?!(baileys)/)'],
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
  maxWorkers: '50%',
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
      },
    ],
  ],
  globals: {
    'process.env': {},
  },
};
