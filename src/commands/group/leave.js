import { emoji as e } from '../../config/config.js'
import { jid, send } from '../../utils/utils.js'

export default {
  cmd: ['leave'],
  desc: 'Leave group',

  run: async ({ sonic, msg }, args) => {
    if (!jid.isGroup(msg.key.remoteJid)) {
      return send.text(sonic, msg, `${e.cross} Group only!`)
    }

    await send.text(sonic, msg, `${e.sonic} Goodbye! ${e.speed}`)
    await sonic.groupLeave(msg.key.remoteJid)
  },
}
