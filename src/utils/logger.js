import pino from 'pino'

const fileLogger = pino({ level: 'trace' }, pino.destination('./sonic-logs.txt'))

/*
 * A wrapper that prints clean messages to the console AND logs them to the file.
 * Keeps the terminal clean from massive internal trace logs.
 */
const logger = {
  info: (msg, ...args) => {
    console.log(msg, ...args)
    fileLogger.info(msg, ...args)
  },
  error: (msg, ...args) => {
    console.error(msg, ...args)
    fileLogger.error(msg, ...args)
  },
  fatal: (msg, ...args) => {
    console.error(msg, ...args)
    fileLogger.fatal(msg, ...args)
  },
  warn: (msg, ...args) => {
    console.warn(msg, ...args)
    fileLogger.warn(msg, ...args)
  },
  trace: (msg, ...args) => fileLogger.trace(msg, ...args),
  debug: (msg, ...args) => fileLogger.debug(msg, ...args),
  child: opts => fileLogger.child(opts),
}

export default logger
