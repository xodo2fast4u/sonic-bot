import pino from 'pino';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

process.env['TZ'] ??= 'Africa/Johannesburg';

const streams = [{ stream: pino.destination('./sonic-logs.txt') }];
let prettyStream;

try {
  prettyStream = require('pino-pretty')({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  });
} catch {
  prettyStream = null;
}

if (prettyStream) streams.unshift({ stream: prettyStream });

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
