import { emoji as e } from '../../config/config.js';
import { jid, getTarget, resolveSender, send } from '../../utils/utils.js';
import {
  getCharacter,
  getUser,
  addCoins,
  awardCommandXp,
  recordCombatResult,
} from '../../database/database.js';
import { simulateCombat } from '../../services/rpg-service.js';
import { COOLDOWN } from '../../utils/cooldown.js';
import { checkEconCooldown, formatCoins, random } from '../economy/_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['fight'],
  desc: 'Challenge another player to an RPG combat battle',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg, sonic);
    const target = await getTarget(msg, sonic);

    if (!target) {
      return text(
        `${e.cross} Mention or quote someone to challenge them to a fight!\nExample: *!fight @user*`,
      );
    }

    const senderNum = jid.fromUser(sender);
    const targetNum = jid.fromUser(target);

    if (!senderNum || !targetNum) {
      return text(`${e.cross} Could not resolve fighter user accounts.`);
    }

    if (senderNum === targetNum) {
      return text(`${e.cross} You cannot fight yourself! Challenge someone else.`);
    }

    const attacker = getCharacter(senderNum, msg.pushName);
    const defender = getCharacter(targetNum);

    if (!attacker || !defender) {
      return text(`${e.cross} Could not load fighter profiles.`);
    }

    if (!attacker.isGod && !(await checkEconCooldown(sonic, msg, 'fight', COOLDOWN.FIGHT))) {
      return;
    }
    const attackerMention = `@${senderNum}`;
    const defenderMention = `@${targetNum}`;
    const mentions = [jid.toUser(senderNum), jid.toUser(targetNum)];
    const battleMessage = await send.mention(
      sonic,
      msg,
      `⚔️ *${attackerMention} challenges ${defenderMention}...*\nThe arena is loading their stats.`,
      mentions,
    );
    const result = simulateCombat(attacker, defender);

    if (result.isDraw) {
      return send.edit(
        sonic,
        msg,
        battleMessage.key,
        `⚔️ *BATTLE DRAW*\n${attackerMention} and ${defenderMention} fought to a draw.\n\n🤝 The cosmos remains intact.`,
        mentions,
      );
    }

    const winner = result.winner;
    const loser = result.loser;
    const winnerNum = jid.fromUser(String(winner.user_id));
    const loserNum = jid.fromUser(String(loser.user_id));

    const loserUser = getUser(loserNum);
    const loserCash = Math.max(0, loserUser?.balance ?? 0);
    const stolenCash = loser.isGod ? 0 : Math.min(Math.floor(loserCash * 0.1), 400);
    const basePurse = random(150, 350);
    const totalPurse = basePurse + stolenCash;

    const defenderLevel = typeof loser.level === 'number' && loser.level < 999999 ? loser.level : 5;
    const xpReward = random(50, 100) + defenderLevel * 5;

    recordCombatResult(winnerNum, loserNum, totalPurse, {
      wonItem: result.itemWon,
      destroyedItem: result.itemDestroyed,
    });

    if (!winner.isGod) {
      addCoins(winnerNum, totalPurse);
      awardCommandXp(winnerNum, xpReward);
    }

    if (!loser.isGod && totalPurse > 0) {
      addCoins(loserNum, -totalPurse);
    }

    const itemEventText = result.itemWon
      ? `\n🎁 Looted: ${result.itemWon.emoji} *${result.itemWon.name}*`
      : result.itemDestroyed
        ? `\n💥 Destroyed: ${result.itemDestroyed.emoji} *${result.itemDestroyed.name}*`
        : '';

    const battleReport = `
🏆 *BATTLE COMPLETE*
Winner: *@${winnerNum}*
Defeated: *@${loserNum}*

🪙 Prize: *+${formatCoins(totalPurse)} coins*
✨ XP: *+${xpReward}*${itemEventText}`.trim();

    const resultMentions = [jid.toUser(winnerNum), jid.toUser(loserNum)];
    await send.edit(sonic, msg, battleMessage.key, battleReport, resultMentions);
  },
};
