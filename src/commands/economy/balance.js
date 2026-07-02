import { emoji as e } from '../../config/config.js';
import { getTarget, jid, resolveSender } from '../../utils/utils.js';
import { getUser } from '../../database/database.js';
import { formatCoins, sendProfileDisplay } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['balance'],
  desc: 'Check coin balance',

  run: async (helpers) => {
    const { msg, text } = helpers;
    const target = getTarget(msg) || resolveSender(msg);
    const user = getUser(target);

    if (!user) {
      return text(`${e.cross} Could not load wallet data for that user.`);
    }

    const num = jid.fromUser(target);

    const selfContent = `
╭━━━ ${e.ring} *WALLET* ━━━╮
┃ ${e.user} Your Balance
┃
┃ ${e.star} Cash: ${formatCoins(user.balance)}
┃ ${e.bolt} Bank: ${formatCoins(user.bank)}
┃ ${e.rocket} Total: ${formatCoins(user.balance + user.bank)}
╰━━━━━━━━━━━━━━━━━━━╯`.trim();

    const otherContent = `
╭━━━ ${e.ring} *WALLET* ━━━╮
┃ ${e.user} @${num}'s Balance
┃
┃ ${e.star} Cash: ${formatCoins(user.balance)}
┃ ${e.bolt} Bank: ${formatCoins(user.bank)}
┃ ${e.rocket} Total: ${formatCoins(user.balance + user.bank)}
╰━━━━━━━━━━━━━━━━━━━╯`.trim();

    await sendProfileDisplay(helpers, target, selfContent, otherContent);
  },
};
