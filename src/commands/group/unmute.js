import { settingAction } from './_utils.js';

export default {
  cmd: ['unmute'],
  desc: 'Unmute group',
  run: settingAction('not_announcement', 'Group unmuted.'),
};
