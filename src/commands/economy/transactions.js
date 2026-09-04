import { emoji as e } from '../../config/config.js';
import { getTransactions } from '../../database/database.js';
import { formatCoins } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

const LABELS = {
  earn: 'Earned',
  lose: 'Lost',
  spend: 'Spent',
  deposit: 'Deposited',
  withdraw: 'Withdrew',
  transfer: 'Transferred',
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['transactions', 'history'],
  desc: 'View your recent coin transactions',

  run: async ({ text, msg }, args) => {
    const requestedLimit = parseInt(args[0] ?? '10', 10);
    const limit = Number.isNaN(requestedLimit) ? 10 : Math.min(Math.max(requestedLimit, 1), 10);
    const sender = resolveSender(msg);
    const transactions = getTransactions(sender, limit);

    if (!transactions.length) {
      return text(`${e.info} No transactions yet. Start earning with !work or !daily.`);
    }

    const lines = transactions.map((transaction) => {
      const direction =
        transaction.type === 'deposit' ? '' : transaction.to_id === sender ? '+' : '-';
      const label =
        LABELS[/** @type {keyof typeof LABELS} */ (transaction.type)] ?? transaction.type;
      return `┃ ${direction}${formatCoins(transaction.amount)} — ${label}`;
    });

    await text(
      `
╭━━━ ${e.coin} *TRANSACTION HISTORY* ━━━╮
${lines.join('\n')}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
