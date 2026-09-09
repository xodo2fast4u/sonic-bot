import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins } from './_utils.js';
import { resolveSender, jid, format } from '../../utils/utils.js';

/** @type {Map<string, { amount: number, unlockAt: number, bonusRate: number, termName: string }>} */
const lockedVaults = new Map();

const TERMS = {
  '1d': { durationMs: 86400000, rate: 0.05, label: '1 Day (+5% Return)' },
  '3d': { durationMs: 259200000, rate: 0.15, label: '3 Days (+15% Return)' },
  '7d': { durationMs: 604800000, rate: 0.35, label: '7 Days (+35% Return)' },
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['vault'],
  desc: 'Time-lock savings to protect from robbery and earn maturity bonuses',

  run: async ({ text, msg }, args) => {
    const sender = resolveSender(msg);
    const userId = jid.fromUser(sender);
    const action = args[0]?.toLowerCase();

    if (!action || action === 'status' || action === 'check') {
      const lock = lockedVaults.get(userId);
      if (!lock) {
        return text(
          `
╭━━━ 🔒 *TIME-LOCK VAULT* ━━━╮
┃ ${e.info} You have no funds currently locked!
┃
┃ Available Terms:
┃ • 1d : 24h (+5% bonus)
┃ • 3d : 72h (+15% bonus)
┃ • 7d : 168h (+35% bonus)
┃
┃ Lock funds: !vault lock <amount> <term>
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
        );
      }

      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((lock.unlockAt - now) / 1000));
      const isMatured = remainingSeconds === 0;
      const bonusAmount = Math.floor(lock.amount * lock.bonusRate);
      const totalPayout = lock.amount + bonusAmount;

      return text(
        `
╭━━━ 🔒 *VAULT DEPOSIT STATUS* ━━━╮
┃ Principal: *${formatCoins(lock.amount)}* coins
┃ Term: *${lock.termName}*
┃ Guaranteed Bonus: *+${formatCoins(bonusAmount)}*
┃ Total on Unlock: *${formatCoins(totalPayout)}*
┃
┃ ${isMatured ? '🎉 *MATURED! Ready to claim!*' : `⏱️ Unlocks in: *${format.uptime(remainingSeconds)}*`}
┃
┃ Claim command: !vault claim
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    if (action === 'lock' || action === 'deposit') {
      if (lockedVaults.has(userId)) {
        return text(
          `${e.cross} You already have an active locked deposit! Use !vault status to check it.`,
        );
      }

      const amount = parseInt(args[1] ?? '0', 10);
      if (!amount || amount < 100) {
        return text(`${e.cross} Minimum amount to lock is 100 coins! Example: !vault lock 500 1d`);
      }

      const termKey = args[2]?.toLowerCase();
      // @ts-ignore
      const term = TERMS[termKey ?? ''];
      if (!term) {
        return text(
          `${e.cross} Choose a valid lock term: 1d, 3d, or 7d!\nExample: !vault lock 500 1d`,
        );
      }

      const user = getUser(sender);
      if (!user || user.balance < amount) {
        return text(
          `${e.cross} Insufficient cash balance! You only have ${formatCoins(user?.balance ?? 0)}.`,
        );
      }

      removeCoins(sender, amount);

      const unlockAt = Date.now() + term.durationMs;
      lockedVaults.set(userId, {
        amount,
        unlockAt,
        bonusRate: term.rate,
        termName: term.label,
      });

      const updated = getUser(sender);

      return text(
        `
╭━━━ 🔒 *FUNDS LOCKED SECURELY* ━━━╮
┃ ${e.check} Locked: *${formatCoins(amount)}* coins
┃ 📜 Term: *${term.label}*
┃ 🛡️ Protected from robberies & theft!
┃
┃ ${e.coin} Remaining Cash: *${formatCoins(updated?.balance ?? 0)}*
┃ Check progress with: !vault status
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    if (action === 'claim' || action === 'unlock') {
      const lock = lockedVaults.get(userId);
      if (!lock) {
        return text(`${e.cross} You have no active vault deposit to claim!`);
      }

      const now = Date.now();
      if (now < lock.unlockAt) {
        const remainingSeconds = Math.ceil((lock.unlockAt - now) / 1000);
        return text(
          `${e.cross} Your vault deposit has not matured yet! Please wait another *${format.uptime(remainingSeconds)}*.`,
        );
      }

      const bonus = Math.floor(lock.amount * lock.bonusRate);
      const totalPayout = lock.amount + bonus;

      lockedVaults.delete(userId);
      const newBalance = addCoins(sender, totalPayout);

      return text(
        `
╭━━━ 🔓 *VAULT MATURED & CLAIMED* ━━━╮
┃ ${e.check} Principal Returned: *${formatCoins(lock.amount)}*
┃ 🌟 Maturity Bonus: *+${formatCoins(bonus)}*
┃
┃ 💰 Total Credited: *+${formatCoins(totalPayout)}*
┃ ${e.coin} New Balance: *${formatCoins(newBalance ?? 0)}*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    return text(`${e.info} Usage: !vault status | !vault lock <amount> <1d|3d|7d> | !vault claim`);
  },
};
