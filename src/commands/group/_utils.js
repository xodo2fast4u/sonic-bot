import { areJidsSameUser } from 'baileys';
import { emoji as e } from '../../config/config.js';
import { jid, send, getTarget, resolveSender } from '../../utils/utils.js';
import logger from '../../utils/logger.js';

/** @param {any} metadata */
const getAdminIds = (metadata) => {
  return metadata.participants
    .filter((/** @type {any} */ p) => p.admin)
    .map((/** @type {any} */ p) => p.id);
};

/**
 * @param {any} sonic
 * @param {any} msg
 * @param {{ admin?: boolean, botAdmin?: boolean }} [options]
 */
export const checkPerms = async (sonic, msg, { admin = false, botAdmin = false } = {}) => {
  const groupJid = msg.key.remoteJid;

  const sender = resolveSender(msg);

  if (!jid.isGroup(groupJid)) {
    await send.text(sonic, msg, `${e.cross} Group command only!`);
    return null;
  }

  const metadata = await sonic.groupMetadata(groupJid);
  const adminIds = getAdminIds(metadata);

  const botJid = sonic.user?.id;

  if (admin) {
    const isAdmin = adminIds.some(
      (/** @type {string} */ id) =>
        areJidsSameUser(id, sender) || jid.fromUser(id) === jid.fromUser(sender),
    );

    if (!isAdmin) {
      await send.text(sonic, msg, `${e.cross} Admin only!`);
      return null;
    }
  }

  if (botAdmin) {
    const isBotAdmin = adminIds.some(
      (/** @type {string} */ id) =>
        areJidsSameUser(id, botJid) || jid.fromUser(id) === jid.fromUser(botJid),
    );

    if (!isBotAdmin) {
      await send.text(sonic, msg, `${e.cross} I need admin rights!`);
      return null;
    }
  }

  return metadata;
};

/**
 * @param {any} sonic
 * @param {any} msg
 */
export const requireTarget = async (sonic, msg) => {
  const target = getTarget(msg);
  if (!target) {
    await send.text(sonic, msg, `${e.cross} Mention or reply to a user!`);
    return null;
  }
  return target;
};

/*
 * Factory function creates similar command handlers with different actions,
 * reducing code duplication across kick, promote, demote, and add commands.
 */
/**
 * @param {string} action
 * @param {string} successMsg
 */
export const participantAction =
  (action, successMsg) =>
  async (
    /** @type {import('../../../types/index.js').CommandHelpers & { sonic: any, msg: any }} */ {
      sonic,
      msg,
    },
    /** @type {string[]} */ args,
  ) => {
    const meta = await checkPerms(sonic, msg, { admin: true, botAdmin: true });
    if (!meta) return;

    let target;
    if (action === 'add') {
      if (!args[0]) return send.text(sonic, msg, `${e.warn} Provide a number!`);
      target = jid.toUser(args[0]);

      /*
       * onWhatsApp check prevents attempting to add non-existent numbers which
       * would fail anyway but waste API calls and confuse users with generic errors.
       */
      const [check] = await sonic.onWhatsApp(target).catch(() => []);
      if (!check?.exists) return send.text(sonic, msg, `${e.cross} Not on WhatsApp!`);
    } else {
      target = await requireTarget(sonic, msg);
      if (!target) return;
    }

    try {
      const [result] = await sonic.groupParticipantsUpdate(msg.key.remoteJid, [target], action);

      if (result.status === '200') {
        await send.mention(sonic, msg, `${e.check} ${successMsg} @${jid.fromUser(target)}`, [
          target,
        ]);
      } else {
        await send.text(sonic, msg, `${e.cross} Failed to ${action} member.`);
      }
    } catch (err) {
      logger.error(`[group:${action}]`, err);
      const error = /** @type {any} */ (err);
      const is403 = error.output?.statusCode === 403 || error.statusCode === 403;
      await send.text(
        sonic,
        msg,
        `${e.cross} ${is403 ? 'Privacy settings prevent this.' : 'Failed.'}`,
      );
    }
  };

/*
 * Factory function creates similar setting toggle handlers with different settings,
 * reducing code duplication across lock, unlock, and other group setting commands.
 */
/**
 * @param {string} setting
 * @param {string} successMsg
 */
export const settingAction =
  (setting, successMsg) =>
  async (
    /** @type {import('../../../types/index.js').CommandHelpers & { sonic: any, msg: any }} */ {
      sonic,
      msg,
    },
  ) => {
    if (!(await checkPerms(sonic, msg, { admin: true, botAdmin: true }))) return;

    try {
      await sonic.groupSettingUpdate(msg.key.remoteJid, setting);
      await send.text(sonic, msg, `${e.check} ${successMsg}`);
    } catch (err) {
      logger.error(`[group:setting:${setting}]`, err);
      await send.text(sonic, msg, `${e.cross} Failed to update settings.`);
    }
  };
