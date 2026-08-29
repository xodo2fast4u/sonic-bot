import { emoji as e } from '../../config/config.js';
import { setGroupParticipantMessageState } from '../../core/state.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['promoterdemoteon', 'promoteon', 'demoteon'],
  desc: 'Enable promote and demote messages',
  ownerOnly: true,
  run: async ({ text }) => {
    setGroupParticipantMessageState('promote', true);
    setGroupParticipantMessageState('demote', true);
    await text(`${e.check} Promote and demote messages are now enabled.`);
  },
};
