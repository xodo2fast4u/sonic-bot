import { emoji as e } from '../../config/config.js';
import { setGroupParticipantMessageGroup } from '../../core/state.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['participantsoff', 'participantsalloff'],
  desc: 'Disable all add, remove, promote and demote messages',
  ownerOnly: true,
  run: async ({ text }) => {
    setGroupParticipantMessageGroup('all', false);
    await text(`${e.cross} All participant join/leave/admin status messages are now disabled.`);
  },
};
