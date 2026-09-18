import { emoji as e } from '../../config/config.js';
import { jid, getTarget, resolveSender, send } from '../../utils/utils.js';
import { getCharacter, getUser } from '../../database/database.js';
import {
  getBattleItem,
  getArmourItem,
  getXpRequiredForNextLevel,
} from '../../services/rpg-service.js';
import { formatCoins } from '../economy/_utils.js';

/**
 * Generates an ASCII progress bar
 * @param {number} current
 * @param {number} total
 * @param {number} length
 */
const renderProgressBar = (current, total, length = 10) => {
  if (total <= 0) return '░'.repeat(length);
  const percent = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(length * percent);
  return '█'.repeat(filled) + '░'.repeat(length - filled);
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['profile'],
  desc: 'View character stats, level, battle gear and profile',

  run: async ({ sonic, msg }) => {
    const target = getTarget(msg) || resolveSender(msg);
    const num = jid.fromUser(target);
    const pushName = target === resolveSender(msg) ? msg.pushName || '' : '';

    const char = getCharacter(target, pushName);
    const user = getUser(target);

    if (!char) {
      return send.text(sonic, msg, `${e.cross} Could not load profile.`);
    }

    const weapon = getBattleItem(char.equipped_item);
    const armour = getArmourItem(char.equipped_armour);
    const weaponAtkText = weapon ? `(+${weapon.attack} from ${weapon.emoji} ${weapon.name})` : '';
    const weaponDefText = weapon && weapon.defense ? `(+${weapon.defense})` : '';
    const equippedWeaponDisplay = weapon
      ? `${weapon.emoji} ${weapon.name} (+${weapon.attack} ATK)`
      : 'Bare Hands';
    const equippedArmourDisplay = armour
      ? `${armour.emoji} ${armour.name} (+${armour.defense} DEF, +${armour.hp} HP, ${armour.magicResist}% MR)`
      : 'Unarmoured';

    let xpDisplay;
    if (char.isGod) {
      xpDisplay = `[██████████] ∞/∞ XP (MAX)`;
    } else {
      const requiredXp = getXpRequiredForNextLevel(char.level);
      const bar = renderProgressBar(char.xp, requiredXp, 8);
      const percent = Math.round((char.xp / requiredXp) * 100);
      xpDisplay = `[${bar}] ${char.xp}/${requiredXp} XP (${percent}%)`;
    }

    const coinsDisplay = char.isGod ? '∞ (Infinite)' : formatCoins(user?.balance ?? 0);

    const text = `
${e.user} *PROFILE*
👤 Name: *${char.name || '+' + num}*
📱 Number: +${num}
👑 Status: *${char.isOwner ? 'Bot Owner' : 'Adventurer'}*

🌟 Level: *${char.displayLevel}*
📊 XP: ${xpDisplay}
❤️ Health: *${char.displayHp} / ${char.displayMaxHp} HP*
⚔️ Attack: *${char.displayAttack}* ${weaponAtkText}
🛡️ Defense: *${char.displayDefense}* ${weaponDefText}
✨ Special Power: *${char.displayMagicalPower}* [${char.magical_power_name}]

🗡️ Weapon: *${equippedWeaponDisplay}*
🛡️ Armour: *${equippedArmourDisplay}*

🪙 Wallet: *${coinsDisplay}* coins
🏆 Record: *${char.battles_won} Won* | *${char.battles_lost} Lost*
🔔 Level Alerts: *${char.level_up_messages === 1 ? 'Enabled ✅' : 'Disabled ❌'}*
`.trim();

    await send.mention(sonic, msg, text, [target]);
  },
};
