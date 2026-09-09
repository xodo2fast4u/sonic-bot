import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from './_utils.js';
import { jid, getTarget, resolveSender } from '../../utils/utils.js';

/** @type {Map<string, { targetId: string, amount: number, placedBy: string }>} */
const activeBounties = new Map();

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['bounty'],
  desc: 'Place, view or claim bounties on group members',

  run: async ({ text, mention, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    const subAction = args[0]?.toLowerCase();

    if (!subAction || subAction === 'list' || subAction === 'board') {
      if (activeBounties.size === 0) {
        return text(
          `
╭━━━ 📜 *BOUNTY BOARD* ━━━╮
┃ ${e.info} No active bounties right now!
┃
┃ Place one: !bounty place @user <amount>
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
        );
      }

      const rows = Array.from(activeBounties.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
        .map(
          (b, idx) => `┃ ${idx + 1}. @${jid.fromUser(b.targetId)} — 🪙 *${formatCoins(b.amount)}*`,
        )
        .join('\n');

      const mentions = Array.from(activeBounties.values()).map((b) => b.targetId);

      return mention(
        `
╭━━━ 📜 *WANTED: BOUNTY BOARD* ━━━╮
┃
${rows}
┃
┃ Claim with: !bounty claim @user
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
        mentions,
      );
    }

    if (subAction === 'place' || subAction === 'set' || subAction === 'add') {
      const target = getTarget(msg);
      if (!target) {
        return text(
          `${e.cross} Mention someone to place a bounty on!\nExample: !bounty place @user 500`,
        );
      }

      if (jid.fromUser(target) === jid.fromUser(sender)) {
        return text(`${e.cross} You cannot put a bounty on yourself!`);
      }

      const amountToken = args.find((a) => !a.startsWith('@') && a !== subAction);
      const amount = parseInt(amountToken ?? '0', 10);

      if (!amount || amount < 100) {
        return text(`${e.cross} Minimum bounty placement is 100 coins!`);
      }

      const user = getUser(sender);
      if (!user || user.balance < amount) {
        return text(`${e.cross} You do not have enough cash to fund this bounty!`);
      }

      removeCoins(sender, amount);

      const targetId = jid.fromUser(target);
      const existing = activeBounties.get(targetId);
      const totalBounty = (existing?.amount ?? 0) + amount;

      activeBounties.set(targetId, {
        targetId: target,
        amount: totalBounty,
        placedBy: sender,
      });

      return mention(
        `
╭━━━ 🎯 *BOUNTY PLACED* ━━━╮
┃ ${e.warn} Target: @${targetId}
┃ 🪙 Added: *${formatCoins(amount)}*
┃ 💰 Total Pool: *${formatCoins(totalBounty)}*
┃
┃ Hunters, claim with: !bounty claim @${targetId}
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
        [target],
      );
    }

    if (subAction === 'claim' || subAction === 'hunt') {
      const target = getTarget(msg);
      if (!target) {
        return text(`${e.cross} Mention the target you are hunting!\nExample: !bounty claim @user`);
      }

      const targetId = jid.fromUser(target);
      const bounty = activeBounties.get(targetId);

      if (!bounty || bounty.amount <= 0) {
        return text(`${e.cross} There is no active bounty on that user!`);
      }

      if (jid.fromUser(target) === jid.fromUser(sender)) {
        return text(`${e.cross} You cannot claim a bounty on yourself!`);
      }

      if (!(await checkEconCooldown(sonic, msg, 'bounty_claim', 30000))) return;

      const user = getUser(sender);
      if (!user || user.balance < 100) {
        return text(`${e.cross} You need at least 100 coins in cash in case the hunt fails!`);
      }

      const won = Math.random() < 0.5;

      if (won) {
        const prize = bounty.amount;
        activeBounties.delete(targetId);
        const newBalance = addCoins(sender, prize);

        return mention(
          `
╭━━━ 🎯 *BOUNTY CLAIMED!* ━━━╮
┃ ${e.check} Hunter: @${jid.fromUser(sender)}
┃ 🎯 Captured: @${targetId}
┃
┃ 💰 Prize Won: *+${formatCoins(prize)}* coins
┃ ${e.coin} Balance: *${formatCoins(newBalance ?? 0)}*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
          [sender, target],
        );
      } else {
        const penalty = 100;
        removeCoins(sender, penalty);
        addCoins(target, penalty);

        return mention(
          `
╭━━━ 💨 *TARGET ESCAPED!* ━━━╮
┃ @${targetId} fought back and escaped into the alley!
┃
┃ ${e.cross} Hospital Fee: *-${formatCoins(penalty)}* paid to target
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
          [target],
        );
      }
    }

    return text(
      `${e.info} Usage:\n• !bounty list\n• !bounty place @user <amount>\n• !bounty claim @user`,
    );
  },
};
