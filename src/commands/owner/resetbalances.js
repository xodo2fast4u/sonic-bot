import { emoji as e, getOwner } from '../../config/config.js';
import { getUser, resetWalletsExcept } from '../../database/database.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['resetbalances'],
  desc: 'Reset every non-owner wallet (Owner only)',
  ownerOnly: true,

  run: async ({ text }, args) => {
    if (args[0]?.toLowerCase() !== 'confirm') {
      return text(
        `${e.warn} This resets every non-owner cash and bank balance. Use !resetbalances confirm`,
      );
    }

    const owner = getOwner();
    if (!owner) return text(`${e.cross} Owner number is not configured.`);

    const ownerUser = getUser(owner);
    const affectedUsers = resetWalletsExcept(owner);

    return text(
      `
${e.admin} *WALLETS RESET*

${e.check} Reset: ${affectedUsers} user(s)
${e.star} Owner cash preserved: ${formatCoins(ownerUser?.balance ?? 0)}
${e.bolt} Owner bank preserved: ${formatCoins(ownerUser?.bank ?? 0)}
`.trim(),
    );
  },
};

/** @param {number} amount */
function formatCoins(amount) {
  return `${amount.toLocaleString()} ${e.coin}`;
}
