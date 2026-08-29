import { emoji as e } from '../../config/config.js';
import { setGroupParticipantMessageState } from '../../core/state.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['promoterdemoteoff', 'promoteoff', 'demoteoff'],
  desc: 'Disable promote and demote messages',
  ownerOnly: true,
  run: async ({ text }) => {
    setGroupParticipantMessageState('promote', false);
    setGroupParticipantMessageState('demote', false);
    await text(`${e.cross} Promote and demote messages are now disabled.`);
  },
};
