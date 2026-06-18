import { settingAction } from './_utils.js';

export default {
  cmd: ['lock'],
  desc: 'Lock group settings',
  run: settingAction('locked', 'Settings locked.'),
};
