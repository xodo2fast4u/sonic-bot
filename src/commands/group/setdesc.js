import { emoji as e } from '../../config/config.js'
import { checkPerms } from './_utils.js'
import logger from '../../utils/logger.js'

export default {
  cmd: ['setdesc'],
  desc: 'Change group description',

  run: async ({ text, sonic, msg }, args) => {
    if (!(await checkPerms(sonic, msg, { admin: true, botAdmin: true }))) return

    try {
      await sonic.groupUpdateDescription(msg.key.remoteJid, args.join(' ') || undefined)
      await text(`${e.check} Description ${args.length ? 'updated' : 'removed'}!`)
    } catch (err) {
      logger.error('[group:setdesc]', err)
      await text(`${e.cross} Failed.`)
    }
  },
}
