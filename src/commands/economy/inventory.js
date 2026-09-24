import { emoji as e } from '../../config/config.js';
import { jid, getTarget, resolveSender } from '../../utils/utils.js';
import { getInventory, getCharacter } from '../../database/database.js';
import { sendProfileDisplay } from './_utils.js';
import { getBattleItem } from '../../services/rpg-service.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['inventory', 'inv'],
  desc: 'View your inventory and battle gear',

  run: async (helpers) => {
    const { text, msg, sonic } = helpers;
    const target = (await getTarget(msg, sonic)) || resolveSender(msg);
    const inventory = getInventory(target);
    const char = getCharacter(target, msg.pushName);
    const num = jid.fromUser(target);
    const ownerJid = resolveSender(msg);
    const isSelf = target === ownerJid;

    if (!inventory.length) {
      return text(
        `${e.cross} ${isSelf ? 'Your' : 'Their'} inventory is empty! Use *!shop* to buy items.`,
      );
    }

    const equippedId = char?.equipped_item?.toLowerCase();

    const items = inventory
      .map((i) => {
        const battle = getBattleItem(i.item_name);
        const isEquipped =
          equippedId &&
          (i.item_name.toLowerCase() === equippedId ||
            (battle && battle.id.toLowerCase() === equippedId));

        const equippedTag = isEquipped ? ' ⚔️ *[EQUIPPED]*' : '';
        const statTag = battle ? ` (+${battle.attack} ATK)` : '';
        const icon = battle ? battle.emoji : '📦';

        return `${icon} ${i.item_name}${statTag} x${i.quantity}${equippedTag}`;
      })
      .join('\n');

    const selfContent = `
🎒 *INVENTORY*
${e.user} Your items:

${items}

💡 Equip weapons with: *!equip <item>*
`.trim();

    const otherContent = `
🎒 *INVENTORY*
${e.user} @${num}'s items:

${items}
`.trim();

    await sendProfileDisplay(helpers, target, selfContent, otherContent);
  },
};
