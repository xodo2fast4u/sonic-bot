import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { random, formatCoins, checkEconCooldown } from './_utils.js';
import { getTarget, resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['rob', 'steal'],
  desc: 'Attempt to rob another user',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'rob', 5 * 60 * 1000))) return;

    const target = getTarget(msg);
    if (!target) {
      return text(`${e.cross} Tag someone to rob!\nExample: !rob @user`);
    }

    if (target === sender) {
      return text(`${e.cross} You can't rob yourself!`);
    }

    const targetUser = getUser(target);
    if (!targetUser || targetUser.balance < 50) {
      return text(`${e.cross} That user is too broke to rob!`);
    }

    const robberUser = getUser(sender);
    if (!robberUser) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const successChance = random(1, 100);
    const success = successChance > 45;

    const FAIL_MESSAGES = [
      'tripped running away and got caught',
      'forgot to wear a mask',
      'was recognized immediately',
      'bumped into the cops outside',
      'dropped your wallet at the crime scene',
    ];

    if (!success) {
      const fine = random(50, Math.min(200, robberUser.balance));
      removeCoins(sender, fine);
      const updatedUser = getUser(sender);
      return text(
        `
╭━━━ 🚔 *ROBBERY FAILED* ━━━╮
┃
┃ ${e.cross} You ${FAIL_MESSAGES[random(0, FAIL_MESSAGES.length - 1)]}!
┃
┃ 💸 Fine: ${formatCoins(fine)}
┃ ${e.coin} Balance: ${formatCoins(updatedUser?.balance ?? 0)}
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    const maxSteal = Math.floor(targetUser.balance * 0.3);
    const stolen = random(Math.floor(maxSteal * 0.3), maxSteal);

    removeCoins(target, stolen);
    addCoins(sender, stolen);

    const updatedSender = getUser(sender);

    await text(
      `
╭━━━ 🦝 *ROBBERY SUCCESS* ━━━╮
┃
┃ ${e.check} You successfully robbed them!
┃ 💰 Stolen: ${formatCoins(stolen)}
┃ ${e.coin} Balance: ${formatCoins(updatedSender?.balance ?? 0)}
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
