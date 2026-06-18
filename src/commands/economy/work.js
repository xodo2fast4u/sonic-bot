import { emoji as e } from '../../config/config.js';
import { addCoins } from '../../database/database.js';
import { COOLDOWN } from '../../utils/cooldown.js';
import { JOBS, random, randomFrom, formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

export default {
  cmd: ['work', 'job'],
  desc: 'Work a random job for coins',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'work', COOLDOWN.WORK))) return;

    const job = randomFrom(JOBS);
    const earned = random(job.min, job.max);
    const action = randomFrom(job.messages);

    const newBalance = addCoins(sender, earned);

    if (newBalance === null || newBalance === undefined) {
      await text(`${e.cross} Failed to update balance. Please try again.`);
      return;
    }

    await text(
      `
╭━━━ ${job.emoji} *WORK* ━━━╮
┃ 
┃ You worked as a *${job.name}*
┃ and ${action}!
┃
┃ ${e.check} Earned: ${formatCoins(earned)}
┃ ${e.ring} Balance: ${formatCoins(newBalance)}
╰━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
