import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['communitysettings'],
  desc: 'Manage community settings and description',

  run: async ({ text, sonic, msg }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action)
      return text(
        `${e.warn} Use: communitysettings <setname|setdesc|ephemeral|mute|lock|memberaddmode|joinapproval> ...`,
      );

    try {
      switch (action) {
        case 'setname': {
          const subject = args.slice(1).join(' ');
          if (!subject) return text(`${e.warn} Provide a new subject.`);
          await sonic.communityUpdateSubject(msg.key.remoteJid, subject);
          return text(`${e.check} Subject updated.`);
        }
        case 'setdesc': {
          const description = args.slice(1).join(' ');
          await sonic.communityUpdateDescription(msg.key.remoteJid, description || undefined);
          return text(`${e.check} Description updated.`);
        }
        case 'ephemeral': {
          const value = args[1]?.toLowerCase();
          /** @type {Record<string, number>} */
          const map = { off: 0, '24h': 86400, '7d': 604800, '90d': 7776000 };
          if (!value || !(value in map)) return text(`${e.warn} Use: ephemeral off|24h|7d|90d`);
          await sonic.communityToggleEphemeral(msg.key.remoteJid, map[value]);
          return text(`${e.check} Ephemeral set to ${value}.`);
        }
        case 'mute':
          await sonic.communitySettingUpdate(msg.key.remoteJid, 'announcement');
          return text(`${e.check} Community muted (admins only).`);
        case 'lock':
          await sonic.communitySettingUpdate(msg.key.remoteJid, 'locked');
          return text(`${e.check} Community locked.`);
        case 'unlock':
          await sonic.communitySettingUpdate(msg.key.remoteJid, 'unlocked');
          return text(`${e.check} Community unlocked.`);
        case 'memberaddmode': {
          const mode = args[1]?.toLowerCase();
          if (!mode || !['admin_add', 'all_member_add', 'admin', 'all'].includes(mode))
            return text(`${e.warn} Provide admin_add or all_member_add.`);
          await sonic.communityMemberAddMode(
            msg.key.remoteJid,
            mode === 'admin' ? 'admin_add' : mode,
          );
          return text(`${e.check} Member add mode updated.`);
        }
        case 'joinapproval': {
          const value = args[1]?.toLowerCase();
          if (!value || !['on', 'off'].includes(value)) return text(`${e.warn} Provide on or off.`);
          await sonic.communityJoinApprovalMode(msg.key.remoteJid, value);
          return text(`${e.check} Join approval set to ${value}.`);
        }
        default:
          return text(`${e.warn} Unknown action: ${action}`);
      }
    } catch (err) {
      await text(`${e.cross} Failed to update community settings. ${getErrorMessage(err) || ''}`);
    }
  },
};
