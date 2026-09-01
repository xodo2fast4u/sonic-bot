import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { random, formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** @typedef {{ suit: string, rank: string }} Card */

/** @returns {Card} */
const drawCard = () => {
  const suit = /** @type {string} */ (SUITS[random(0, SUITS.length - 1)] ?? SUITS[0] ?? '♠');
  const rank = /** @type {string} */ (RANKS[random(0, RANKS.length - 1)] ?? RANKS[0] ?? 'A');

  return { suit, rank };
};

/** @param {{ suit: string, rank: string }[]} hand */
const handValue = (hand) => {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (['J', 'Q', 'K'].includes(card.rank)) total += 10;
    else if (card.rank === 'A') {
      total += 11;
      aces++;
    } else total += parseInt(card.rank);
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
};

/** @param {{ suit: string, rank: string }[]} hand */
const handStr = (hand) => hand.map((c) => `${c.rank}${c.suit}`).join(' ');

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['blackjack', 'bj'],
  desc: 'Play a hand of blackjack against the dealer',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'blackjack', 15000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0] ?? '', 10);

    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !blackjack 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)}!`);
    }

    const playerHand = [drawCard(), drawCard()];
    const dealerHand = [drawCard(), drawCard()];

    while (handValue(dealerHand) < 17) {
      dealerHand.push(drawCard());
    }

    const playerTotal = handValue(playerHand);
    const dealerTotal = handValue(dealerHand);

    const playerBust = playerTotal > 21;
    const dealerBust = dealerTotal > 21;
    const playerBJ = playerTotal === 21 && playerHand.length === 2;

    let result;
    let won = false;
    let payout = 0;

    if (playerBust) {
      result = `${e.cross} *BUST!* You went over 21.`;
    } else if (playerBJ && !dealerBust && dealerTotal !== 21) {
      result = `${e.rocket} *BLACKJACK!* Natural 21!`;
      won = true;
      payout = Math.floor(bet * 1.5);
    } else if (dealerBust || playerTotal > dealerTotal) {
      result = `${e.check} *YOU WIN!*`;
      won = true;
      payout = bet;
    } else if (playerTotal === dealerTotal) {
      result = `${e.star} *PUSH!* It's a tie.`;
      won = true;
      payout = 0;
    } else {
      result = `${e.cross} *DEALER WINS.*`;
    }

    if (won) {
      if (payout > 0) addCoins(sender, payout);
    } else {
      removeCoins(sender, bet);
    }

    const updatedUser = getUser(sender);
    const currentBalance = updatedUser?.balance ?? 0;

    await text(
      `
╭━━━ 🃏 *BLACKJACK* ━━━╮
┃
┃ 👤 You:    ${handStr(playerHand)} = *${playerTotal}*
┃ 🏠 Dealer: ${handStr(dealerHand)} = *${dealerTotal}*
┃
┃ ${result}
┃ ${won && payout > 0 ? `${e.check} Won: ${formatCoins(payout)}` : won ? '↩️ Bet returned' : `${e.cross} Lost: ${formatCoins(bet)}`}
┃ ${e.coin} Balance: ${formatCoins(currentBalance)}
╰━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
