import { settingAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['unmute'],
  desc: 'Unmute group',
  run: settingAction('not_announcement', 'Group unmuted.'),
};
