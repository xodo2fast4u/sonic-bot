import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender } from '../../utils/utils.js';
import { getCharacter, getUser } from '../../database/database.js';
import { formatCoins, sendProfileDisplay } from './_utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['balance'],
  desc: 'Check coin balance',

  run: async (helpers) => {
    const { msg, text, sonic } = helpers;
    const sender = resolveSender(msg, sonic);
    const target = (await getTarget(msg, sonic)) || sender;
    const character = getCharacter(target);
    const user = getUser(target);

    if (!user) {
      return text(`${e.cross} Could not load your balance.`);
    }

    const isGod = Boolean(character?.isGod);
    const selfContent = `
${e.user} Your Balance

  ${e.star} Cash: ${isGod ? '∞ (Infinite)' : formatCoins(user.balance)}
  ${e.bolt} Bank: ${isGod ? '∞ (Infinite)' : formatCoins(user.bank)}
  ${e.rocket} Total: ${isGod ? '∞ (Infinite)' : formatCoins(user.balance + user.bank)}
`.trim();

    await sendProfileDisplay(helpers, target, selfContent);
  },
};
