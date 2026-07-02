import { emoji as e } from '../../config/config.js';
import { send, jid } from '../../utils/utils.js';
import { checkPerms } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['ginfo'],
  desc: 'Group information',

  run: async ({ sonic, msg }, args) => {
    const meta = await checkPerms(sonic, msg);
    if (!meta) return;

    const admins = meta.participants.filter((/** @type {any} */ p) => p.admin).length;
    const created = new Date(meta.creation * 1000).toLocaleDateString();

    const ownerDisplay = meta.ownerPn
      ? jid.fromUser(meta.ownerPn)
      : meta.owner
        ? jid.fromUser(meta.owner)
        : 'Unknown';

    const note = args.length ? `\n┃ ${e.info} Note: ${args.join(' ')}` : '';

    await send.text(
      sonic,
      msg,
      `
╭━━━ ${e.group} *GROUP INFO* ━━━╮
┃ ${e.star} Name: ${meta.subject}
┃ ${e.user} Members: ${meta.participants.length}
┃ ${e.admin} Admins: ${admins}
┃ ${e.admin} Owner: +${ownerDisplay}
┃ ${e.time} Created: ${created}
┃ ${e.info} Desc: ${meta.desc || 'None'}${note}
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
