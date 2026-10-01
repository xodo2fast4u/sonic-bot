import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['communitylist'],
  desc: 'List all communities the bot is participating in',

  run: async ({ text, sonic }) => {
    try {
      const communities = await sonic.communityFetchAllParticipating();
      const entries = Object.values(communities || {});
      if (!entries.length) return text(`${e.check} No participating communities found.`);

      await text(
        `${e.check} Found ${entries.length} communities.\n${entries
          .slice(0, 15)
          .map((item) => `${item.subject || 'Unknown'} - ${item.id}`)
          .join('\n')}${entries.length > 15 ? '\n...and more' : ''}`,
      );
    } catch (err) {
      await text(`${e.cross} Failed to fetch communities. ${getErrorMessage(err) || ''}`);
    }
  },
};
