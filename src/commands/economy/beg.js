import { emoji as e } from '../../config/config.js';
import { addCoins } from '../../database/database.js';
import { random, randomFrom, formatCoins, checkEconCooldown } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

const RESPONSES = {
  success: [
    { giver: 'Sonic', emoji: '🦔', message: 'runs by and drops some rings' },
    {
      giver: 'A kind stranger',
      emoji: '👤',
      message: 'gives you spare change',
    },
    { giver: 'Tails', emoji: '🦊', message: 'shares his savings' },
    { giver: 'A millionaire', emoji: '💰', message: 'feels generous today' },
    { giver: 'Knuckles', emoji: '👊', message: 'gives you treasure he found' },
    { giver: 'Your grandma', emoji: '👵', message: 'sends you money' },
    {
      giver: 'Dr. Eggman',
      emoji: '🥚',
      message: 'accidentally drops coins while fleeing',
    },
  ],
  fail: [
    'Everyone ignored you.',
    'People walked by without looking.',
    'A bird stole the only coin you had.',
    'Someone gave you advice instead.',
    'You got nothing but weird looks.',
    'Better luck next time!',
  ],
};

export default {
  cmd: ['beg'],
  desc: 'Beg for coins',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'beg', 30000))) return;

    const success = random(1, 100) <= 60;

    if (success) {
      const earned = random(1, 50);
      const response = randomFrom(RESPONSES.success);
      const newBalance = addCoins(sender, earned);

      await text(
        `
${response.emoji} *${response.giver}* ${response.message}!

${e.check} Received: ${formatCoins(earned)}
${e.ring} Balance: ${formatCoins(newBalance)}`.trim(),
      );
    } else {
      await text(`${e.cross} ${randomFrom(RESPONSES.fail)}`);
    }
  },
};
