import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['communitymanage'],
  desc: 'Link, unlink or list linked groups in a community',

  run: async ({ text, sonic }, args) => {
    const action = args[0]?.toLowerCase();
    const target = args[1];

    if (!action || !['link', 'unlink', 'linked'].includes(action))
      return text(`${e.warn} Use: communitymanage <link|unlink|linked> <groupJid> <communityJid?>`);

    try {
      if (action === 'linked') {
        const communityJid = target;
        if (!communityJid) return text(`${e.warn} Provide the community or subgroup JID.`);
        const result = await sonic.communityFetchLinkedGroups(communityJid);
        if (!result.linkedGroups.length) return text(`${e.check} No linked groups found.`);
        return text(
          `${e.check} Linked groups for ${result.communityJid}:\n${result.linkedGroups
            .map((/** @type {any} */ group) => `${group.subject || 'Unknown'} - ${group.id}`)
            .join('\n')}`,
        );
      }

      const groupJid = target;
      const communityJid = args[2];
      if (!groupJid || !communityJid)
        return text(`${e.warn} Provide both group and community JIDs.`);

      if (action === 'link') {
        await sonic.communityLinkGroup(groupJid, communityJid);
        return text(`${e.check} Linked ${groupJid} to ${communityJid}.`);
      }

      await sonic.communityUnlinkGroup(groupJid, communityJid);
      await text(`${e.check} Unlinked ${groupJid} from ${communityJid}.`);
    } catch (err) {
      await text(`${e.cross} Failed to ${action} group. ${getErrorMessage(err) || ''}`);
    }
  },
};
