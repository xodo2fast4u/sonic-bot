import { emoji as e } from "../../config/config.js";
import { getTarget, jid } from "../../utils/utils.js";
import { setBalance, getUser } from "../../database/database.js";
import { getOwner } from "../../config/config.js";

export default {
  cmd: ["setbalance"],
  desc: "Set a user's balance (Owner only)",

  run: async ({ text, sonic, msg }, args) => {
    const sender = jid.getSender(msg);
    const owner = getOwner();
    
    // Check if sender is owner
    const senderNum = jid.fromUser(sender)?.replace('@s.whatsapp.net', '').replace('@lid', '');
    if (senderNum !== owner) {
      return text(`${e.cross} This command is only available to the bot owner!`);
    }

    const target = getTarget(msg);
    if (!target) {
      return text(`${e.cross} Mention or reply to someone to set their balance!`);
    }

    const amount = parseInt(args[0]) || parseInt(args[1]);
    if (isNaN(amount) || amount < 0) {
      return text(`${e.cross} Provide a valid amount! Example: !setbalance @user 1000`);
    }

    const oldBalance = getUser(target).balance;
    setBalance(target, amount);
    const newBalance = getUser(target).balance;
    const targetNum = jid.fromUser(target);

    await text(
      `
╭━━━ ${e.admin} *BALANCE SET* ━━━╮
┃
┃ ${e.user} Target: @${targetNum}
┃ ${e.cross} Old: ${formatCoins(oldBalance)}
┃ ${e.check} New: ${formatCoins(newBalance)}
┃
┃ ${e.ring} Set by: Owner
╰━━━━━━━━━━━━━━━━━━━━━━╯`.trim(),
    );
  },
};

function formatCoins(amount) {
  return `${amount.toLocaleString()} ${e.coin}`;
}
