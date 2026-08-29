import { emoji as e } from '../../config/config.js';
import { setGroupParticipantMessageState } from '../../core/state.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['welcomegoodbyeon', 'welcomeon', 'goodbyeon'],
  desc: 'Enable welcome and goodbye messages',
  ownerOnly: true,
  run: async ({ text }) => {
    setGroupParticipantMessageState('add', true);
    setGroupParticipantMessageState('remove', true);
    await text(`${e.check} Welcome and goodbye messages are now enabled.`);
  },
};
