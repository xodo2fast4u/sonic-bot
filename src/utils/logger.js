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

/*
 * A wrapper that sends pretty output to the terminal and structured output to the log file.
 */
const logger = {
  /** @param {any} msg @param {...any} args */
  info: (msg, ...args) => {
    fileLogger.info(msg, ...args);
  },
  /** @param {any} msg @param {...any} args */
  error: (msg, ...args) => {
    fileLogger.error(msg, ...args);
  },
  /** @param {any} msg @param {...any} args */
  fatal: (msg, ...args) => {
    fileLogger.fatal(msg, ...args);
  },
  /** @param {any} msg @param {...any} args */
  warn: (msg, ...args) => {
    fileLogger.warn(msg, ...args);
  },
  /** @param {any} msg @param {...any} args */
  trace: (msg, ...args) => fileLogger.trace(msg, ...args),
  /** @param {any} msg @param {...any} args */
  debug: (msg, ...args) => fileLogger.debug(msg, ...args),
  /** @param {Record<string, any>} opts */
  child: (opts) => fileLogger.child(opts),
};

export default logger;
