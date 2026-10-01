import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @param {string} text */
const parseParticipants = (text) =>
  text
    .split(/\s+/)
    .map((/** @type {string} */ num) => num.replace(/[^0-9]/g, ''))
    .filter(Boolean)
    .map((/** @type {string} */ num) => `${num}@s.whatsapp.net`);

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['communitycreate'],
  desc: 'Create a community or a linked subgroup',

  run: async ({ text, sonic }, args) => {
    const sub = args[0]?.toLowerCase();

    try {
      if (sub === 'group') {
        const input = args.slice(1).join(' ');
        if (!input.includes('|'))
          return text(
            `${e.warn} Use: communitycreate group <communityJid> | <subject> | <numbers>`,
          );

        const [communityJid, subject, membersText] = input.split('|').map((part) => part.trim());
        const participants = parseParticipants(membersText ?? '');

        if (!communityJid || !subject || !participants.length)
          return text(`${e.warn} Provide community JID, subject and members.`);

        const metadata = await sonic.communityCreateGroup(subject, participants, communityJid);
        return text(
          `${e.check} Community group created!\nName: ${metadata.subject || 'Unknown'}\nID: ${metadata.id}`,
        );
      }

      const input = args.join(' ');
      if (!input.includes('|'))
        return text(`${e.warn} Use: communitycreate <subject> | <description>`);

      const [subject, description] = input.split('|').map((part) => part.trim());
      if (!subject) return text(`${e.warn} Provide a community subject.`);

      const metadata = await sonic.communityCreate(subject, description || '');
      await text(
        `${e.check} Community created!\nName: ${metadata.subject || 'Unknown'}\nID: ${metadata.id}`,
      );
    } catch (err) {
      await text(`${e.cross} Failed to create community. ${getErrorMessage(err) || ''}`);
    }
  },
};
