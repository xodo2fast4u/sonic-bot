import { settingAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['unlock'],
  desc: 'Unlock group settings',
  run: settingAction('unlocked', 'Settings unlocked.'),
};
