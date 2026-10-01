import { getBotSetting, setBotSetting } from '../database/database.js';
import { jid } from '../utils/utils.js';

const BANNED_USERS_SETTING_KEY = 'banned_users';

/** @type {Set<string>|null} */
let bannedUsers = null;

const loadBannedUsers = () => {
  if (bannedUsers) return bannedUsers;

  try {
    const stored = getBotSetting(BANNED_USERS_SETTING_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    bannedUsers = new Set(
      Array.isArray(parsed)
        ? parsed.filter((userId) => typeof userId === 'string' && /^\d+$/.test(userId))
        : [],
    );
  } catch {
    bannedUsers = new Set();
  }

  return bannedUsers;
};

/** @param {unknown} value @returns {string} */
export const normalizeBanTarget = (value) => {
  if (typeof value !== 'string') return '';

  const target = value.trim();
  if (!/^@?\+?[\d\s().-]+(?:@(s\.whatsapp\.net|c\.us))?$/i.test(target)) return '';

  return jid.fromUser(target.split('@')[0]);
};

/** @param {string} userId */
export const isUserBanned = (userId) => {
  const normalized = jid.fromUser(userId);
  return Boolean(normalized && loadBannedUsers().has(normalized));
};

/** @param {string} userId @param {boolean} banned @returns {boolean} */
export const setUserBanned = (userId, banned) => {
  const normalized = jid.fromUser(userId);
  if (!normalized) return false;

  const users = loadBannedUsers();
  if (users.has(normalized) === banned) return false;

  if (banned) {
    users.add(normalized);
  } else {
    users.delete(normalized);
  }

  setBotSetting(BANNED_USERS_SETTING_KEY, JSON.stringify([...users].sort()));
  return true;
};
