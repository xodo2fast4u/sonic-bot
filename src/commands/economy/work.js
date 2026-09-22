import { emoji as e } from '../../config/config.js';
import { addCoins, hasItem } from '../../database/database.js';
import { COOLDOWN } from '../../utils/cooldown.js';
import { JOBS, random, randomFrom, formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['work'],
  desc: 'Work a random job for coins',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'work', COOLDOWN.WORK))) return;

    const job = randomFrom(JOBS);
    let earned = random(job.min, job.max);

    if (hasItem(sender, 'laptop')) {
      earned = Math.floor(earned * 1.25);
    }

    const action = randomFrom(job.messages);

    const newBalance = addCoins(sender, earned);

    if (newBalance === null || newBalance === undefined) {
      await text(`${e.cross} Failed to update balance. Please try again.`);
      return;
    }

    await text(
      `
You worked as a *${job.name}* and ${action}!

${e.check} Earned: ${formatCoins(earned)}
`.trim(),
    );
  },
};
