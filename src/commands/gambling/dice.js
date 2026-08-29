import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { random, formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['dice', 'roll'],
  desc: 'Roll dice — pick a number 1-6',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'dice', 8000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const pick = parseInt(args[0] ?? '', 10);
    if (!pick || pick < 1 || pick > 6) {
      return text(`${e.cross} Pick a number 1-6!\nExample: !dice 4 100`);
    }

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);

    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !dice 4 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)}!`);
    }

    const rolled = random(1, 6);
    const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const diceEmoji = DICE_FACES[rolled - 1];
    const won = rolled === pick;

    if (won) {
      addCoins(sender, bet * 5);
    } else {
      removeCoins(sender, bet);
    }

    const updatedUser = getUser(sender);
    const currentBalance = updatedUser?.balance ?? 0;

    await text(
      `
╭━━━ 🎲 *DICE ROLL* ━━━╮
┃
┃ ${diceEmoji} Rolled: *${rolled}*
┃ Your pick: *${pick}*
┃
┃ ${won ? `${e.check} Won: ${formatCoins(bet * 5)} (x5!)` : `${e.cross} Lost: ${formatCoins(bet)}`}
┃ ${e.coin} Balance: ${formatCoins(currentBalance)}
╰━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
