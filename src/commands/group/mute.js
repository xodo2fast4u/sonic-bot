import { settingAction } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['mute'],
  desc: 'Mute group (admins only)',
  run: settingAction('announcement', 'Group muted. Admins only.'),
};
