import { emoji as e } from '../../config/config.js'
import { checkPerms } from './_utils.js'
import { jid } from '../../utils/utils.js'

export default {
  cmd: ['tagall'],
  desc: 'Tag all members',

  run: async ({ sonic, msg }, args) => {
    const meta = await checkPerms(sonic, msg, { admin: true })
    if (!meta) return

    const memberIds = meta.participants.map(p => p.id)

    const mentions = meta.participants.map(p => `@${jid.getParticipantNumber(p)}`).join('\n')

    const text = args.length ? `${args.join(' ')}\n\n` : ''

    await sonic.sendMessage(
      msg.key.remoteJid,
      {
        text: `${text}${e.sonic} *Tagging ${memberIds.length} members:*\n\n${mentions}`,
        mentions: memberIds,
      },
      { quoted: msg }
    )
  },
}
