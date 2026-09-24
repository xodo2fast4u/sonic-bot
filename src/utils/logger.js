import pino from 'pino';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const fileStream = pino.destination({ dest: './sonic-logs.txt', sync: true });
const streams = [{ level: 'trace', stream: fileStream }];

try {
  const prettyStream = require('pino-pretty')({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  });
  streams.unshift({ level: 'info', stream: prettyStream });
} catch (error) {
  void error;
}

const fileLogger = pino({ level: 'trace' }, pino.multistream(streams));

/** @param {any} target @param {string} level @param {any} value @param {any[]} args */
const write = (target, level, value, args) => {
  const [message, ...rest] = args;

  if (typeof value === 'string') {
    if (message instanceof Error) {
      target[level]({ err: message }, value, ...rest);
    } else if (message && typeof message === 'object') {
      target[level](message, value, ...rest);
    } else {
      target[level](value, ...args);
    }
    return;
  }

  if (typeof message === 'string') {
    target[level](value, message, ...rest);
  } else if (value !== undefined) {
    target[level](value, ...args);
  } else {
    target[level](...args);
  }
};

/** @param {any} target */
const createLogger = (target) => ({
  level: 'trace',
  /** @param {any} value @param {...any} args */
  info: (value, ...args) => write(target, 'info', value, args),
  /** @param {any} value @param {...any} args */
  error: (value, ...args) => write(target, 'error', value, args),
  /** @param {any} value @param {...any} args */
  fatal: (value, ...args) => write(target, 'fatal', value, args),
  /** @param {any} value @param {...any} args */
  warn: (value, ...args) => write(target, 'warn', value, args),
  /** @param {any} value @param {...any} args */
  trace: (value, ...args) => write(target, 'trace', value, args),
  /** @param {any} value @param {...any} args */
  debug: (value, ...args) => write(target, 'debug', value, args),
  /** @param {Record<string, any>} opts */
  child: (opts) => createLogger(target.child(opts)),
});

/* Preserve structured payloads for both application and Baileys log calls. */
const logger = createLogger(fileLogger);

export default logger;
