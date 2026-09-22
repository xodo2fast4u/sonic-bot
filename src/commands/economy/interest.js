import { emoji as e } from '../../config/config.js';
import { getUser, hasItem, addCoins, deposit } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

const INTEREST_COOLDOWN = 43200000;
const BASE_RATE = 0.03;
const SAFE_RATE = 0.06;
const MIN_BANK_REQUIRED = 100;
const MAX_INTEREST = 5000;

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['interest'],
  desc: 'Collect accrued interest on your bank balance',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your balance.`);

    if (user.bank < MIN_BANK_REQUIRED) {
      return text(
        `${e.cross} You need at least ${formatCoins(MIN_BANK_REQUIRED)} in your bank to accrue interest!\nDeposit funds using !deposit <amount>`,
      );
    }

    if (!(await checkEconCooldown(sonic, msg, 'interest', INTEREST_COOLDOWN))) return;

    const ownsSafe = hasItem(sender, 'Safe');
    const rate = ownsSafe ? SAFE_RATE : BASE_RATE;
    const ratePercent = (rate * 100).toFixed(0);

    const interestEarned = Math.min(MAX_INTEREST, Math.max(1, Math.floor(user.bank * rate)));

    addCoins(sender, interestEarned);
    const depResult = deposit(sender, interestEarned);
    const finalBank = depResult.success ? depResult.bank : user.bank + interestEarned;

    await text(
      `
🏦 *BANK INTEREST*
${e.star} Rate: *${ratePercent}%* ${ownsSafe ? '(🔒 Safe 2x Bonus!)' : '(Base)'}
${e.check} Interest Earned: *+${formatCoins(interestEarned)}*

${e.bolt} Bank Total: *${formatCoins(finalBank ?? 0)}*
⏱️ Next payout in: 12h
`.trim(),
    );
  },
};
