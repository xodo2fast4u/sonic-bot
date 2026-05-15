import { emoji as e } from '../../config/config.js'
import { checkPerms } from './_utils.js'
import { jid } from '../../utils/utils.js'

export default {
  cmd: ['admins'],
  desc: 'List group admins',

  run: async ({ sonic, msg }, args) => {
    const meta = await checkPerms(sonic, msg)
    if (!meta) return

    const adminList = meta.participants.filter(p => p.admin)

    const text = adminList
      .map(a => {
        const icon = a.admin === 'superadmin' ? '👑' : '⭐'
        const display = jid.getParticipantNumber(a)
        return `${icon} @${display}`
      })
      .join('\n')

    await sonic.sendMessage(
      msg.key.remoteJid,
      {
        text: `╭━━━ ${e.admin} *ADMINS* ━━━╮\n${text}\n╰━━━━━━━━━━━━━━━━━━━╯`,
        mentions: adminList.map(a => a.id),
      },
      { quoted: msg }
    )
  },
}
