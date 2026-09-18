import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

const HEIST_COOLDOWN = 600000;

/** @type {Record<string, { name: string, emoji: string, chance: number, min: number, max: number, fine: number, successDesc: string, failDesc: string }>} */
const APPROACHES = {
  stealth: {
    name: 'Stealth Infiltration',
    emoji: '🥷',
    chance: 0.55,
    min: 400,
    max: 1200,
    fine: 200,
    successDesc:
      'You slipped past the thermal sensors and cracked the deposit lockboxes undetected!',
    failDesc: 'A guard spotted your shadow on the catwalk and sounded the silent alarm!',
  },
  hack: {
    name: 'Cyber Breach',
    emoji: '💻',
    chance: 0.45,
    min: 800,
    max: 2000,
    fine: 350,
    successDesc:
      'You bypassed the biometric mainframe and wired emergency vault funds directly to your wallet!',
    failDesc:
      'Automated firewall countermeasures traced your terminal and locked down the terminal!',
  },
  loud: {
    name: 'Explosive Smash & Grab',
    emoji: '💥',
    chance: 0.32,
    min: 1500,
    max: 4500,
    fine: 600,
    successDesc:
      'You blew the heavy vault blast doors wide open and escaped with sacks of gold bars!',
    failDesc:
      'SWAT arrived before the drill finished! You dropped the loot and fled under heavy fire!',
  },
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['heist'],
  desc: 'Plan and execute a high-stakes vault heist',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    const approachKey = args[0]?.toLowerCase();
    const approach = APPROACHES[approachKey ?? ''];

    if (!approach) {
      return text(
        `
🏦 *CHOOSE HEIST APPROACH*

🥷 *stealth* - 55% Win | 400-1.2k coins | 200 fine
💻 *hack*    - 45% Win | 800-2k coins   | 350 fine
💥 *loud*    - 32% Win | 1.5k-4.5k coins| 600 fine

Usage: !heist <stealth|hack|loud>
`.trim(),
      );
    }

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    if (user.balance < approach.fine) {
      return text(
        `${e.cross} You need at least ${formatCoins(approach.fine)} in cash to cover potential getaway fines!`,
      );
    }

    if (!(await checkEconCooldown(sonic, msg, 'heist', HEIST_COOLDOWN))) return;

    const roll = Math.random();
    const isSuccess = roll <= approach.chance;

    if (isSuccess) {
      const loot = random(approach.min, approach.max);
      const newBalance = addCoins(sender, loot);

      await text(
        `
🏦 *HEIST SUCCESSFUL!*
${approach.emoji} Approach: *${approach.name}*

📜 ${approach.successDesc}

${e.check} Loot Taken: *+${formatCoins(loot)}* coins
${e.coin} Balance: *${formatCoins(newBalance ?? 0)}*
`.trim(),
      );
    } else {
      removeCoins(sender, approach.fine);
      const updated = getUser(sender);

      await text(
        `
🚨 *HEIST BUSTED!*
${approach.emoji} Approach: *${approach.name}*

⚠️ ${approach.failDesc}

${e.cross} Fine Paid: *-${formatCoins(approach.fine)}* coins
${e.coin} Balance: *${formatCoins(updated?.balance ?? 0)}*
`.trim(),
      );
    }
  },
};
