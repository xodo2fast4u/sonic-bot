import makeWASocket, {
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} from 'baileys';
import NodeCache from '@cacheable/node-cache';
import readline from 'readline';
import logger from '../utils/logger.js';
import { ensureRuntimeInitialized, handleMessage } from '../core/handler.js';
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
const ask = (q) => new Promise((r) => rl.question(q, r));

/** @type {any|null} */
let currentSocket = null;

/** @type {import('baileys').ILogger} */
const baileysLogger = {
  level: 'trace',
  /** @param {unknown} obj @param {string} [msg] */
  trace: (obj, msg) => logger.trace(msg ?? obj),
  /** @param {unknown} obj @param {string} [msg] */
  debug: (obj, msg) => logger.debug(msg ?? obj),
  /** @param {unknown} obj @param {string} [msg] */
  info: (obj, msg) => logger.info(msg ?? obj),
  /** @param {unknown} obj @param {string} [msg] */
  warn: (obj, msg) => logger.warn(msg ?? obj),
  /** @param {unknown} obj @param {string} [msg] */
  error: (obj, msg) => logger.error(msg ?? obj),
  /** @param {Record<string, unknown>} opts */
  child: (opts) => {
    const childLogger = logger.child(opts);
    return {
      level: 'trace',
      /** @param {unknown} obj @param {string} [msg] */
      trace: (obj, msg) => childLogger.trace(msg ?? obj),
      /** @param {unknown} obj @param {string} [msg] */
      debug: (obj, msg) => childLogger.debug(msg ?? obj),
      /** @param {unknown} obj @param {string} [msg] */
      info: (obj, msg) => childLogger.info(msg ?? obj),
      /** @param {unknown} obj @param {string} [msg] */
      warn: (obj, msg) => childLogger.warn(msg ?? obj),
      /** @param {unknown} obj @param {string} [msg] */
      error: (obj, msg) => childLogger.error(msg ?? obj),
      /** @param {Record<string, unknown>} childOpts */
      child: (childOpts) => baileysLogger.child({ ...opts, ...childOpts }),
    };
  },
};

export const startSocket = async () => {
  if (currentSocket) {
    currentSocket.ev.removeAllListeners();
    currentSocket.ws.close();
    currentSocket = null;
  }

  await ensureRuntimeInitialized();

  const { state, saveCreds } = await useSqliteAuthState(config.authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  baileysLogger.info(`🔌 WA v${version.join('.')} (latest: ${isLatest}), using Latest WA version`);

  const sonic = makeWASocket({
    version,
    browser: Browsers.windows('Chrome'),
    connectTimeoutMs: 15000,
    keepAliveIntervalMs: 25000,
    logger: baileysLogger,
    defaultQueryTimeoutMs: 45000,
    retryRequestDelayMs: 250,
    maxMsgRetryCount: 10,
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
        if (code === DisconnectReason.loggedOut) {
          baileysLogger.error('🔴 Logged out. Delete sonic_session and restart.');
          process.exit(1);
        }
        baileysLogger.info('🔄 Reconnecting');
        startSocket();
      }

      if (connection === 'open') {
        rl.close();
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
      if (type !== 'notify') return;

      for (const msg of messages) {
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
