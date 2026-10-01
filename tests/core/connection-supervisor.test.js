import { DisconnectReason } from 'baileys';
import {
  classifyDisconnect,
  CONNECTION_RETRY_POLICY,
  ConnectionSupervisor,
  getReconnectDelay,
} from '../../src/core/connection-supervisor.js';

describe('ConnectionSupervisor', () => {
  const createSupervisor = (overrides = {}) => {
    const scheduled = [];
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      fatal: jest.fn(),
    };
    const supervisor = new ConnectionSupervisor({
      connect: jest.fn(),
      onStop: jest.fn(),
      logger,
      setTimeoutFn: (callback, delay) => {
        const timer = { callback, delay, unref: jest.fn() };
        scheduled.push(timer);
        return /** @type {any} */ (timer);
      },
      clearTimeoutFn: jest.fn(),
      random: () => 0.5,
      ...overrides,
    });

    return { supervisor, scheduled, logger };
  };

  test('retries transient disconnects with exponential delay and jitter', () => {
    const { supervisor, scheduled, logger } = createSupervisor({ random: () => 0 });

    supervisor.handleDisconnect(DisconnectReason.connectionLost, new Error('offline'));

    expect(scheduled[0].delay).toBe(800);
    expect(supervisor.attempts).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Connection closed: retry scheduled',
      expect.objectContaining({ attempt: 1, maxAttempts: 10, delayMs: 800 }),
    );
  });

  test('coalesces duplicate close notifications into one retry', () => {
    const { supervisor, scheduled } = createSupervisor();

    supervisor.handleDisconnect(DisconnectReason.connectionLost, new Error('offline'));
    supervisor.handleDisconnect(DisconnectReason.connectionLost, new Error('offline'));

    expect(scheduled).toHaveLength(1);
    expect(supervisor.attempts).toBe(1);
  });

  test('caps retry delay and stops after the configured attempt limit', async () => {
    const scheduled = [];
    let supervisor;
    supervisor = new ConnectionSupervisor({
      connect: () => supervisor.handleDisconnect(undefined, new Error('offline')),
      onStop: jest.fn(),
      logger: { info: jest.fn(), warn: jest.fn(), fatal: jest.fn() },
      maxAttempts: 2,
      setTimeoutFn: (callback, delay) => {
        const timer = { callback, delay, unref: jest.fn() };
        scheduled.push(timer);
        return /** @type {any} */ (timer);
      },
      clearTimeoutFn: jest.fn(),
      random: () => 0.5,
    });

    supervisor.handleDisconnect(undefined, new Error('offline'));
    scheduled[0].callback();
    await new Promise((resolve) => {
      setImmediate(resolve);
    });
    scheduled[1].callback();
    await new Promise((resolve) => {
      setImmediate(resolve);
    });

    expect(scheduled).toHaveLength(2);
    expect(supervisor.stopped).toBe(true);
  });

  test('retries restart-required immediately', () => {
    const { supervisor, scheduled } = createSupervisor();

    supervisor.handleDisconnect(DisconnectReason.restartRequired, new Error('restart'));

    expect(scheduled[0].delay).toBe(0);
  });

  test('stops instead of retrying nonrecoverable disconnects', () => {
    const { supervisor, scheduled, logger } = createSupervisor();

    supervisor.handleDisconnect(DisconnectReason.loggedOut, new Error('logged out'));

    expect(scheduled).toHaveLength(0);
    expect(supervisor.stopped).toBe(true);
    expect(logger.fatal).toHaveBeenCalledWith(
      'Connection requires operator action (code 401).',
      expect.any(Object),
    );
  });

  test('resets attempts only after the connection stays open', () => {
    const { supervisor, scheduled, logger } = createSupervisor({ stableDurationMs: 60 });
    supervisor.handleDisconnect(DisconnectReason.connectionLost, new Error('offline'));
    supervisor.markOpen();

    expect(supervisor.attempts).toBe(1);
    scheduled[1].callback();
    expect(supervisor.attempts).toBe(0);
    expect(logger.info).toHaveBeenCalledWith('Connection stable: reconnect budget reset');
  });

  test('uses a bounded jittered backoff', () => {
    expect(getReconnectDelay(1, 1)).toBe(1200);
    expect(getReconnectDelay(20, 1)).toBe(CONNECTION_RETRY_POLICY.maxDelayMs);
  });

  test.each([
    DisconnectReason.badSession,
    DisconnectReason.forbidden,
    DisconnectReason.multideviceMismatch,
    DisconnectReason.connectionReplaced,
  ])('classifies disconnect code %s as requiring operator action', (code) => {
    expect(classifyDisconnect(code)).toBe('stop');
  });
});
