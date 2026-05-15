import { emoji as e } from '../../config/config.js'
import logger from '../../utils/logger.js'

export default {
  cmd: ['grouplist'],
  desc: 'List all groups the bot is participating in',

  run: async ({ text, sonic }) => {
    try {
      const groups = await sonic.groupFetchAllParticipating()
      const entries = Object.values(groups || {})
      if (!entries.length) return text(`${e.check} No participating groups found.`)

      const summary = entries
        .slice(0, 15)
        .map(group => `${group.subject || 'Unknown'} — ${group.id}`)
        .join('\n')

      await text(`${e.check} Found ${entries.length} groups.\n${summary}${entries.length > 15 ? '\n...and more' : ''}`)
    } catch (err) {
      logger.error('[group:list]', err)
      await text(`${e.cross} Failed to fetch groups.`)
    }
  },
}
