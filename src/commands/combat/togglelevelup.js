import { emoji as e } from '../../config/config.js';
import { resolveSender } from '../../utils/utils.js';
import { toggleLevelUpSetting, getCharacter } from '../../database/database.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['togglelevelup'],
  desc: 'Toggle level up announcement messages on or off for yourself',

  run: async ({ text, msg }) => {
    const sender = resolveSender(msg);
    const char = getCharacter(sender, msg.pushName);

    if (!char) return text(`${e.cross} Could not load character profile.`);

    const isEnabled = toggleLevelUpSetting(sender);

    await text(
      `
🔔 *LEVEL UP ALERTS*

Status: *${isEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}*

${
        isEnabled
          ? 'You will now receive a celebration message whenever you level up!'
          : 'Level up messages are now silenced. You will level up in the background!'
      }
`.trim(),
    );
  },
};
