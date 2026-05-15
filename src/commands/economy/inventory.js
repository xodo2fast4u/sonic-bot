import { emoji as e } from '../../config/config.js'
import { jid, getTarget, resolveSender } from '../../utils/utils.js'
import { getInventory } from '../../database/database.js'
import { sendProfileDisplay } from './_utils.js'

export default {
  cmd: ['inventory', 'inv'],
  desc: 'View your inventory',

  run: async helpers => {
    const { text, msg } = helpers
    const target = getTarget(msg) || resolveSender(msg)
    const inventory = getInventory(target)
    const num = jid.fromUser(target)
    const ownerJid = resolveSender(msg)
    const isSelf = target === ownerJid

    if (!inventory.length) {
      return text(`${e.cross} ${isSelf ? 'Your' : 'Their'} inventory is empty!`)
    }

    const items = inventory.map(i => `┃ • ${i.item_name} x${i.quantity}`).join('\n')

    const selfContent = `
╭━━━ 🎒 *INVENTORY* ━━━╮
┃ ${e.user} Your items:
┃
${items}
╰━━━━━━━━━━━━━━━━━━━━━╯`.trim()

    const otherContent = `
╭━━━ 🎒 *INVENTORY* ━━━╮
┃ ${e.user} @${num}'s items:
┃
${items}
╰━━━━━━━━━━━━━━━━━━━━━╯`.trim()

    await sendProfileDisplay(helpers, target, selfContent, otherContent)
  },
}
