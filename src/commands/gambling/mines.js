import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const MULTIPLIERS = [1.15, 1.45, 1.95, 2.7, 3.9, 5.8, 9.0, 15.0];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['mines'],
  desc: 'Uncover gems without hitting hidden mines for compounding multipliers',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your balance.`);

    const tilesCount = parseInt(args[0] ?? '0', 10);
    if (isNaN(tilesCount) || tilesCount < 1 || tilesCount > 8) {
      return text(
        `${e.cross} Choose how many tiles to uncover (1 to 8)!\nExample: !mines 3 100 (Uncover 3 gems for ~1.95x)`,
      );
    }

    const bet = args[1]?.toLowerCase() === 'all' ? user.balance : parseInt(args[1] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !mines 3 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    if (!(await checkEconCooldown(sonic, msg, 'mines', 2 * 60 * 1000))) return;

    const allIndices = Array.from({ length: 25 }, (_, i) => i);

    for (let i = allIndices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = allIndices[i];
      // @ts-ignore
      allIndices[i] = allIndices[j];
      // @ts-ignore
      allIndices[j] = temp;
    }

    const minePositions = new Set(allIndices.slice(0, 4));

    let hitMine = false;

    for (let s = 0; s < tilesCount; s++) {
      const remainingTiles = 25 - s;
      const bombProb = 4 / remainingTiles;
      if (Math.random() < bombProb) {
        hitMine = true;
        break;
      }
    }

    // @ts-ignore
    const mult = MULTIPLIERS[tilesCount - 1] ?? 1.5;
    const won = !hitMine;
    const payout = Math.floor(bet * mult);

    if (won) {
      addCoins(sender, payout - bet);
    } else {
      removeCoins(sender, bet);
    }

    const board = [];
    for (let r = 0; r < 5; r++) {
      let row = '';
      for (let c = 0; c < 5; c++) {
        const idx = r * 5 + c;
        if (hitMine && idx === 0) {
          row += '💣 ';
        } else if (idx < tilesCount) {
          row += won ? '💎 ' : '⬛ ';
        } else if (minePositions.has(idx) && !won) {
          row += '💣 ';
        } else {
          row += '⬛ ';
        }
      }
      board.push(`${row.trim()}`);
    }

    await text(
      `
Tiles Target: *${tilesCount}* (x${mult})
${board.join('\n')}

${won ? `${e.check} All gems cleared! Won: *+${formatCoins(payout)}* (x${mult})` : `💥 BOOM! You triggered a hidden mine! Lost: *-${formatCoins(bet)}*`}
`.trim(),
    );
  },
};
