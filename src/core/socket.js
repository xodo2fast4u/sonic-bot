import makeWASocket, {
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
} from 'baileys';
import NodeCache from '@cacheable/node-cache';
import readline from 'readline';
import logger from '../utils/logger.js';
import { ensureRuntimeInitialized, handleMessage } from '../core/handler.js';
import { ConnectionSupervisor } from './connection-supervisor.js';
import { useSqliteAuthState } from '../database/use-sqlite-file-auth-state.js';
import { config, getOwner, setOwner } from '../config/config.js';
import { getErrorMessage } from '../utils/error-message.js';
import { handleGroupParticipantsUpdate } from './group-participants.js';

const msgRetryCache = new NodeCache();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/** @param {string} q */
const ask = (q) =>
  new Promise((resolve) => {
    rl.question(q, resolve);
  });

/** @type {any|null} */
let currentSocket = null;
/** @type {Awaited<ReturnType<typeof useSqliteAuthState>>|null} */
let currentAuthState = null;
/** @type {ConnectionSupervisor|null} */
let connectionSupervisor = null;
let shuttingDown = false;
/** @type {Promise<void>|null} */
let shutdownPromise = null;

/** @type {import('baileys').ILogger} */
const baileysLogger = {
  level: 'trace',
  /** @param {unknown} obj @param {string} [msg] */
  trace: (obj, msg) => logger.trace(obj, msg),
  /** @param {unknown} obj @param {string} [msg] */
  debug: (obj, msg) => logger.debug(obj, msg),
  /** @param {unknown} obj @param {string} [msg] */
  info: (obj, msg) => logger.info(obj, msg),
  /** @param {unknown} obj @param {string} [msg] */
  warn: (obj, msg) => logger.warn(obj, msg),
  /** @param {unknown} obj @param {string} [msg] */
  error: (obj, msg) => logger.error(obj, msg),
  /** @param {Record<string, unknown>} opts */
  child: (opts) => {
    const childLogger = logger.child(opts);
    return {
      level: 'trace',
      /** @param {unknown} obj @param {string} [msg] */
      trace: (obj, msg) => childLogger.trace(obj, msg),
      /** @param {unknown} obj @param {string} [msg] */
      debug: (obj, msg) => childLogger.debug(obj, msg),
      /** @param {unknown} obj @param {string} [msg] */
      info: (obj, msg) => childLogger.info(obj, msg),
      /** @param {unknown} obj @param {string} [msg] */
      warn: (obj, msg) => childLogger.warn(obj, msg),
      /** @param {unknown} obj @param {string} [msg] */
      error: (obj, msg) => childLogger.error(obj, msg),
      /** @param {Record<string, unknown>} childOpts */
      child: (childOpts) => baileysLogger.child({ ...opts, ...childOpts }),
    };
  },
};

