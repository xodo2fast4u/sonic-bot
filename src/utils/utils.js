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

const userDigitsFromJid = (jidStr) => jidDecode(jidStr)?.user || '';

export const jid = {
  decode: (rawJid) => jidDecode(rawJid),

  encode: (user, server, device, agent) => jidEncode(user, server, device, agent),

  toUser: (num) => jidEncode(num?.replace(/[^0-9]/g, ''), 's.whatsapp.net'),

  fromUser: userDigitsFromJid,

  isGroup: (jidStr) => isJidGroup(jidStr),

  isPN: (jidStr) => isPnUser(jidStr),

  isLID: (jidStr) => isLidUser(jidStr),

  isNewsletter: (jidStr) => isJidNewsletter(jidStr),

  isStatus: (jidStr) => isJidStatusBroadcast(jidStr),

  isBot: (jidStr) => isJidBot(jidStr),

  isMetaAI: (jidStr) => isJidMetaAI(jidStr),

  /*
   * Determine the sender of a message. In groups, the participant field holds the sender.
   * LIDs sometimes provide an alternative JID (participantAlt/remoteJidAlt) which we use
   * as a fallback to maintain consistency across different message sources.
   */

  getSender: (msg) => {
    const key = msg.key;

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

  getParticipantNumber: (participant) => {
    if (participant.phoneNumber) {
      return userDigitsFromJid(participant.phoneNumber);
    }
    return userDigitsFromJid(participant.id);
  },

  normalize: (jidStr) => jidNormalizedUser(jidStr) || '',
};

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

/*
 * Extract the target JID for an interactive message: the mentioned user, or the sender
 * of the quoted message. For quoted LIDs, we check the alternative participant field
 * to handle cases where the original JID format differs.
 */

export const getTarget = (msg) => {
  const m = extractMessageContent(msg.message);
  const ctx = m?.extendedTextMessage?.contextInfo;

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

export const isOwner = (userJid) => {
  const owner = getOwner();
  if (!owner) return false;

  const userNum = jid.fromUser(userJid);

  const ownerNum = owner.replace(/[^0-9]/g, '');

  return userNum === ownerNum;
};

/*
 * Resolve the sender of a message with fallback chain.
 * jid.getSender handles LID/group logic internally, but this adds
 * an additional fallback for edge cases where the primary method fails.
 */
export const resolveSender = (msg) => {
  return jid.getSender(msg) || msg.key.participant || msg.key.remoteJid;
};

export const format = {
  getUptime: () => {
    const seconds = (Date.now() - state.startTime) / 1000;
    return format.uptime(seconds);
  },

  uptime: (seconds) => {
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

  bytes: (bytes) => {
    if (!bytes) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(2)} ${['B', 'KB', 'MB', 'GB'][i]}`;
  },
};

export const send = {
  text: (sonic, msg, text) => sonic.sendMessage(msg.key.remoteJid, { text }, { quoted: msg }),

  mention: (sonic, msg, text, mentions) =>
    sonic.sendMessage(msg.key.remoteJid, { text, mentions }, { quoted: msg }),

  edit: (sonic, msg, key, text) => sonic.sendMessage(msg.key.remoteJid, { text, edit: key }),

  react: (sonic, msg, emoji, key = msg.key) =>
    sonic.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key },
    }),

  image: (sonic, msg, url, caption = '') =>
    sonic.sendMessage(msg.key.remoteJid, { image: { url }, caption }, { quoted: msg }),
};
