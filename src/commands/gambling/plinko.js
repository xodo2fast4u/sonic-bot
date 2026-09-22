import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const MULTIPLIERS = [10.0, 3.5, 1.5, 0.6, 0.3, 0.6, 1.5, 3.5, 10.0];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['plinko'],
  desc: 'Drop a chip down the pegboard into multiplier buckets',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'plinko', 2 * 60 * 1000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your balance.`);

    const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !plinko 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    let rightBounces = 0;
    const path = [];
    for (let r = 0; r < 8; r++) {
      const isRight = random(0, 1) === 1;
      if (isRight) rightBounces++;
      path.push(isRight ? '↘️' : '↙️');
    }

    const bucketIndex = rightBounces;
    const mult = MULTIPLIERS[bucketIndex] ?? 1.0;
    const payout = Math.floor(bet * mult);
    const won = payout >= bet;

    if (payout > bet) {
      addCoins(sender, payout - bet);
    } else if (payout < bet) {
      removeCoins(sender, bet - payout);
    }

    const bucketsStr = MULTIPLIERS.map((m, i) => (i === bucketIndex ? `[${m}x]` : `${m}x`)).join(
      ' ',
    );

    await text(
      `
🔴 *PLINKO DROP*
🔘 Drop Path: ${path.slice(0, 4).join('')}
              ${path.slice(4).join('')}

🎯 Landed in Slot: *${mult}x*
[${bucketsStr}]

${won ? `${e.check} Won: +${formatCoins(payout)}` : `${e.cross} Payout: ${formatCoins(payout)} (Lost: -${formatCoins(bet - payout)})`}
`.trim(),
    );
  },
};
