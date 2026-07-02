import { emoji as e } from '../../config/config.js';
import { checkPerms } from './_utils.js';
import { jid } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['admins'],
  desc: 'List group admins',

  run: async ({ sonic, msg }, args) => {
    const meta = await checkPerms(sonic, msg);
    if (!meta) return;

    const filter = args.join(' ').replace(/[^0-9]/g, '');
    let adminList = meta.participants.filter((/** @type {any} */ p) => p.admin);

    if (filter) {
      adminList = adminList.filter((/** @type {any} */ a) =>
        jid.getParticipantNumber(a).includes(filter),
      );
    }

    if (!adminList.length) {
      await sonic.sendMessage(
        msg.key.remoteJid,
        { text: `${e.warn} No admins${filter ? ' matching that filter' : ''}.` },
        { quoted: msg },
      );
      return;
    }

    const text = adminList
      .map((/** @type {any} */ a) => {
        const icon = a.admin === 'superadmin' ? '👑' : '⭐';
        const display = jid.getParticipantNumber(a);
        return `${icon} @${display}`;
      })
      .join('\n');

    await sonic.sendMessage(
      msg.key.remoteJid,
      {
        text: `╭━━━ ${e.admin} *ADMINS* ━━━╮\n${text}\n╰━━━━━━━━━━━━━━━━━━━╯`,
        mentions: adminList.map((/** @type {any} */ a) => a.id),
      },
      { quoted: msg },
    );
  },
};
