import { DisconnectReason } from 'baileys';

export const CONNECTION_RETRY_POLICY = Object.freeze({
  maxAttempts: 10,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  stableDurationMs: 60000,
});

/** @param {number|undefined} code @returns {'restart'|'stop'|'retry'} */
export const classifyDisconnect = (code) => {
  if (code === DisconnectReason.restartRequired) return 'restart';

  if (
    [
      DisconnectReason.loggedOut,
      DisconnectReason.badSession,
      DisconnectReason.forbidden,
      DisconnectReason.multideviceMismatch,
      DisconnectReason.connectionReplaced,
    ].includes(/** @type {number} */ (code))
  ) {
    return 'stop';
  }

  return 'retry';
};

/** @param {number} attempt @param {number} [randomValue] */
export const getReconnectDelay = (attempt, randomValue = Math.random()) => {
  const exponentialDelay = CONNECTION_RETRY_POLICY.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const jitteredDelay = Math.round(exponentialDelay * (0.8 + randomValue * 0.4));
  return Math.min(CONNECTION_RETRY_POLICY.maxDelayMs, jitteredDelay);
};

export class ConnectionSupervisor {
  /**
   * @param {{
   *   connect: () => Promise<unknown>|unknown,
   *   onStop: (reason: unknown) => Promise<unknown>|unknown,
   *   logger: any,
   *   maxAttempts?: number,
   *   stableDurationMs?: number,
   *   random?: () => number,
   *   setTimeoutFn?: typeof setTimeout,
   *   clearTimeoutFn?: typeof clearTimeout,
   * }} options
   */
  constructor(options) {
    this.connect = options.connect;
    this.onStop = options.onStop;
    this.logger = options.logger;
    this.maxAttempts = options.maxAttempts ?? CONNECTION_RETRY_POLICY.maxAttempts;
    this.stableDurationMs = options.stableDurationMs ?? CONNECTION_RETRY_POLICY.stableDurationMs;
    this.random = options.random ?? Math.random;
    this.setTimeoutFn = options.setTimeoutFn ?? setTimeout;
    this.clearTimeoutFn = options.clearTimeoutFn ?? clearTimeout;
    this.attempts = 0;
    this.stopped = false;
    this.startPromise = null;
    this.retryTimer = null;
    this.stabilityTimer = null;
  }

  async start() {
    if (this.stopped || this.startPromise) return;

    this.clearTimer('retryTimer');
    this.startPromise = (async () => {
      try {
        await this.connect();
      } catch (error) {
        this.handleDisconnect(undefined, error);
      }
    })();

    try {
      await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  /** @param {number|undefined} code @param {unknown} error */
  handleDisconnect(code, error) {
    if (this.stopped || this.retryTimer) return;

    this.clearTimer('stabilityTimer');
    const action = classifyDisconnect(code);
    if (action === 'stop') {
      this.stop(error, `Connection requires operator action (code ${code ?? 'unknown'}).`);
      return;
    }

    if (this.attempts >= this.maxAttempts) {
      this.stop(error, `Reconnect limit reached after ${this.maxAttempts} attempts.`);
      return;
    }

    this.attempts += 1;
    const delay = action === 'restart' ? 0 : getReconnectDelay(this.attempts, this.random());

    this.logger.warn('Connection closed: retry scheduled', {
      code,
      attempt: this.attempts,
      maxAttempts: this.maxAttempts,
      delayMs: delay,
      error: error instanceof Error ? error.message : String(error ?? ''),
    });

    this.retryTimer = this.setTimeoutFn(() => {
      this.retryTimer = null;
      void this.start();
    }, delay);
    this.retryTimer?.unref?.();
  }

  markOpen() {
    if (this.stopped) return;

    this.clearTimer('stabilityTimer');
    this.stabilityTimer = this.setTimeoutFn(() => {
      this.stabilityTimer = null;
      this.attempts = 0;
      this.logger.info('Connection stable: reconnect budget reset');
    }, this.stableDurationMs);
    this.stabilityTimer?.unref?.();
  }

  /** @param {unknown} reason @param {string} message */
  stop(reason, message) {
    if (this.stopped) return;

    this.stopped = true;
    this.clearTimer('retryTimer');
    this.clearTimer('stabilityTimer');
    this.logger.fatal(message, {
      error: reason instanceof Error ? reason.message : String(reason ?? ''),
    });
    void Promise.resolve(this.onStop(reason)).catch((error) => {
      this.logger.fatal('Failed to stop the connection cleanly', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  shutdown() {
    this.stopped = true;
    this.clearTimer('retryTimer');
    this.clearTimer('stabilityTimer');
  }

  /** @param {'retryTimer'|'stabilityTimer'} timerName */
  clearTimer(timerName) {
    if (this[timerName]) {
      this.clearTimeoutFn(this[timerName]);
      this[timerName] = null;
    }
  }
}
