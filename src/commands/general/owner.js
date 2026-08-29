import { config, emoji as e, getOwner } from '../../config/config.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['owner', 'creator'],
  desc: 'Show bot owner',

  run: async ({ text }) => {
    const owner = getOwner();
    const formattedOwners = owner
      ? owner
          .split(',')
          .map((n) => n.trim().replace(/[^0-9]/g, ''))
          .filter(Boolean)
          .map((n) => `+${n}`)
          .join(', ')
      : 'Not configured';
    await text(`${e.admin} *${config.botName} Owner:* ${formattedOwners || 'Not configured'}`);
  },
};
