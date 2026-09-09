import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const HORSES = [
  { id: 1, name: 'Sonic Speedster', emoji: '🦔', odds: 2.2, weight: 40 },
  { id: 2, name: 'Shadow Comet', emoji: '🖤', odds: 3.2, weight: 28 },
  { id: 3, name: 'Knuckles Brawler', emoji: '🥊', odds: 5.0, weight: 18 },
  { id: 4, name: 'Tails Flyer', emoji: '🦊', odds: 8.5, weight: 10 },
  { id: 5, name: 'Eggman Rocket', emoji: '🥚', odds: 18.0, weight: 4 },
];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['derby'],
  desc: 'Bet on the championship derby race across 5 competitors',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'derby', 8000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const horsePick = parseInt(args[0] ?? '0', 10);
    const chosenHorse = HORSES.find((h) => h.id === horsePick);

    if (!chosenHorse) {
      const roster = HORSES.map((h) => `┃ ${h.id}. ${h.emoji} *${h.name}* (Odds: ${h.odds}x)`).join(
        '\n',
      );
      return text(
        `
╭━━━ 🏇 *CHAMPIONSHIP DERBY* ━━━╮
┃ Choose your racer (1-5):
${roster}
┃
┃ Usage: !derby <1-5> <bet>
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
      );
    }

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !derby 1 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    const roll = random(1, 100);
    let cumulative = 0;
    let winner = HORSES[0];
    for (const h of HORSES) {
      cumulative += h.weight;
      if (roll <= cumulative) {
        winner = h;
        break;
      }
    }

    // @ts-ignore
    const won = chosenHorse.id === winner.id;
    // @ts-ignore
    const payout = won ? Math.floor(bet * chosenHorse.odds) : 0;

    if (won) {
      addCoins(sender, payout - bet);
    } else {
      removeCoins(sender, bet);
    }

    const updated = getUser(sender);

    const track = HORSES.map((h) => {
      // @ts-ignore
      const isWinner = h.id === winner.id;
      const progress = isWinner ? '━━━━🏁' : '━━━🐎';
      return `┃ ${h.emoji} ${progress} ${h.name}`;
    }).join('\n');

    await text(
      `
╭━━━ 🏇 *DERBY FINISH LINE* ━━━╮
${track}
┃
┃ 🏆 Winner: *${winner?.name}!* (${winner?.odds}x)
┃ Your Bet: *${chosenHorse.name}*
┃
┃ ${won ? `${e.check} Won: *+${formatCoins(payout)}* (x${chosenHorse.odds})` : `${e.cross} Lost: *-${formatCoins(bet)}*`}
┃ ${e.coin} Balance: ${formatCoins(updated?.balance ?? 0)}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
