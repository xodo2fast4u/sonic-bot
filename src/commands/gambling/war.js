import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const CARDS = [
  { rank: '2', val: 2 },
  { rank: '3', val: 3 },
  { rank: '4', val: 4 },
  { rank: '5', val: 5 },
  { rank: '6', val: 6 },
  { rank: '7', val: 7 },
  { rank: '8', val: 8 },
  { rank: '9', val: 9 },
  { rank: '10', val: 10 },
  { rank: 'J', val: 11 },
  { rank: 'Q', val: 12 },
  { rank: 'K', val: 13 },
  { rank: 'A', val: 14 },
];

/** @returns {{ rank: string, val: number }} */
const drawCard = () => {
  const card = CARDS[random(0, CARDS.length - 1)] || CARDS[0];
  return card || { rank: 'A', val: 14 };
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['war'],
  desc: 'Single-card showdown vs dealer with Go-to-War tie escalation',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your balance.`);

    const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !war 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    if (!(await checkEconCooldown(sonic, msg, 'war', 2 * 60 * 1000))) return;

    const playerCard = drawCard();
    const dealerCard = drawCard();

    let warText = '';
    let won;
    let payout = 0;

    if (playerCard.val > dealerCard.val) {
      won = true;
      payout = bet;
      addCoins(sender, payout);
    } else if (dealerCard.val > playerCard.val) {
      won = false;
      removeCoins(sender, bet);
    } else {
      const playerWarCard = drawCard();
      const dealerWarCard = drawCard();

      if (playerWarCard.val >= dealerWarCard.val) {
        won = true;
        payout = bet * 2;
        addCoins(sender, payout);
        warText = `\n⚔️ *IT'S A TIE! GOING TO WAR!*\nPlayer War Card: [${playerWarCard.rank}]\nDealer War Card: [${dealerWarCard.rank}]\n🏆 *You won the WAR showdown!*`;
      } else {
        won = false;
        removeCoins(sender, bet);
        warText = `\n⚔️ *IT'S A TIE! GOING TO WAR!*\nPlayer War Card: [${playerWarCard.rank}]\nDealer War Card: [${dealerWarCard.rank}]\n💀 *Dealer won the WAR showdown!*`;
      }
    }

    await text(
      `
⚔️ *CASINO WAR*
👤 Your Card:   [${playerCard.rank}]
🤖 Dealer Card: [${dealerCard.rank}]${warText}

${won ? `${e.check} Victory! Won: *+${formatCoins(payout)}* coins` : `${e.cross} Defeat! Lost: *-${formatCoins(bet)}* coins`}
`.trim(),
    );
  },
};
