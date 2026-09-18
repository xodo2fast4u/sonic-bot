import {
  getBotSetting,
  setBotSetting,
  getAdminOnlyGroups,
  setGroupAdminOnly,
  clearAdminOnlyGroups,
} from '../database/database.js';
import { jid, isOwner } from '../utils/utils.js';
import logger from '../utils/logger.js';

/** @typedef {'public' | 'private' | 'self' | 'admin'} OperatingMode */

export const OPERATING_MODES = /** @type {const} */ (['public', 'private', 'self', 'admin']);

export const MODE_SETTING_KEY = 'operating_mode';

/** @type {OperatingMode} */
let cachedMode = 'public';

/** @type {Set<string>} */
let cachedAdminGroups = new Set();

let loaded = false;

/**
 * @param {string} value
 * @returns {value is OperatingMode}
 */
export const isValidMode = (value) =>
  OPERATING_MODES.includes(/** @type {OperatingMode} */ (value));

/**
 * Normalize a group JID for storage/lookup.
 * @param {string} groupJid
 */
const normalizeGroupJid = (groupJid) => jid.normalize(groupJid) || groupJid;

export const loadModeState = () => {
  try {
    const stored = getBotSetting(MODE_SETTING_KEY);
    cachedMode = stored && isValidMode(stored) ? stored : 'public';
    cachedAdminGroups = new Set(getAdminOnlyGroups().map(normalizeGroupJid));
    loaded = true;
  } catch (err) {
    logger.warn('Failed to load operating mode state; defaulting to public', {
      error: err instanceof Error ? err.message : String(err),
    });
    cachedMode = 'public';
    cachedAdminGroups = new Set();
    loaded = true;
  }

  return getModeState();
};

const ensureLoaded = () => {
  if (!loaded) loadModeState();
};

export const getModeState = () => {
  ensureLoaded();
  return {
    mode: cachedMode,
    adminGroups: [...cachedAdminGroups],
  };
};

export const getMode = () => {
  ensureLoaded();
  return cachedMode;
};

/**
 * @param {string} groupJid
 */
export const isGroupAdminOnly = (groupJid) => {
  ensureLoaded();
  if (cachedMode === 'admin') return true;
  return cachedAdminGroups.has(normalizeGroupJid(groupJid));
};

/**
 * Set the global operating mode.
 * Switching to `admin` enables admin-only for every group.
 * Switching away from `admin` leaves any per-group admin-only overrides intact
 * (except `public` / `private` / `self` which clear the global admin flag only).
 * @param {OperatingMode} mode
 */
export const setMode = (mode) => {
  if (!isValidMode(mode)) {
    throw new Error(`Invalid operating mode: ${mode}`);
  }

  ensureLoaded();
  cachedMode = mode;
  setBotSetting(MODE_SETTING_KEY, mode);
  return getModeState();
};

/**
 * Enable admin-only restriction for a specific group (layered on top of public/private/self).
 * Does not change the global mode to `admin` use setMode('admin') for all groups.
 * @param {string} groupJid
 * @param {boolean} enabled
 */
export const setGroupAdminMode = (groupJid, enabled) => {
  ensureLoaded();
  const normalized = normalizeGroupJid(groupJid);
  if (!normalized || !jid.isGroup(normalized)) {
    throw new Error('Admin group mode requires a group chat');
  }

  setGroupAdminOnly(normalized, enabled);

  if (enabled) {
    cachedAdminGroups.add(normalized);
  } else {
    cachedAdminGroups.delete(normalized);
  }

  return getModeState();
};

/** Clear all per-group admin-only overrides (does not change global mode). */
export const clearGroupAdminModes = () => {
  ensureLoaded();
  clearAdminOnlyGroups();
  cachedAdminGroups = new Set();
  return getModeState();
};

/**
 * Whether the bot should process a command in this chat/user context.
 * Owners always pass (so they can manage the bot in any mode).
 * Mode-management commands should still go through ownerOnly separately.
 *
 * @param {{
 *   user: string,
 *   chatJid: string | null | undefined,
 *   isGroupAdmin?: boolean,
 * }} params
 */
export const shouldProcessCommand = ({ user, chatJid, isGroupAdmin = false }) => {
  ensureLoaded();

  if (isOwner(user)) {
    return { allowed: true, reason: 'owner' };
  }

  const inGroup = Boolean(chatJid && jid.isGroup(chatJid));

  switch (cachedMode) {
    case 'public':
      if (inGroup && isGroupAdminOnly(/** @type {string} */ (chatJid)) && !isGroupAdmin) {
        return { allowed: false, reason: 'admin_group' };
      }
      return { allowed: true, reason: 'public' };

    case 'private':
      if (inGroup) {
        return { allowed: false, reason: 'private' };
      }
      return { allowed: true, reason: 'private_dm' };

    case 'self':
      return { allowed: false, reason: 'self' };

    case 'admin':
      if (!inGroup) {
        return { allowed: true, reason: 'admin_dm' };
      }
      if (isGroupAdmin) {
        return { allowed: true, reason: 'admin' };
      }
      return { allowed: false, reason: 'admin' };

    default:
      return { allowed: true, reason: 'fallback' };
  }
};

/**
 * Whether automatic group participant messages should be sent.
 * Suppressed in private (no group activity) and self (owners-only) modes.
 * @param {string} groupJid
 */
export const shouldSendGroupParticipantMessages = (groupJid) => {
  ensureLoaded();
  if (cachedMode === 'private' || cachedMode === 'self') {
    return false;
  }
  void groupJid;
  return true;
};

/**
 * Status for !mode / !modestatus.
 * @param {string} [currentChatJid]
 */
export const formatModeStatus = (currentChatJid) => {
  ensureLoaded();
  const lines = [`🌐 *Sonic Operating Mode*`, ``, `• Global: *${cachedMode}*`];

  if (cachedMode === 'admin') {
    lines.push(`• Groups: admin-only in *all* group chats`);
    lines.push(`• DMs / self-chat: normal (anyone)`);
  } else if (cachedAdminGroups.size > 0) {
    lines.push(`• Admin-only groups: *${cachedAdminGroups.size}*`);
    if (currentChatJid && jid.isGroup(currentChatJid)) {
      const active = isGroupAdminOnly(currentChatJid);
      lines.push(`• This group: ${active ? '*admin-only*' : '*normal*'}`);
    }
  } else if (cachedMode === 'public') {
    lines.push(`• Responds everywhere (groups + DMs)`);
  } else if (cachedMode === 'private') {
    lines.push(`• Responds in DMs / private chats only`);
  } else if (cachedMode === 'self') {
    lines.push(`• Responds only to OWNER_NUMBER`);
  }

  return lines.join('\n');
};

/** @internal test helper */
export const _resetModeStateForTests = () => {
  cachedMode = 'public';
  cachedAdminGroups = new Set();
  loaded = false;
};
