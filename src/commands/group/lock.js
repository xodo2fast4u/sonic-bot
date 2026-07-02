import { settingAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['lock'],
  desc: 'Lock group settings',
  run: settingAction('locked', 'Settings locked.'),
};
