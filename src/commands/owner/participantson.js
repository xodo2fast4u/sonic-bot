import { emoji as e } from '../../config/config.js';
import { setGroupParticipantMessageGroup } from '../../core/state.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['participantson', 'participantsallon'],
  desc: 'Enable all add, remove, promote and demote messages',
  ownerOnly: true,
  run: async ({ text }) => {
    setGroupParticipantMessageGroup('all', true);
    await text(`${e.check} All participant join/leave/admin status messages are now enabled.`);
  },
};
