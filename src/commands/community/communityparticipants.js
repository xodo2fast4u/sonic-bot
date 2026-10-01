import { emoji as e } from '../../config/config.js';
import { getTarget, jid } from '../../utils/utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @param {string[]} args @param {any} msg @param {any} sonic */
const parseTargets = async (args, msg, sonic) => {
  if (args.length)
    return args
      .map((/** @type {string} */ num) => num.replace(/[^0-9]/g, ''))
      .filter(Boolean)
      .map((/** @type {string} */ num) => jid.toUser(num));

  const target = await getTarget(msg, sonic);
  return target ? [target] : [];
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['communityparticipants'],
  desc: 'Manage community members: add, remove, promote, demote',

  run: async ({ text, sonic, msg }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action || !['add', 'remove', 'promote', 'demote'].includes(action))
      return text(
        `${e.warn} Use: communityparticipants <add|remove|promote|demote> [numbers or mention]`,
      );

    const targets = await parseTargets(args.slice(1), msg, sonic);
    if (!targets.length) return text(`${e.warn} Mention or provide numbers to ${action}.`);

    try {
      const results = await sonic.communityParticipantsUpdate(msg.key.remoteJid, targets, action);
      await text(
        `${e.check} ${action} result:\n${results
          .map((/** @type {any} */ res) => `${res.jid}: ${res.status}`)
          .join('\n')}`,
      );
    } catch (err) {
      await text(`${e.cross} Failed to ${action} members. ${getErrorMessage(err) || ''}`);
    }
  },
};
