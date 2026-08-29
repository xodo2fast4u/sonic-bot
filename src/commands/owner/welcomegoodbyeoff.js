import { emoji as e } from '../../config/config.js';
import { setGroupParticipantMessageState } from '../../core/state.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['welcomegoodbyeoff', 'welcomeoff', 'goodbyeoff'],
  desc: 'Disable welcome and goodbye messages',
  ownerOnly: true,
  run: async ({ text }) => {
    setGroupParticipantMessageState('add', false);
    setGroupParticipantMessageState('remove', false);
    await text(`${e.cross} Welcome and goodbye messages are now disabled.`);
  },
};
