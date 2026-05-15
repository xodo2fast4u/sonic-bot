import { emoji as e } from '../../config/config.js'
import { getTarget, resolveSender, jid } from '../../utils/utils.js'
import { addItem, getInventory } from '../../database/database.js'
import { getOwner } from '../../config/config.js'

export default {
  cmd: ['additem'],
  desc: "Add items to a user's inventory (Owner only)",

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg)
    const owner = getOwner()

    const senderNum = jid.fromUser(sender)?.replace('@s.whatsapp.net', '').replace('@lid', '')
    if (senderNum !== owner) {
      return text(`${e.cross} This command is only available to the bot owner!`)
    }

    const target = getTarget(msg)
    if (!target) {
      return text(`${e.cross} Mention or reply to someone to give them items!`)
    }

    const itemName = args[0]
    const quantity = parseInt(args[1]) || 1

    if (!itemName) {
      return text(`${e.cross} Provide an item name! Example: !additem @user "Diamond Sword" 5`)
    }

    if (quantity <= 0) {
      return text(`${e.cross} Quantity must be greater than 0!`)
    }

    addItem(target, itemName, quantity)
    const inventory = getInventory(target)
    const targetNum = jid.fromUser(target)

    await text(
      `
╭━━━ ${e.admin} *ITEM ADDED* ━━━╮
┃
┃ ${e.user} Target: @${targetNum}
┃ ${e.star} Item: ${itemName}
┃ ${e.check} Quantity: +${quantity}
┃
┃ ${e.ring} Added by: Owner
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim()
    )
  },
}
