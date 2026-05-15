import { emoji as e } from '../../config/config.js'
import { checkPerms } from './_utils.js'
import logger from '../../utils/logger.js'

export default {
  cmd: ['ephemeral'],
  desc: 'Set disappearing messages (off/24h/7d/90d)',

  run: async ({ text, sonic, msg }, args) => {
    if (!(await checkPerms(sonic, msg, { admin: true, botAdmin: true }))) return

    const durations = { off: 0, '24h': 86400, '7d': 604800, '90d': 7776000 }
    const input = args[0]?.toLowerCase()

    if (input && !durations.hasOwnProperty(input)) {
      return text(`${e.warn} Use: off, 24h, 7d, or 90d`)
    }

    const duration = durations[input] ?? durations['7d']

    try {
      await sonic.groupToggleEphemeral(msg.key.remoteJid, duration)
      await text(`${e.check} Disappearing: ${input || '7d'}`)
    } catch (err) {
      logger.error('[group:ephemeral]', err)
      await text(`${e.cross} Failed.`)
    }
  },
}
