import { participantAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['kick'],
  desc: 'Remove member from group',
  run: participantAction('remove', 'Removed'),
};
