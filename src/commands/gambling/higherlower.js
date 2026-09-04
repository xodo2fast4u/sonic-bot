import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const RANKS = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Jack', 'Queen', 'King'];

/** @returns {number} */
const drawCard = () => Math.floor(Math.random() * RANKS.length) + 1;

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['higherlower', 'highlow'],
  desc: 'Guess whether the next card is higher or lower',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'higherlower', 10000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const guess = args[0]?.toLowerCase();
    if (!['higher', 'lower', 'high', 'low'].includes(guess ?? '')) {
      return text(`${e.cross} Guess *higher* or *lower*!
Example: !higherlower higher 100`);
    }
    const normalizedGuess = guess ?? '';

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!
Example: !higherlower higher 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)}!`);
    }

    const firstCard = drawCard();
    const nextCard = drawCard();
    const wantsHigher = normalizedGuess === 'higher' || normalizedGuess === 'high';
    const won = wantsHigher ? nextCard > firstCard : nextCard < firstCard;

    if (won) addCoins(sender, bet);
    else removeCoins(sender, bet);

    const updatedUser = getUser(sender);
    const currentBalance = updatedUser?.balance ?? 0;
    const outcome =
      nextCard === firstCard
        ? 'It was a tie.'
        : won
          ? 'Your guess was right!'
          : 'Your guess was wrong.';

    await text(
      `
╭━━━ 🃏 *HIGHER OR LOWER* ━━━╮
┃
┃ First card: *${RANKS[firstCard - 1]}*
┃ Next card: *${RANKS[nextCard - 1]}*
┃ Guess: *${normalizedGuess.toUpperCase()}*
┃ ${outcome}
┃
┃ ${won ? `${e.check} Won: ${formatCoins(bet)}` : `${e.cross} Lost: ${formatCoins(bet)}`}
┃ ${e.coin} Balance: ${formatCoins(currentBalance)}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
