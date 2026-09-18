import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const CARDS = [
  { rank: 'A', val: 1 },
  { rank: '2', val: 2 },
  { rank: '3', val: 3 },
  { rank: '4', val: 4 },
  { rank: '5', val: 5 },
  { rank: '6', val: 6 },
  { rank: '7', val: 7 },
  { rank: '8', val: 8 },
  { rank: '9', val: 9 },
  { rank: '10', val: 0 },
  { rank: 'J', val: 0 },
  { rank: 'Q', val: 0 },
  { rank: 'K', val: 0 },
];

/** @returns {{ rank: string, val: number }} */
const drawCard = () => {
  const card = CARDS[random(0, CARDS.length - 1)] || CARDS[0];
  return card || { rank: 'A', val: 1 };
};

/** @param {Array<{ rank: string, val: number }>} cards */
const scoreHand = (cards) => {
  const sum = cards.reduce((acc, c) => acc + (c?.val ?? 0), 0);
  return sum % 10;
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['baccarat'],
  desc: 'Classic Punto Banco casino baccarat (bet on player, banker or tie)',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'baccarat', 6000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const rawChoice = args[0]?.toLowerCase();
    const isPlayer = ['player', 'p'].includes(rawChoice ?? '');
    const isBanker = ['banker', 'b'].includes(rawChoice ?? '');
    const isTie = ['tie', 't'].includes(rawChoice ?? '');

    if (!isPlayer && !isBanker && !isTie) {
      return text(
        `${e.cross} Choose your bet: *player*, *banker* or *tie*!\nExample: !baccarat banker 100`,
      );
    }

    const choice = isPlayer ? 'player' : isBanker ? 'banker' : 'tie';

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !baccarat banker 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    const playerHand = [drawCard(), drawCard()];
    const bankerHand = [drawCard(), drawCard()];

    let playerScore = scoreHand(playerHand);
    let bankerScore = scoreHand(bankerHand);

    const isNatural = playerScore >= 8 || bankerScore >= 8;

    if (!isNatural) {
      if (playerScore <= 5) {
        const thirdCard = drawCard();
        playerHand.push(thirdCard);
        playerScore = scoreHand(playerHand);

        if (bankerScore <= 5) {
          bankerHand.push(drawCard());
          bankerScore = scoreHand(bankerHand);
        }
      } else if (bankerScore <= 5) {
        bankerHand.push(drawCard());
        bankerScore = scoreHand(bankerHand);
      }
    }

    let winner = 'tie';
    if (playerScore > bankerScore) winner = 'player';
    else if (bankerScore > playerScore) winner = 'banker';

    const won = choice === winner;
    let payout = 0;

    if (won) {
      if (winner === 'tie') {
        payout = bet * 8;
      } else if (winner === 'banker') {
        payout = Math.floor(bet * 0.95);
      } else {
        payout = bet;
      }
      addCoins(sender, payout);
    } else {
      removeCoins(sender, bet);
    }

    const updated = getUser(sender);
    const pCardsStr = playerHand.map((c) => c?.rank ?? '').join(' ');
    const bCardsStr = bankerHand.map((c) => c?.rank ?? '').join(' ');

    await text(
      `
🎴 *BACCARAT*
👤 Player: [${pCardsStr}] -> *${playerScore}*
🏦 Banker: [${bCardsStr}] -> *${bankerScore}*

Result: *${winner.toUpperCase()} WINS*
Your Pick: *${choice.toUpperCase()}*

${won ? `${e.check} Won: +${formatCoins(payout)} coins` : `${e.cross} Lost: -${formatCoins(bet)} coins`}
${e.coin} Balance: ${formatCoins(updated?.balance ?? 0)}
`.trim(),
    );
  },
};
