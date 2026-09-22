import {
  jidDecode,
  jidEncode,
  isJidGroup,
  isJidStatusBroadcast,
  isJidNewsletter,
  isPnUser,
  isLidUser,
  isJidMetaAI,
  isJidBot,
  jidNormalizedUser,
  extractMessageContent,
} from 'baileys';
import { getOwner } from '../config/config.js';
import { state } from '../core/state.js';
import { container } from '../core/container.js';

/** @param {any} jidStr */
const userDigitsFromJid = (jidStr) => {
  if (!jidStr || typeof jidStr !== 'string') return '';
  if (/^\d+$/.test(jidStr)) return jidStr;
  const decoded = jidDecode(jidStr);
  if (decoded?.user) return decoded.user;
  return (jidStr.split('@').shift() ?? '').replace(/[^0-9]/g, '') || '';
};

export const jid = {
  /** @param {any} rawJid */
  decode: (rawJid) => jidDecode(rawJid),

  /** @param {any} user @param {any} server @param {any} device @param {any} agent */
  encode: (user, server, device, agent) => jidEncode(user, server, device, agent),

  /** @param {any} num */
  toUser: (num) => jidEncode(num?.replace(/[^0-9]/g, ''), 's.whatsapp.net'),

  fromUser: userDigitsFromJid,

  /** @param {any} jidStr */
  isGroup: (jidStr) => typeof jidStr === 'string' && isJidGroup(jidStr),

  /** @param {any} jidStr */
  isPN: (jidStr) => typeof jidStr === 'string' && isPnUser(jidStr),

  /** @param {any} jidStr */
  isLID: (jidStr) => typeof jidStr === 'string' && isLidUser(jidStr),

  /** @param {any} jidStr */
  isNewsletter: (jidStr) => typeof jidStr === 'string' && isJidNewsletter(jidStr),

  /** @param {any} jidStr */
  isStatus: (jidStr) => typeof jidStr === 'string' && isJidStatusBroadcast(jidStr),

  /** @param {any} jidStr */
  isBot: (jidStr) => typeof jidStr === 'string' && isJidBot(jidStr),

  /** @param {any} jidStr */
  isMetaAI: (jidStr) => typeof jidStr === 'string' && isJidMetaAI(jidStr),

  /**
   * Determine the sender of a message. In groups, the participant field holds the sender.
   * LIDs provide an alternative JID (participantAlt/remoteJidAlt) which we use
   * to maintain consistency across different message sources.
   * @param {any} msg
   * @param {any} [sonic]
   */
  getSender: (msg, sonic) => {
    const key = /** @type {any} */ (msg.key || {});

    let candidate = key.remoteJid;
    if (typeof key.remoteJid === 'string' && isJidGroup(key.remoteJid)) {
      candidate = key.participantAlt || key.participant || key.remoteJid;
      if (typeof key.participant === 'string' && isLidUser(key.participant) && key.participantAlt) {
        candidate = key.participantAlt;
      }
    } else if (typeof key.remoteJid === 'string' && isLidUser(key.remoteJid) && key.remoteJidAlt) {
      candidate = key.remoteJidAlt;
    }

    if (
      typeof candidate === 'string' &&
      isLidUser(candidate) &&
      sonic?.signalRepository?.lidMapping?.getPNForLID
    ) {
      try {
        const cachedPn = sonic.signalRepository.lidMapping.getPNForLID(candidate);
        if (cachedPn) return cachedPn;
      } catch (e) {
        void e;
      }
    }

    return typeof candidate === 'string' ? candidate : '';
  },

  /** @param {any} participant */
  getParticipantNumber: (participant) => {
    if (participant.phoneNumber) {
      return userDigitsFromJid(participant.phoneNumber);
    }
    return userDigitsFromJid(participant.id);
  },

  /** @param {any} jidStr */
  normalize: (jidStr) => {
    const normalized = jidNormalizedUser(jidStr) || '';
    const [user, server] = normalized.split('@');
    return user && server ? `${user}@${server.toLowerCase()}` : normalized;
  },
};

/** @param {any} msg */
export const getText = (msg) => {
  const m = extractMessageContent(msg.message);
  return (
    m?.conversation ||
    m?.extendedTextMessage?.text ||
    m?.imageMessage?.caption ||
    m?.videoMessage?.caption ||
    ''
  );
};

/**
 * @typedef {Object} IContextInfo
 * @property {string[]} [mentionedJid]
 * @property {string} [participant]
 * @property {string} [quotedParticipantAlt]
 */

/**
 * Extract the target JID for an interactive message: the mentioned user or the sender
 * of the quoted message.
 * @param {any} msg
 * @param {any} [sonic]
 */
export const getTarget = (msg, sonic) => {
  const m = extractMessageContent(msg.message);
  const ctx = /** @type {IContextInfo|any} */ (m?.extendedTextMessage?.contextInfo);

  let target = null;

  if (ctx?.mentionedJid?.length) {
    target = ctx.mentionedJid[0];
  } else if (ctx?.participant) {
    if (isLidUser(ctx.participant) && ctx.quotedParticipantAlt) {
      target = ctx.quotedParticipantAlt;
    } else {
      target = ctx.participant;
    }
  }

  if (target && isLidUser(target)) {
    if (ctx?.quotedParticipantAlt) {
      target = ctx.quotedParticipantAlt;
    } else if (sonic?.signalRepository?.lidMapping?.getPNForLID) {
      try {
        const cachedPn = sonic.signalRepository.lidMapping.getPNForLID(target);
        if (cachedPn) target = cachedPn;
      } catch (e) {
        void e;
      }
    }
  }

  return target;
};