const startSocketAttempt = async () => {
  if (shuttingDown) return;

  if (currentSocket) {
    currentSocket.ev.removeAllListeners();
    try {
      currentSocket.ws.close();
    } catch (error) {
      logger.debug('Previous socket was already closed', {
        error: getErrorMessage(error),
      });
    }
    currentSocket = null;
  }

  await ensureRuntimeInitialized();

  currentAuthState ||= await useSqliteAuthState(config.authDir);
  const { state, saveCreds } = currentAuthState;
  const { version, isLatest } = await fetchLatestBaileysVersion();

  baileysLogger.info(`🔌 WA v${version.join('.')} (latest: ${isLatest}), using Latest WA version`);

  const sonic = makeWASocket({
    version,
    browser: Browsers.windows('Chrome'),
    connectTimeoutMs: 15000,
    keepAliveIntervalMs: 25000,
    logger: baileysLogger,
    defaultQueryTimeoutMs: 45000,
    retryRequestDelayMs: 150,
    maxMsgRetryCount: 1,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    emitOwnEvents: true,
    fireInitQueries: true,
    markOnlineOnConnect: true,
    syncFullHistory: true,
    patchMessageBeforeSending: (msg) => msg,
    shouldSyncHistoryMessage: (msg) => {
      return msg.syncType !== 3;
    },
    shouldIgnoreJid: () => false,
    linkPreviewImageThumbnailWidth: 192,
    generateHighQualityLinkPreview: true,
    enableAutoSessionRecreation: true,
    enableRecentMessageCache: true,
    transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
    appStateMacVerification: {
      patch: false,
      snapshot: false,
    },
    countryCode: 'ZA',
    msgRetryCounterCache: msgRetryCache,
    getMessage: async () => undefined,
  });

  currentSocket = sonic;

  if (!sonic.authState.creds.registered) {
    const phone = await ask('📱 Enter phone number (with country code): ');
    const cleanPhone = phone.replace(/[^0-9]/g, '');

    const code = await sonic.requestPairingCode(cleanPhone);
    baileysLogger.info(`\n🔑 Pairing Code: ${code}\n`);

    if (!getOwner()) setOwner(cleanPhone);
  }

  sonic.ev.process(async (events) => {
    if (events['connection.update']) {
      const { connection, lastDisconnect } = events['connection.update'];

      if (connection === 'close') {
        const disconnectError = /** @type {any} */ (lastDisconnect?.error);
        const code = disconnectError?.output?.statusCode;
        connectionSupervisor?.handleDisconnect(code, disconnectError);
      }

      if (connection === 'open') {
        rl.close();
        connectionSupervisor?.markOpen();
        baileysLogger.info(`🦔 ${config.botName.toUpperCase()} CONNECTED!`);
        baileysLogger.info(`Prefix: ${config.prefix}`);
        baileysLogger.info(`Owner: ${getOwner() || 'Not set'}`);
      }
    }

    if (events['creds.update']) await saveCreds();

    if (events['lid-mapping.update']) {
      baileysLogger.info(`LID mapping update: ${JSON.stringify(events['lid-mapping.update'])}`);
    }

    if (events['messages.upsert']) {
      const { messages, type } = events['messages.upsert'];

      for (const msg of messages) {
        if (type !== 'notify' && !msg.key.fromMe) continue;

        await handleMessage(
          sonic,
          /** @type {import('../../types/index.js').WhatsAppMessage} */ (msg),
        ).catch((err) => baileysLogger.error(getErrorMessage(err)));
      }
    }

    if (events['group-participants.update']) {
      await handleGroupParticipantsUpdate(sonic, events['group-participants.update']);
    }
  });

  return sonic;
};

const closeCurrentSocket = async () => {
  const socket = currentSocket;
  currentSocket = null;
  if (!socket) return;

  socket.ev.removeAllListeners();
  const ws = socket.ws;
  if (!ws) return;

  if (ws.readyState !== 1) {
    try {
      ws.close();
    } catch {
      return;
    }
    return;
  }

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2000);
    timeout.unref?.();
    ws.once('close', () => {
      clearTimeout(timeout);
      resolve(undefined);
    });

    try {
      ws.close();
    } catch {
      clearTimeout(timeout);
      resolve(undefined);
    }
  });
};

export const shutdownSocket = async () => {
  if (shutdownPromise) return shutdownPromise;

  shuttingDown = true;
  connectionSupervisor?.shutdown();
  rl.close();
  shutdownPromise = closeCurrentSocket();
  await shutdownPromise;
  currentAuthState?.close();
  currentAuthState = null;
};

connectionSupervisor = new ConnectionSupervisor({
  connect: startSocketAttempt,
  logger: baileysLogger,
  onStop: async () => {
    await shutdownSocket();
    process.exit(1);
  },
});

/** @param {'SIGINT'|'SIGTERM'} signal */
const handleProcessSignal = (signal) => {
  logger.info(`Received ${signal}; closing connection cleanly`);
  void shutdownSocket()
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Failed to close connection cleanly', {
        error: getErrorMessage(error),
      });
      process.exit(1);
    });
};

process.once('SIGINT', () => handleProcessSignal('SIGINT'));
process.once('SIGTERM', () => handleProcessSignal('SIGTERM'));

export const startSocket = () => connectionSupervisor.start();
