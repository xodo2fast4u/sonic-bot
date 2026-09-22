import { config, emoji as e, getOwner } from '../../config/config.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['owner'],
  desc: 'Show bot owner',

  run: async ({ contact, text }) => {
    const owner = getOwner();
    const owners = owner
      ? owner
          .split(',')
          .map((n) => n.trim().replace(/[^0-9]/g, ''))
          .filter(Boolean)
      : [];

    if (!owners.length) {
      return text(`${e.admin} *${config.botName} Owner:* Not configured`);
    }

    await contact(`${config.botName} Owner`, owners);
  },
};
