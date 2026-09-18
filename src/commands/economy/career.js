import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins } from './_utils.js';
import { resolveSender, jid } from '../../utils/utils.js';

/** @type {Array<{ rank: number, title: string, emoji: string, cost: number, minEarned: number, perk: string }>} */
const CAREER_LADDER = [
  { rank: 1, title: 'Intern', emoji: '☕', cost: 0, minEarned: 0, perk: 'Standard wage' },
  {
    rank: 2,
    title: 'Apprentice',
    emoji: '💼',
    cost: 1000,
    minEarned: 2000,
    perk: '+10% Bonus on all work',
  },
  {
    rank: 3,
    title: 'Senior Specialist',
    emoji: '💻',
    cost: 5000,
    minEarned: 10000,
    perk: '+25% Bonus & Executive Perks',
  },
  {
    rank: 4,
    title: 'Managing Director',
    emoji: '🏢',
    cost: 20000,
    minEarned: 50000,
    perk: '+50% Corporate Dividends',
  },
  {
    rank: 5,
    title: 'Chief Executive Officer',
    emoji: '👑',
    cost: 50000,
    minEarned: 150000,
    perk: '2x Double Wealth Multiplier',
  },
];

/** @type {Map<string, number>} */
const userRanks = new Map();

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['career'],
  desc: 'Climb the career ladder to unlock permanent earning perks',

  run: async ({ text, msg }, args) => {
    const sender = resolveSender(msg);
    const userId = jid.fromUser(sender);
    const action = args[0]?.toLowerCase();

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your profile.`);

    const currentRankNum = userRanks.get(userId) || 1;
    const currentTier = CAREER_LADDER.find((c) => c.rank === currentRankNum) || CAREER_LADDER[0];
    const nextTier = CAREER_LADDER.find((c) => c.rank === currentRankNum + 1);

    if (action === 'promote' || action === 'upgrade') {
      if (!nextTier) {
        return text(
          `👑 You have reached the pinnacle of corporate prestige as *${currentTier?.title}*! No higher rank available.`,
        );
      }

      if (user.totalEarned < nextTier.minEarned) {
        return text(
          `${e.cross} Career requirement not met! You need at least ${formatCoins(nextTier.minEarned)} in lifetime earnings (current: ${formatCoins(user.totalEarned)}).`,
        );
      }

      if (user.balance < nextTier.cost) {
        return text(
          `${e.cross} Promotion certification costs ${formatCoins(nextTier.cost)} coins! You only have ${formatCoins(user.balance)}.`,
        );
      }

      removeCoins(sender, nextTier.cost);
      userRanks.set(userId, nextTier.rank);

      const bonus = Math.floor(nextTier.cost * 0.2);
      addCoins(sender, bonus);

      const updated = getUser(sender);

      return text(
        `
🎉 *PROMOTION APPROVED!*
${nextTier.emoji} New Rank: *${nextTier.title}* (Tier ${nextTier.rank})
📜 Perk: *${nextTier.perk}*
🎁 Signing Bonus: *+${formatCoins(bonus)}* coins

${e.coin} Balance: *${formatCoins(updated?.balance ?? 0)}*
`.trim(),
      );
    }

    const nextInfo = nextTier
      ? `
➡️ *Next Promotion:* ${nextTier.emoji} ${nextTier.title}
• Fee: 🪙 ${formatCoins(nextTier.cost)}
• Min Earned: 🪙 ${formatCoins(nextTier.minEarned)}
• Upgrade with: !career promote`
      : '👑 MAX RANK REACHED!';

    return text(
      `
💼 *CAREER PROFILE*
${currentTier?.emoji} Current Title: *${currentTier?.title}* (Tier ${currentTier?.rank})
🌟 Active Perk: *${currentTier?.perk}*
📈 Lifetime Earned: *${formatCoins(user.totalEarned)}*
${nextInfo}
`.trim(),
    );
  },
};
