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
  isGroup: (jidStr) => isJidGroup(jidStr),

  /** @param {any} jidStr */
  isPN: (jidStr) => isPnUser(jidStr),

  /** @param {any} jidStr */
  isLID: (jidStr) => isLidUser(jidStr),

  /** @param {any} jidStr */
  isNewsletter: (jidStr) => isJidNewsletter(jidStr),

  /** @param {any} jidStr */
  isStatus: (jidStr) => isJidStatusBroadcast(jidStr),

  /** @param {any} jidStr */
  isBot: (jidStr) => isJidBot(jidStr),

  /** @param {any} jidStr */
  isMetaAI: (jidStr) => isJidMetaAI(jidStr),

  /*
   * Determine the sender of a message. In groups, the participant field holds the sender.
   * LIDs sometimes provide an alternative JID (participantAlt/remoteJidAlt) which we use
   * as a fallback to maintain consistency across different message sources.
   */

  /** @param {any} msg */
  getSender: (msg) => {
    const key = /** @type {any} */ (msg.key || {});

    if (isJidGroup(key.remoteJid)) {
      if (key.participant && isLidUser(key.participant) && key.participantAlt) {
        return key.participantAlt;
      }
      return key.participant || key.participantAlt;
    }

    if (key.remoteJid && isLidUser(key.remoteJid) && key.remoteJidAlt) {
      return key.remoteJidAlt;
    }
    return key.remoteJid;
  },

  /** @param {any} participant */
  getParticipantNumber: (participant) => {
    if (participant.phoneNumber) {
      return userDigitsFromJid(participant.phoneNumber);
    }
    return userDigitsFromJid(participant.id);
  },

  /** @param {any} jidStr */
  normalize: (jidStr) => jidNormalizedUser(jidStr) || '',
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

/*
 * Extract the target JID for an interactive message: the mentioned user, or the sender
 * of the quoted message. For quoted LIDs, we check the alternative participant field
 * to handle cases where the original JID format differs.
 */

/** @param {any} msg */
export const getTarget = (msg) => {
  const m = extractMessageContent(msg.message);
  const ctx = /** @type {IContextInfo|any} */ (m?.extendedTextMessage?.contextInfo);

  if (ctx?.mentionedJid?.length) {
    return ctx.mentionedJid[0];
  }

  if (ctx?.participant) {
    if (isLidUser(ctx.participant) && ctx.quotedParticipantAlt) {
      return ctx.quotedParticipantAlt;
    }
    return ctx.participant;
  }

  return null;
};

/** @param {any} userJid */
export const isOwner = (userJid) => {
  const owner = getOwner();
  if (!owner) return false;

  const userNum = jid.fromUser(userJid);
  if (!userNum) return false;

  const ownerNumbers = owner
    .split(',')
    .map((num) => num.replace(/[^0-9]/g, ''))
    .filter(Boolean);

  return ownerNumbers.includes(userNum);
};

/*
 * Resolve the sender of a message with fallback chain.
 * jid.getSender handles LID/group logic internally, but this adds
 * an additional fallback for edge cases where the primary method fails.
 */
/** @param {any} msg */
export const resolveSender = (msg) => {
  return jid.getSender(msg) || msg.key.participant || msg.key.remoteJid;
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
    return (
      units
        .map(([div, unit]) => {
          const val = Math.floor(seconds / div);
          seconds %= div;
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

  /** @param {any} sonic @param {any} msg @param {any} key @param {any} text */
  edit: (sonic, msg, key, text) => sonic.sendMessage(msg.key.remoteJid, { text, edit: key }),

  /** @param {any} sonic @param {any} msg @param {any} emoji @param {any} key */
  react: (sonic, msg, emoji, key = msg.key) =>
    sonic.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key },
    }),

  /** @param {any} sonic @param {any} msg @param {string} url @param {string} caption */
  image: (sonic, msg, url, caption = '') =>
    sonic.sendMessage(msg.key.remoteJid, { image: { url }, caption }, { quoted: msg }),
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
