import { settingAction } from './_utils.js';

export default {
  cmd: ['unlock'],
  desc: 'Unlock group settings',
  run: settingAction('unlocked', 'Settings unlocked.'),
};
