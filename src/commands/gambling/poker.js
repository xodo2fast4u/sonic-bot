import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
/** @type {Record<string, number>} */
const RANK_VALUES = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

/**
 * Generate and shuffle a standard deck
 * @returns {Array<{ rank: string, suit: string, val: number }>}
 */
const createDeck = () => {
  /** @type {Array<{ rank: string, suit: string, val: number }>} */
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, val: RANK_VALUES[rank] ?? 2 });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = deck[i];
    const target = deck[j];
    if (temp && target) {
      deck[i] = target;
      deck[j] = temp;
    }
  }
  return deck;
};

/**
 * Evaluate 5-card poker hand
 * @param {Array<{ rank: string, suit: string, val: number }>} hand
 * @returns {{ name: string, multiplier: number }}
 */
const evaluateHand = (hand) => {
  const values = hand.map((c) => c.val).sort((a, b) => a - b);
  const suits = hand.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  let isStraight = values.every((v, i) => i === 0 || v === (values[i - 1] ?? 0) + 1);
  if (!isStraight && JSON.stringify(values) === JSON.stringify([2, 3, 4, 5, 14])) {
    isStraight = true;
  }
  /** @type {Record<number, number>} */
  const counts = {};
  for (const v of values) counts[v] = (counts[v] || 0) + 1;
  const countValues = Object.values(counts).sort((a, b) => b - a);

  if (isStraight && isFlush && values[4] === 14 && values[0] === 10) {
    return { name: 'Royal Flush! 👑', multiplier: 250 };
  }
  if (isStraight && isFlush) {
    return { name: 'Straight Flush! ⚡', multiplier: 50 };
  }
  if (countValues[0] === 4) {
    return { name: 'Four of a Kind! 💥', multiplier: 25 };
  }
  if (countValues[0] === 3 && countValues[1] === 2) {
    return { name: 'Full House! 🏰', multiplier: 9 };
  }
  if (isFlush) {
    return { name: 'Flush! 🌊', multiplier: 6 };
  }
  if (isStraight) {
    return { name: 'Straight! 📏', multiplier: 4 };
  }
  if (countValues[0] === 3) {
    return { name: 'Three of a Kind! 🎯', multiplier: 3 };
  }
  if (countValues[0] === 2 && countValues[1] === 2) {
    return { name: 'Two Pair! 👥', multiplier: 2 };
  }
  if (countValues[0] === 2) {
    const pairValue = parseInt(
      Object.keys(counts).find((k) => counts[parseInt(k, 10)] === 2) || '0',
      10,
    );
    if (pairValue >= 11) {
      return { name: 'Jacks or Better! 🃏', multiplier: 1 };
    }
  }

  return { name: 'High Card (Bust)', multiplier: 0 };
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['poker'],
  desc: 'Five-Card Draw video poker with authentic hand ranks',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'poker', 6000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !poker 100 or !poker all`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    const deck = createDeck();
    const hand = deck.slice(0, 5);
    const { name, multiplier } = evaluateHand(hand);
    const won = multiplier > 0;
    const payout = bet * multiplier;

    if (won) {
      if (multiplier > 1) {
        addCoins(sender, payout - bet);
      }
    } else {
      removeCoins(sender, bet);
    }

    const updated = getUser(sender);
    const handDisplay = hand.map((c) => `[${c.rank}${c.suit}]`).join(' ');

    await text(
      `
╭━━━ 🃏 *VIDEO POKER* ━━━╮
┃
┃ Cards: ${handDisplay}
┃ Hand: *${name}*
┃
┃ ${won ? `${e.check} Won: ${formatCoins(payout)} (x${multiplier})` : `${e.cross} Lost: ${formatCoins(bet)}`}
┃ ${e.coin} Balance: ${formatCoins(updated?.balance ?? 0)}
╰━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
