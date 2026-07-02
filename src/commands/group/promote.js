import { participantAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['promote'],
  desc: 'Make member admin',
  run: participantAction('promote', 'Promoted'),
};
