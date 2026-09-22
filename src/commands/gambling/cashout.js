import { emoji as e } from '../../config/config.js';
import { addCoins } from '../../database/database.js';
import { formatCoins } from '../economy/_utils.js';
import { resolveSender, jid } from '../../utils/utils.js';
import { activeCrashGames } from './crash.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['cashout'],
  desc: 'Cash out your winnings in an active crash game before it crashes',

  run: async ({ text, sonic, msg }) => {
    const chatJid = msg.key.remoteJid;
    const sender = resolveSender(msg, sonic);

    const session = activeCrashGames.get(chatJid);
    if (!session || session.status !== 'running') {
      return text(`${e.cross} No active crash game is running for you in this chat right now!`);
    }

    const senderNum = jid.fromUser(sender);
    const sessionNum = jid.fromUser(session.userId);

    if (senderNum !== sessionNum) {
      return text(`${e.cross} You are not the player running this crash game!`);
    }

    const cashedOutAt = session.currentMultiplier;
    const winnings = Math.floor(session.bet * cashedOutAt);

    session.status = 'cashed_out';
    session.cashedOutAt = cashedOutAt;
    session.winnings = winnings;

    addCoins(sender, winnings);

    return text(
      `
💸 *CASHOUT CLAIMED!*
📈 Multiplier: *${cashedOutAt.toFixed(2)}x*
🎉 Won: *+${formatCoins(winnings)}* coins
`.trim(),
    );
  },
};
