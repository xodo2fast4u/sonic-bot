import { emoji as e } from '../../config/config.js';
import { getUser, addCoins, removeCoins } from '../../database/database.js';
import { formatCoins, checkEconCooldown, random } from '../economy/_utils.js';
import { resolveSender } from '../../utils/utils.js';

const SEGMENTS = [
  { label: '1.5x Win', mult: 1.5, emoji: '🟢' },
  { label: '0.0x BUST!', mult: 0.0, emoji: '💀' },
  { label: '2.0x Double', mult: 2.0, emoji: '🔵' },
  { label: '0.5x Half Return', mult: 0.5, emoji: '🟡' },
  { label: '1.5x Win', mult: 1.5, emoji: '🟢' },
  { label: '5.0x Mega', mult: 5.0, emoji: '🥈' },
  { label: '0.0x BUST!', mult: 0.0, emoji: '💀' },
  { label: '2.0x Double', mult: 2.0, emoji: '🔵' },
  { label: '10.0x Super', mult: 10.0, emoji: '🥇' },
  { label: '1.5x Win', mult: 1.5, emoji: '🟢' },
  { label: '0.5x Half Return', mult: 0.5, emoji: '🟡' },
  { label: '50.0x GRAND JACKPOT!', mult: 50.0, emoji: '⭐' },
];

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['wheel'],
  desc: 'Spin the Big Money Prize Wheel for up to 50x multipliers',

  run: async ({ text, sonic, msg }, args) => {
    const sender = resolveSender(msg);

    if (!(await checkEconCooldown(sonic, msg, 'wheel', 6000))) return;

    const user = getUser(sender);
    if (!user) return text(`${e.cross} Could not load your wallet. Try again later.`);

    const bet = args[0]?.toLowerCase() === 'all' ? user.balance : parseInt(args[0] ?? '', 10);
    if (!bet || bet <= 0) {
      return text(`${e.cross} Provide a valid bet!\nExample: !wheel 100`);
    }

    if (bet > user.balance) {
      return text(`${e.cross} You only have ${formatCoins(user.balance)} coins!`);
    }

    const index = random(0, SEGMENTS.length - 1);
    const result = SEGMENTS[index] || SEGMENTS[0] || { label: '1.5x Win', mult: 1.5, emoji: '🟢' };
    const payout = Math.floor(bet * result.mult);
    const won = payout >= bet;

    if (payout > bet) {
      addCoins(sender, payout - bet);
    } else if (payout < bet) {
      removeCoins(sender, bet - payout);
    }

    const updated = getUser(sender);

    await text(
      `
╭━━━ 🎡 *PRIZE WHEEL* ━━━╮
┃ 🎡 The wheel slows down...
┃ ⬇️ Pointer stops at:
┃
┃ ${result.emoji} *${result.label}*
┃
┃ ${won ? `${e.check} Won: *+${formatCoins(payout)}* (x${result.mult})` : `${e.cross} Payout: *${formatCoins(payout)}* (Lost: -${formatCoins(bet - payout)})`}
┃ ${e.coin} Balance: ${formatCoins(updated?.balance ?? 0)}
╰━━━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};
