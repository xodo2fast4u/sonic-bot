import { emoji as e } from '../../config/config.js';
import { resolveSender, send } from '../../utils/utils.js';
import {
  getCharacter,
  addCoins,
  awardCommandXp,
  addItem,
  recordMonsterDefeat,
} from '../../database/database.js';
import {
  pickMonsterForLevel,
  pickBossForLevel,
  simulateMonsterCombat,
  getAccessoryItem,
} from '../../services/rpg-service.js';
import { COOLDOWN } from '../../utils/cooldown.js';
import { checkEconCooldown, formatCoins, random } from '../economy/_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['rpghunt'],
  desc: 'Hunt monsters or challenge a boss for XP, coins and rare loot',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg, sonic);
    const char = getCharacter(sender, msg.pushName);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const subCommand = args[0]?.toLowerCase();
    const isBoss = subCommand === 'boss';

    const cooldownKey = isBoss ? 'rpg_boss' : 'rpghunt';
    const cooldownMs = isBoss ? COOLDOWN.RPG_BOSS : COOLDOWN.RPG_HUNT;

    if (!(await checkEconCooldown(sonic, msg, cooldownKey, cooldownMs))) return;

    const playerLevel = typeof char.level === 'number' ? char.level : 1;

    let monster;
    if (isBoss) {
      monster = pickBossForLevel(playerLevel);
      if (!monster)
        return text(`${e.cross} No boss available for your level yet. Reach Level 5 first!`);
    } else {
      monster = pickMonsterForLevel(playerLevel);
      if (!monster) return text(`${e.cross} No monsters found for your level. Try again!`);
    }

    const loadingMsg = await send.text(
      sonic,
      msg,
      isBoss
        ? `💀 *You venture into the boss chamber...*\n${monster.emoji} *${monster.name}* awaits!`
        : `🗺️ *You head into the wilds...*\n${monster.emoji} A *${monster.name}* appears!`,
    );

    const result = simulateMonsterCombat(char, monster);

    const accessory = getAccessoryItem(char.equipped_accessory);
    const xpBoostFactor = 1 + (accessory?.xpBoost ?? 0) / 100;
    const coinBoostFactor = 1 + (accessory?.coinBoost ?? 0) / 100;

    let earnedCoins = 0;
    let earnedXp = 0;

    if (result.playerWon) {
      earnedCoins = Math.floor(random(monster.coinMin, monster.coinMax) * coinBoostFactor);
      earnedXp = Math.floor(monster.xpReward * xpBoostFactor);
      addCoins(sender, earnedCoins);
      awardCommandXp(sender, earnedXp, msg.pushName);
      recordMonsterDefeat(sender);

      if (result.lootItem) {
        addItem(sender, result.lootItem.id);
      }
    } else if (result.isDraw) {
      earnedCoins = Math.floor(
        random(Math.floor(monster.coinMin * 0.3), Math.floor(monster.coinMax * 0.3)) *
          coinBoostFactor,
      );
      earnedXp = Math.floor(monster.xpReward * 0.3 * xpBoostFactor);
      addCoins(sender, earnedCoins);
      awardCommandXp(sender, earnedXp, msg.pushName);
    }

    const narrativeText = result.narrative.join('\n');

    let rewardLine;
    if (result.playerWon) {
      rewardLine = `\n\n💰 *Rewards*\n🪙 Coins: *+${formatCoins(earnedCoins)}*\n✨ XP: *+${earnedXp}*`;
      if (result.lootItem) {
        rewardLine += `\n🎁 Loot: ${result.lootItem.emoji} *${result.lootItem.name}* (added to inventory)`;
      }
    } else if (result.isDraw) {
      rewardLine = `\n\n💰 *Partial Rewards*\n🪙 Coins: *+${formatCoins(earnedCoins)}*\n✨ XP: *+${earnedXp}*`;
    } else {
      rewardLine = `\n\n😔 *No rewards better luck next time!*`;
    }

    const fullReport = `${narrativeText}${rewardLine}`;

    await send.edit(sonic, msg, loadingMsg.key, fullReport, []);
  },
};
