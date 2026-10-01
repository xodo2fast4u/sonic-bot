import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {Record<string, string>} */
const privacyMap = {
  messages: 'updateMessagesPrivacy',
  call: 'updateCallPrivacy',
  lastseen: 'updateLastSeenPrivacy',
  online: 'updateOnlinePrivacy',
  profilepic: 'updateProfilePicturePrivacy',
  status: 'updateStatusPrivacy',
  readreceipts: 'updateReadReceiptsPrivacy',
  groupadd: 'updateGroupsAddPrivacy',
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['privacy'],
  desc: 'Update privacy settings',

  run: async ({ text, sonic }, args) => {
    const type = args[0]?.toLowerCase();
    const value = args[1];
    if (!type || value === undefined)
      return text(
        `${e.warn} Use: privacy <messages|call|lastseen|online|profilepic|status|readreceipts|groupadd> <value>`,
      );

    const fn = privacyMap[type];
    if (!fn) return text(`${e.warn} Unknown privacy type: ${type}`);

    try {
      await /** @type {any} */ (sonic)[fn](value);
      return text(`${e.check} Privacy ${type} set to ${value}.`);
    } catch (err) {
      return text(`${e.cross} Failed to update privacy. ${getErrorMessage(err) || ''}`);
    }
  },
};
