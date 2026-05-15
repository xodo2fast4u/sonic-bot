import { emoji as e } from '../../config/config.js'
import { format } from '../../utils/utils.js'

export default {
  cmd: ['runtime'],
  desc: 'Bot uptime',

  run: async ({ text }) => {
    await text(`${e.time} *Uptime:* ${format.getUptime()}`)
  },
}
