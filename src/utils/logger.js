import pino from 'pino';

const fileLogger = pino({ level: 'trace' }, pino.destination('./sonic-logs.txt'));

/*
 * A wrapper that prints clean messages to the console AND logs them to the file.
 * Keeps the terminal clean from massive internal trace logs.
 */
const logger = {
  /** @param {any} msg @param {...any} args */
  info: (msg, ...args) => {
    console.log(msg, ...args);
    fileLogger.info(msg, ...args);
  },
  /** @param {any} msg @param {...any} args */
  error: (msg, ...args) => {
    console.error(msg, ...args);
    fileLogger.error(msg, ...args);
  },
  /** @param {any} msg @param {...any} args */
  fatal: (msg, ...args) => {
    console.error(msg, ...args);
    fileLogger.fatal(msg, ...args);
  },
  /** @param {any} msg @param {...any} args */
  warn: (msg, ...args) => {
    console.warn(msg, ...args);
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
