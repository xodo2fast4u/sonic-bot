import makeWASocket, {
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} from 'baileys';
import { useSqliteAuthState } from '../database/use-sqlite-file-auth-state.js';
import NodeCache from '@cacheable/node-cache';
import readline from 'readline';
import { config, getOwner, setOwner } from '../config/config.js';
import { handleMessage } from '../core/handler.js';
import logger from '../utils/logger.js';
const msgRetryCache = new NodeCache();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
const ask = (q) => new Promise((r) => rl.question(q, r));

let currentSocket = null;

export const startSocket = async () => {
  if (currentSocket) {
    currentSocket.ev.removeAllListeners();
    currentSocket.ws.close();
    currentSocket = null;
  }

  const { state, saveCreds } = await useSqliteAuthState(config.authDir);
  const { version, isLatest } = await fetchLatestBaileysVersion();

  logger.info(`🔌 WA v${version.join('.')} (latest: ${isLatest}), using Latest WA version`);

  const sonic = makeWASocket({
    version,
    browser: Browsers.windows('Chrome'),
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 30000,
    logger,
    defaultQueryTimeoutMs: 60000,
    retryRequestDelayMs: 300,
    maxMsgRetryCount: 10,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: true,
    syncFullHistory: true,
    patchMessageBeforeSending: (msg) => msg,
    shouldHistorySyncMessage: () => false,
    shouldIgnoreJid: () => false,
    linkPreviewImageThumbnailWidth: 192,
    generateHighQualityLinkPreview: true,
    enableAutoSessionRecreation: true,
    enableRecentMessageCache: true,
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
    logger.info(`\n🔑 Pairing Code: ${code}\n`);

    if (!getOwner()) setOwner(cleanPhone);
  }

  sonic.ev.process(async (events) => {
    if (events['connection.update']) {
      const { connection, lastDisconnect } = events['connection.update'];

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) {
          logger.fatal('🔴 Logged out. Delete sonic_session and restart.');
          process.exit(1);
        }
        logger.info('🔄 Reconnecting');
        startSocket();
      }

      if (connection === 'open') {
        rl.close();
        logger.info(`
╔══════════════════════════════════╗
║  🦔 ${config.botName.toUpperCase()} CONNECTED!
║  Prefix: ${config.prefix}
║  Owner: ${getOwner() || 'Not set'}
╚══════════════════════════════════╝`);
      }
    }

    if (events['creds.update']) await saveCreds();

    if (events['lid-mapping.update']) {
      // Store LID<->PN mappings if needed
      // logger.info('LID mapping update:', events['lid-mapping.update'])
    }

    if (events['messages.upsert']) {
      const { messages, type } = events['messages.upsert'];
      if (type !== 'notify') return;

      for (const msg of messages) {
        await handleMessage(sonic, msg).catch((err) => logger.error(err));
      }
    }

    if (events['group-participants.update']) {
      // const { id, participants, action } = events['group-participants.update']
      // action: 'add' | 'remove' | 'promote' | 'demote'
    }
  });

  return sonic;
};