/**
 * Check if a given user JID is registered as the bot owner.
 * @param {any} userJid
 * @param {any} [sonic]
 * @param {any} [msg]
 */
export const isOwner = (userJid, sonic, msg) => {
  const owner = process.env['OWNER_NUMBER']?.trim() || getOwner();
  if (!owner) return false;

  const ownerNumbers = owner
    .split(',')
    .map((num) => num.replace(/[^0-9]/g, ''))
    .filter(Boolean);

  if (!userJid) return false;

  let userNum = userDigitsFromJid(userJid);

  if (msg?.key) {
    if (msg.key.participantAlt) {
      const altNum = userDigitsFromJid(msg.key.participantAlt);
      if (ownerNumbers.includes(altNum)) return true;
    }
    if (msg.key.remoteJidAlt) {
      const altNum = userDigitsFromJid(msg.key.remoteJidAlt);
      if (ownerNumbers.includes(altNum)) return true;
    }
  }

  if (isLidUser(userJid) && sonic?.signalRepository?.lidMapping?.getPNForLID) {
    try {
      const pnJid = sonic.signalRepository.lidMapping.getPNForLID(userJid);
      if (pnJid) {
        const pnNum = userDigitsFromJid(pnJid);
        if (ownerNumbers.includes(pnNum)) return true;
      }
    } catch (e) {
      void e;
    }
  }

  return ownerNumbers.includes(userNum);
};

/**
 * Resolve the sender of a message with fallback chain.
 * jid.getSender handles LID/group logic internally but this adds
 * an additional fallback for edge cases where the primary method fails.
 * @param {any} msg
 * @param {any} [sonic]
 */
export const resolveSender = (msg, sonic) => {
  const sender = jid.getSender(msg, sonic) || msg.key.participant || msg.key.remoteJid;
  return typeof sender === 'string' ? sender : '';
};

export const format = {
  getUptime: () => {
    const seconds = (Date.now() - state.startTime) / 1000;
    return format.uptime(seconds);
  },

  /** @param {number} seconds */
  uptime: (seconds) => {
    /** @type {[number,string][]} */
    const units = [
      [86400, 'd'],
      [3600, 'h'],
      [60, 'm'],
      [1, 's'],
    ];

    let remaining = seconds;
    return (
      units
        .map(([div, unit]) => {
          const val = Math.floor(remaining / div);
          remaining %= div;
          return val ? `${val}${unit}` : '';
        })
        .filter(Boolean)
        .join(' ') || '0s'
    );
  },

  /** @param {number} bytes */
  bytes: (bytes) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(2)} ${['B', 'KB', 'MB', 'GB'][i]}`;
  },
};

export const send = {
  /** @param {any} sonic @param {any} msg @param {any} text */
  text: (sonic, msg, text) => sonic.sendMessage(msg.key.remoteJid, { text }, { quoted: msg }),

  /** @param {any} sonic @param {any} msg @param {any} text @param {any[]} mentions */
  mention: (sonic, msg, text, mentions) =>
    sonic.sendMessage(msg.key.remoteJid, { text, mentions }, { quoted: msg }),

  /** @param {any} sonic @param {any} msg @param {string} displayName @param {string[]} phoneNumbers */
  contact: (sonic, msg, displayName, phoneNumbers) => {
    const contacts = phoneNumbers
      .map((phoneNumber) => String(phoneNumber).replace(/[^0-9]/g, ''))
      .filter(Boolean)
      .map((phoneNumber) => ({
        displayName,
        vcard: [
          'BEGIN:VCARD',
          'VERSION:3.0',
          `FN:${displayName}`,
          `TEL;type=CELL;type=VOICE;waid=${phoneNumber}:${phoneNumber}`,
          'END:VCARD',
        ].join('\n'),
      }));

    return sonic.sendMessage(
      msg.key.remoteJid,
      {
        contacts: {
          displayName,
          contacts,
        },
      },
      { quoted: msg },
    );
  },

  /** @param {any} sonic @param {any} msg @param {any} key @param {any} text @param {any[]} [mentions] */
  edit: (sonic, msg, key, text, mentions = []) =>
    sonic.sendMessage(msg.key.remoteJid, {
      text,
      edit: key,
      ...(mentions.length ? { mentions } : {}),
    }),

  /** @param {any} sonic @param {any} msg @param {any} emoji @param {any} key */
  react: (sonic, msg, emoji, key = msg.key) =>
    sonic.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key },
    }),

  /**
   * @param {any} sonic
   * @param {any} msg
   * @param {string|Buffer} source
   * @param {string} caption
   * @param {string} [mimetype]
   * @param {any[]} [mentions]
   */
  image: (sonic, msg, source, caption = '', mimetype, mentions = []) =>
    sonic.sendMessage(
      msg.key.remoteJid,
      {
        image: typeof source === 'string' ? { url: source } : source,
        caption,
        ...(mimetype ? { mimetype } : {}),
        ...(mentions.length ? { mentions } : {}),
      },
      { quoted: msg },
    ),

  /** @param {any} sonic @param {any} msg @param {Buffer} sticker */
  sticker: (sonic, msg, sticker) =>
    sonic.sendMessage(msg.key.remoteJid, { sticker }, { quoted: msg }),

  /**
   * @param {any} sonic
   * @param {any} msg
   * @param {Buffer} audio
   * @param {Uint8Array} waveform
   * @param {number} seconds
   */
  voice: (sonic, msg, audio, waveform, seconds) =>
    sonic.sendMessage(
      msg.key.remoteJid,
      {
        audio,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        waveform,
        seconds,
      },
      { quoted: msg },
    ),
};

container.singleton('utils', () => ({
  jid,
  getText,
  getTarget,
  isOwner,
  resolveSender,
  format,
  send,
}));
