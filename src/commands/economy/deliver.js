import { emoji as e } from '../../config/config.js';
import { addCoins } from '../../database/database.js';
import { checkEconCooldown, formatCoins, random } from './_utils.js';
import { resolveSender } from '../../utils/utils.js';

const ROUTES = {
  local: { name: 'local parcel', chance: 90, min: 35, max: 70 },
  express: { name: 'express parcel', chance: 75, min: 80, max: 150 },
  overnight: { name: 'overnight parcel', chance: 55, min: 160, max: 300 },
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['deliver'],
  desc: 'Deliver a parcel for a guaranteed-risk-free opportunity',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);
    if (!(await checkEconCooldown(sonic, msg, 'deliver', 12 * 60 * 1000))) return;

    const routeName = args[0]?.toLowerCase() || 'local';
    const route = Object.hasOwn(ROUTES, routeName)
      ? ROUTES[/** @type {keyof typeof ROUTES} */ (routeName)]
      : undefined;
    if (!route) {
      return text(`${e.cross} Choose a route: local, express or overnight.`);
    }

    if (random(1, 100) > route.chance) {
      return text(
        `
📦 *DELIVERY DELAYED*

The ${route.name} was delayed in transit. You paid nothing and earned nothing.
Try another route later.
`.trim(),
      );
    }

    const earned = random(route.min, route.max);
    addCoins(sender, earned);

    return text(
      `
📦 *DELIVERY COMPLETE*

${e.check} You delivered the ${route.name}.
${e.star} Earned: ${formatCoins(earned)}
`.trim(),
    );
  },
};
