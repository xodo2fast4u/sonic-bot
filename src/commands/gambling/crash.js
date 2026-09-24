import { emoji as e } from '../../config/config.js';
import { getUser, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown } from '../economy/_utils.js';
import { resolveSender, jid, send } from '../../utils/utils.js';

/**
 * Active crash games per chat.
 * @type {Map<string, {
 *   chatJid: string,
 *   userId: string,
 *   bet: number,
 *   crashPoint: number,
 *   currentMultiplier: number,
 *   status: 'running' | 'cashed_out' | 'crashed',
 *   cashedOutAt?: number,
 *   winnings?: number,
 *   messageKey?: any
 * }>}
 */
export const activeCrashGames = new Map();

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['crash'],
  desc: 'Bet on an escalating multiplier and cash out before it crashes!',

  run: async ({ text, sonic, msg }, args) => {
    const chatJid = msg.key.remoteJid;
    const sender = resolveSender(msg, sonic);
    const userId = jid.fromUser(sender);

    if (activeCrashGames.has(chatJid)) {
      return text(
        `${e.cross} A crash game is already running in this chat! Wait for it to end or use !cashout.`,
      );
    }

    if (!(await checkEconCooldown(sonic, msg, 'crash', 10 * 60 * 1000))) return;

    const user = getUser(sender);
    if (!user) {
      return text(`${e.cross} Could not load your balance.`);
    }

    const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0] ?? '', 10);

    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet! Example: !crash 500 or !crash all`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    removeCoins(sender, bet);

    const instantCrash = Math.random() < 0.08;
    const crashPoint = instantCrash
      ? 1.0
      : parseFloat((1.0 + Math.pow(Math.random(), 1.7) * 30).toFixed(2));

    const gameSession = {
      chatJid,
      userId: sender,
      bet,
      crashPoint,
      currentMultiplier: 1.0,
      status: /** @type {'running' | 'cashed_out' | 'crashed'} */ ('running'),
      messageKey: null,
    };

    activeCrashGames.set(chatJid, gameSession);

    const initialMsg = await send.mention(
      sonic,
      msg,
      `🚀 *CRASH GAME STARTED!*
👤 Player: @${userId}
💰 Bet: *${formatCoins(bet)}* coins

📈 Multiplier: *1.00x*
💡 Quick! Type *!cashout* to claim earnings before the rocket crashes!`,
      [jid.toUser(userId)],
    );

    gameSession.messageKey = initialMsg.key;

    const interval = setInterval(async () => {
      const session = activeCrashGames.get(chatJid);
      if (!session) {
        clearInterval(interval);
        return;
      }

      if (session.status === 'cashed_out') {
        clearInterval(interval);
        activeCrashGames.delete(chatJid);
        const winAmount = session.winnings ?? 0;

        await send.edit(
          sonic,
          msg,
          session.messageKey,
          `💸 *CASHOUT SUCCESSFUL!*
👤 Player: @${userId}
📈 Cashed Out At: *${session.cashedOutAt?.toFixed(2)}x*
🎉 Winnings: *+${formatCoins(winAmount)}* coins`,
          [jid.toUser(userId)],
        );
        return;
      }

      const growthRate = 1.05 + Math.random() * 0.35;
      const nextMultiplier = parseFloat((session.currentMultiplier * growthRate).toFixed(2));

      if (nextMultiplier >= session.crashPoint) {
        session.status = 'crashed';
        clearInterval(interval);
        activeCrashGames.delete(chatJid);

        await send.edit(
          sonic,
          msg,
          session.messageKey,
          `💥 *ROCKET CRASHED AT ${session.crashPoint.toFixed(2)}x!*
👤 Player: @${userId}
💸 Lost: *-${formatCoins(bet)}* coins`,
          [jid.toUser(userId)],
        );
        return;
      }

      session.currentMultiplier = nextMultiplier;

      await send.edit(
        sonic,
        msg,
        session.messageKey,
        `🚀 *CRASH GAME IN PROGRESS...*
👤 Player: @${userId}
💰 Bet: *${formatCoins(bet)}* coins

📈 Multiplier: *${session.currentMultiplier.toFixed(2)}x*
💡 Quick! Type *!cashout* to claim earnings before the rocket crashes!`,
        [jid.toUser(userId)],
      );
    }, 1800);
  },
};
