import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['keno'],
  desc: 'Pick 3 lucky numbers from 1-20 and match against 8 house draws',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'keno', 6000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    if (args.length < 4) {
      return text(
        `${e.info} Usage: !keno <n1> <n2> <n3> <bet>\nExample: !keno 4 12 18 100 (Pick 3 numbers between 1 and 20)`,
      );
    }

    const n1 = parseInt(args[0] ?? '0', 10);
    const n2 = parseInt(args[1] ?? '0', 10);
    const n3 = parseInt(args[2] ?? '0', 10);
    const rawPicks = [n1, n2, n3];

    const picks = Array.from(new Set(rawPicks)).filter((n) => !isNaN(n) && n >= 1 && n <= 20);
    if (picks.length !== 3) {
      return text(
        `${e.cross} Choose 3 UNIQUE numbers between 1 and 20!\nExample: !keno 5 10 15 100`,
      );
    }

    const bet = args[3]?.toLowerCase() === 'all' ? user.balance : parseInt(args[3] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !keno 5 10 15 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    const pool = Array.from({ length: 20 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pool[i];
      // @ts-ignore
      pool[i] = pool[j];
      // @ts-ignore
      pool[j] = temp;
    }
    const drawn = pool.slice(0, 8).sort((a, b) => a - b);
    const matches = picks.filter((p) => drawn.includes(p));

    let multiplier = 0;
    if (matches.length === 3) multiplier = 15.0;
    else if (matches.length === 2) multiplier = 2.5;

    const payout = Math.floor(bet * multiplier);
    const won = multiplier > 0;

    if (won) {
      addCoins(sender, payout - bet);
    } else {
      removeCoins(sender, bet);
    }

    const updated = getUser(sender);
    const drawnStr = drawn.map((n) => (picks.includes(n) ? `*${n}*🎯` : `${n}`)).join(' ');

    await text(
      `
🎱 *CASINO KENO*
🎯 Your Picks: [${picks.join(', ')}]
🎱 House Drawn: ${drawnStr}

Matches: *${matches.length} / 3* (${matches.length ? matches.join(', ') : 'None'})

${won ? `${e.check} Won: *+${formatCoins(payout)}* (x${multiplier})` : `${e.cross} Lost: *-${formatCoins(bet)}*`}
${e.coin} Balance: ${formatCoins(updated?.balance ?? 0)}
`.trim(),
    );
  },
};
