import { emoji as e } from '../../config/config.js';
import { getTarget, resolveSender, jid } from '../../utils/utils.js';
import logger from '../../utils/logger.js';

/** @param {string[]} args @param {any} msg */
const parseJids = (args, msg) => {
  if (args.length)
    return args
      .map((/** @type {string} */ num) => num.replace(/[^0-9]/g, ''))
      .filter(Boolean)
      .map((/** @type {string} */ num) => jid.toUser(num));

  const target = getTarget(msg);
  return target ? [target] : [];
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['grouprequest'],
  desc: 'List or manage group membership requests',

  run: async ({ text, sonic, msg }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action || !['list', 'approve', 'reject'].includes(action))
      return text(`${e.warn} Use: grouprequest <list|approve|reject> [numbers or mention]`);

    const actor = resolveSender(msg);

    try {
      if (action === 'list') {
        const requests = await sonic.groupRequestParticipantsList(msg.key.remoteJid);
        if (!requests.length) return text(`${e.check} No pending group requests.`);

        await text(
          `${e.check} Pending requests (requested by +${jid.fromUser(actor)}):\n${requests.map((/** @type {any} */ req) => req.jid).join('\n')}`,
        );
        return;
      }

      const participants = parseJids(args.slice(1), msg);
      if (!participants.length) return text(`${e.warn} Mention or provide numbers to ${action}.`);

      const results = await sonic.groupRequestParticipantsUpdate(
        msg.key.remoteJid,
        participants,
        action,
      );

      await text(
        `${e.check} Request ${action}ed by +${jid.fromUser(actor)}:\n${results.map((/** @type {any} */ res) => `${res.jid}: ${res.status}`).join('\n')}`,
      );
    } catch (err) {
      logger.error(`[group:request:${action}]`, err);
      await text(`${e.cross} Failed to ${action} requests.`);
    }
  },
};
