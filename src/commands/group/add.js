import { participantAction } from './_utils.js';

export default {
  cmd: ['add', 'invite'],
  desc: 'Add member to group',
  run: participantAction('add', 'Added'),
};
