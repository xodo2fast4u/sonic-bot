import { emoji as e } from '../../config/config.js';
import { parseJid, parseJson } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['label'],
  desc: 'Manage labels for chats or messages',

  run: async ({ text, sonic }, args) => {
    const type = args[0]?.toLowerCase();
    if (!type) return text(`${e.warn} Use: label <add|chat|message> ...`);

    try {
      if (type === 'add') {
        const jidArg = parseJid(args[1]);
        const payload = parseJson(args.slice(2).join(' '));
        if (!jidArg || !payload) return text(`${e.warn} Use: label add <jid> <json>`);
        await sonic.addLabel(jidArg, payload);
        return text(`${e.check} Label added to ${jidArg}.`);
      }

      const sub = args[1]?.toLowerCase();
      if (!sub) return text(`${e.warn} Use: label chat|message <add|remove> ...`);

      const jidArg = parseJid(args[2]);
      if (sub === 'chat') {
        const op = args[3]?.toLowerCase();
        const labelId = args[4];
        if (!op || !jidArg || !labelId)
          return text(`${e.warn} Use: label chat <add|remove> <jid> <labelId>`);
        if (op === 'add') {
          await sonic.addChatLabel(jidArg, labelId);
          return text(`${e.check} Chat label added.`);
        }
        if (op === 'remove') {
          await sonic.removeChatLabel(jidArg, labelId);
          return text(`${e.check} Chat label removed.`);
        }
        return text(`${e.warn} Unknown chat label op: ${op}`);
      }

      if (sub === 'message') {
        const op = args[3]?.toLowerCase();
        const messageId = args[4];
        const labelId = args[5];
        if (!op || !jidArg || !messageId || !labelId)
          return text(`${e.warn} Use: label message <add|remove> <jid> <messageId> <labelId>`);
        if (op === 'add') {
          await sonic.addMessageLabel(jidArg, messageId, labelId);
          return text(`${e.check} Message label added.`);
        }
        if (op === 'remove') {
          await sonic.removeMessageLabel(jidArg, messageId, labelId);
          return text(`${e.check} Message label removed.`);
        }
        return text(`${e.warn} Unknown message label op: ${op}`);
      }

      return text(`${e.warn} Unknown label type: ${sub}`);
    } catch (err) {
      return text(`${e.cross} Failed to manage labels. ${getErrorMessage(err) || ''}`);
    }
  },
};
