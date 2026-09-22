import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

const MIN_BALANCE = 500;
const COOLDOWN = 15 * 60 * 1000;
const SOUTH_AFRICAN_BANKS = [
  'Standard Bank',
  'ABSA',
  'First National Bank',
  'Nedbank',
  'Capitec Bank',
  'Investec Bank',
  'African Bank',
];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['robbank'],
  desc: 'Attempt to rob the central bank',

  run: async ({ text, sonic, msg }) => {
    const sender = resolveSender(msg);
    const user = getUser(sender);

    if (!user) return text(`${e.cross} Could not load your balance.`);
    if (user.balance < MIN_BALANCE) {
      return text(
        `${e.cross} You need at least ${formatCoins(MIN_BALANCE)} coins to rob the bank.`,
      );
    }
    if (!(await checkEconCooldown(sonic, msg, 'robbank', COOLDOWN))) return;

    const bank =
      SOUTH_AFRICAN_BANKS[random(0, SOUTH_AFRICAN_BANKS.length - 1)] ?? 'South African bank';
    const success = random(1, 100) <= 35;
    if (success) {
      const loot = random(250, Math.min(5000, Math.floor(user.balance * 1.5)));
      addCoins(sender, loot);
      return text(
        `
🏦 *${bank.toUpperCase()} ROBBERY SUCCESSFUL!*

${e.check} You cracked the vault and escaped!
💰 Loot: *+${formatCoins(loot)}* coins
`.trim(),
      );
    }

    const fine = random(250, Math.min(1000, user.balance));
    removeCoins(sender, fine);
    return text(
      `
🚨 *${bank.toUpperCase()} ROBBERY FAILED!*

${e.cross} The alarm caught you before you reached the vault.
💸 Fine: *-${formatCoins(fine)}* coins
`.trim(),
    );
  },
};
