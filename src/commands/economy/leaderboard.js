import { emoji as e } from '../../config/config.js';
import { getLeaderboard, getCombatLeaderboard } from '../../database/database.js';
import { formatCoins } from './_utils.js';
import { jid } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['leaderboard', 'lb'],
  desc: 'View top fighters or richest players',

  run: async ({ text, mention }, args) => {
    const type = args[0]?.toLowerCase();
    const readMoreMarker = `\n${'\u200e'.repeat(4000)}\n`;

    if (type === 'coins' || type === 'wealth' || type === 'money' || type === 'rich') {
      const top = getLeaderboard(10);

      if (!top.length) {
        return text(`${e.cross} No one has any coins yet!`);
      }

      const medals = ['🥇', '🥈', '🥉'];
      const list = top
        .map((user, i) => {
          const medal = medals[i] || `${i + 1}.`;
          const total = user.balance + user.bank;
          const num = jid.fromUser(user.id) || user.id;
          const cash = formatCoins(user.balance);
          const bank = formatCoins(user.bank);
          return `${medal} *${i + 1}. @${num}*
   💰 Total wealth: *${formatCoins(total)}*
   💵 Cash: ${cash}  •  🏦 Bank: ${bank}`;
        })
        .join('\n\n');
      const [firstEntry, ...remainingEntries] = list.split('\n\n');
      const listWithReadMore = remainingEntries.length
        ? `${firstEntry}${readMoreMarker}${remainingEntries.join('\n\n')}`
        : list;

      const mentions = top.map((user) => jid.toUser(user.id));

      return mention(
        `
      🪙 *WEALTH LEADERBOARD*
      │ Highest total balance
      │
${listWithReadMore}
      │
      │ 💡 Combat board: *!leaderboard*
      `.trim(),
        mentions,
      );
    }

    const topCombat = getCombatLeaderboard(10);

    if (!topCombat.length) {
      return text(`${e.cross} No registered characters found yet!`);
    }

    const medals = ['🥇', '🥈', '🥉'];
    const list = topCombat
      .map((char, i) => {
        const medal = medals[i] || `${i + 1}.`;
        const num = jid.fromUser(char.user_id) || char.user_id;
        const levelText = char.isGod ? '👑 GOD' : `Lvl ${char.level}`;
        const winLoss = `${char.battles_won}W / ${char.battles_lost}L`;
        return `${medal} *${i + 1}. @${num}*
   🌟 Level: *${levelText}*  •  XP: ${char.xp}
   ⚔️ Attack: *${char.displayAttack}*  •  🛡️ Defense: *${char.displayDefense}*
   🏆 Record: ${winLoss}`;
      })
      .join('\n\n');
    const [firstEntry, ...remainingEntries] = list.split('\n\n');
    const listWithReadMore = remainingEntries.length
      ? `${firstEntry}${readMoreMarker}${remainingEntries.join('\n\n')}`
      : list;

    const mentions = topCombat.map((char) => jid.toUser(char.user_id));

    return mention(
      `
    ⚔️ *RPG LEVEL LEADERBOARD*
    │ Strongest adventurers
    │
${listWithReadMore}
    │
    │ 💡 Wealth board: *!leaderboard coins*
    `.trim(),
      mentions,
    );
  },
};
