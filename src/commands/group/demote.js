import { participantAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['demote'],
  desc: 'Remove admin from member',
  run: participantAction('demote', 'Demoted'),
};
