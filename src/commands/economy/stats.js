import { emoji as e } from '../../config/config.js';
import { getEconomyStats } from '../../database/database.js';
import { formatCoins } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['stats'],
  desc: 'View economy statistics',

  run: async ({ text }) => {
    const stats = getEconomyStats();

    await text(
      `
╭━━━ 📊 *ECONOMY STATS* ━━━╮
┃
┃ ${e.user} Total Users: ${stats.total_users || 0}
┃ ${e.star} Total Cash: ${formatCoins(stats.total_cash || 0)}
┃ ${e.bolt} Total Bank: ${formatCoins(stats.total_bank || 0)}
┃ ${e.rocket} Total Wealth: ${formatCoins(stats.total_wealth || 0)}
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
