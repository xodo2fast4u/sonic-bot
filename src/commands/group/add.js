import { participantAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['add', 'invite'],
  desc: 'Add member to group',
  run: participantAction('add', 'Added'),
};
