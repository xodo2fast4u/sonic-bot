import { config, emoji as e, getOwner } from '../../config/config.js'

export default {
  cmd: ['owner', 'creator'],
  desc: 'Show bot owner',

  run: async ({ text }) => {
    const owner = getOwner()
    await text(`${e.admin} *${config.botName} Owner:* ${owner ? `+${owner}` : 'Not configured'}`)
  },
}
