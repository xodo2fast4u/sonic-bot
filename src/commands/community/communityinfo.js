import { emoji as e } from '../../config/config.js';
import { jid } from '../../utils/utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['communityinfo'],
  desc: 'Show community information',

  run: async ({ text, sonic, msg }) => {
    if (!jid.isGroup(msg.key.remoteJid)) return text(`${e.cross} Community command only.`);

    try {
      const meta = await sonic.communityMetadata(msg.key.remoteJid);
      await text(
        `${e.check} Community info:\nName: ${meta.subject || 'Unknown'}\nID: ${meta.id}\nOwner: ${meta.owner || 'Unknown'}\nMembers: ${meta.size || 0}\nDescription: ${meta.desc || 'None'}\nJoin approval: ${meta.joinApprovalMode ? 'Enabled' : 'Disabled'}\nAnnouncement only: ${meta.announce ? 'Yes' : 'No'}\nLocked: ${meta.restrict ? 'Yes' : 'No'}`,
      );
    } catch (err) {
      await text(`${e.cross} Failed to fetch community info. ${getErrorMessage(err) || ''}`);
    }
  },
};
