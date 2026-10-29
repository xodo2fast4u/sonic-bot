import { emoji as e } from '../../config/config.js';
import { jid, getTarget, resolveSender } from '../../utils/utils.js';
import { getInventory, getCharacter } from '../../database/database.js';
import { sendProfileDisplay } from './_utils.js';
import { getBattleItem, getArmourItem, getAccessoryItem } from '../../services/rpg-service.js';

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

    const equippedWeaponId = char?.equipped_item?.toLowerCase();
    const equippedArmourId = char?.equipped_armour?.toLowerCase();
    const equippedAccessoryId = char?.equipped_accessory?.toLowerCase();

    const items = inventory
      .map((i) => {
        const battle = getBattleItem(i.item_name);
        const armour = getArmourItem(i.item_name);
        const accessory = getAccessoryItem(i.item_name);

        const isEquippedWeapon =
          equippedWeaponId &&
          (i.item_name.toLowerCase() === equippedWeaponId ||
            (battle && battle.id.toLowerCase() === equippedWeaponId));

        const isEquippedArmour =
          equippedArmourId &&
          (i.item_name.toLowerCase() === equippedArmourId ||
            (armour && armour.id.toLowerCase() === equippedArmourId));

        const isEquippedAccessory =
          equippedAccessoryId &&
          (i.item_name.toLowerCase() === equippedAccessoryId ||
            (accessory && accessory.id.toLowerCase() === equippedAccessoryId));

        let equippedTag = '';
        if (isEquippedWeapon) equippedTag = ' ⚔️ *[EQUIPPED WEAPON]*';
        else if (isEquippedArmour) equippedTag = ' 🛡️ *[EQUIPPED ARMOUR]*';
        else if (isEquippedAccessory) equippedTag = ' 💍 *[EQUIPPED ACCESSORY]*';

        let statTag = '';
        let icon = '📦';

        if (battle) {
          icon = battle.emoji;
          statTag = ` (+${battle.attack} ATK)`;
        } else if (armour) {
          icon = armour.emoji;
          statTag = ` (+${armour.defense} DEF, +${armour.hp} HP)`;
        } else if (accessory) {
          icon = accessory.emoji;
          statTag = ` (+${accessory.critChance}% Crit, +${accessory.xpBoost}% XP)`;
        }

        return `${icon} ${i.item_name}${statTag} x${i.quantity}${equippedTag}`;
      })
      .join('\n');

    const selfContent = `
🎒 *INVENTORY*
${e.user} Your items:

${items}

💡 Equip gear with: *!equip <item>*
`.trim();

    const otherContent = `
🎒 *INVENTORY*
${e.user} @${num}'s items:

${items}
`.trim();

    await sendProfileDisplay(helpers, target, selfContent, otherContent);
  },
};
