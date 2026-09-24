import { config, emoji as e } from '../../config/config.js';
import { isOwner, jid, resolveSender } from '../../utils/utils.js';
import {
  clearGroupAdminModes,
  formatModeStatus,
  getModeState,
  isValidMode,
  setGroupAdminMode,
  setMode,
} from '../../services/mode-service.js';

/** @param {string} prefix */
const USAGE = (prefix) =>
  `
${e.admin} *MODE USAGE*
${prefix}mode - show current mode
${prefix}mode public
${prefix}mode private
${prefix}mode self
${prefix}mode admin - this group only
${prefix}mode admin all - all groups
${prefix}mode admin off - disable for this group
${prefix}mode admin clear - clear group overrides


*public* - respond everywhere (default)
*private* - DMs / private chats only
*self* - OWNER only, everywhere
*admin* - group admins only (this group or all)
`.trim();

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['mode'],
  ownerOnly: true,
  desc: 'View or change Sonic operating mode',
  run: async ({ text, sonic, msg }, args) => {
    const prefix = config.prefix;
    const chatJid = msg?.key?.remoteJid;
    const sender = resolveSender(msg, sonic);
    const sub = (args[0] || '').toLowerCase();
    const detail = (args[1] || '').toLowerCase();

    if (!sub || sub === 'status' || sub === 'show' || sub === 'current') {
      await text(formatModeStatus(chatJid));
      return;
    }

    if (sub === 'help' || sub === '?') {
      await text(USAGE(prefix));
      return;
    }

    if (!isOwner(sender, sonic, msg)) {
      await text(`${e.admin} Only the bot owner can change operating mode.`);
      return;
    }

    if (sub === 'admin') {
      if (!detail || detail === 'here' || detail === 'this' || detail === 'group') {
        if (!chatJid || !jid.isGroup(chatJid)) {
          await text(
            `${e.cross} Use \`${prefix}mode admin\` inside a group or \`${prefix}mode admin all\` for every group.`,
          );
          return;
        }

        const state = getModeState();
        if (state.mode === 'admin') {
          await text(
            `${e.info} Global mode is already *admin* (all groups). This group is already admin-only.`,
          );
          return;
        }

        setGroupAdminMode(chatJid, true);
        await text(
          `${e.check} Admin mode enabled for *this group*. Sonic still works normally in DMs and other groups.\n\n${formatModeStatus(chatJid)}`,
        );
        return;
      }

      if (detail === 'all' || detail === 'global') {
        setMode('admin');
        await text(
          `${e.check} Admin mode enabled for *all group chats*. DMs still work normally.\n\n${formatModeStatus(chatJid)}`,
        );
        return;
      }

      if (detail === 'off' || detail === 'disable' || detail === 'remove') {
        if (!chatJid || !jid.isGroup(chatJid)) {
          await text(`${e.cross} Run \`${prefix}mode admin off\` inside the group to disable.`);
          return;
        }

        const state = getModeState();
        if (state.mode === 'admin') {
          setMode('public');
          await text(
            `${e.check} Global admin mode turned off (switched to *public*).\n\n${formatModeStatus(chatJid)}`,
          );
          return;
        }

        setGroupAdminMode(chatJid, false);
        await text(
          `${e.check} Admin-only disabled for *this group*.\n\n${formatModeStatus(chatJid)}`,
        );
        return;
      }

      if (detail === 'clear' || detail === 'reset') {
        const state = getModeState();
        clearGroupAdminModes();
        if (state.mode === 'admin') {
          setMode('public');
        }
        await text(
          `${e.check} Cleared all per-group admin overrides${state.mode === 'admin' ? ' and switched global mode to *public*' : ''}.\n\n${formatModeStatus(chatJid)}`,
        );
        return;
      }

      await text(USAGE(prefix));
      return;
    }

    if (!isValidMode(sub)) {
      await text(`${e.cross} Unknown mode \`${sub}\`.\n\n${USAGE(prefix)}`);
      return;
    }

    setMode(sub);
    await text(`${e.check} Operating mode set to *${sub}*.\n\n${formatModeStatus(chatJid)}`);
  },
};
