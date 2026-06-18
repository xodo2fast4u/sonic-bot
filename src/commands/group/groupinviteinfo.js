import { emoji as e } from '../../config/config.js';

const extractInviteCode = (value = '') => value.replace('https://chat.whatsapp.com/', '').trim();

export default {
  cmd: ['groupinvite'],
  desc: 'Get metadata for a WhatsApp group invite link',

  run: async ({ text, sonic }, args) => {
    const code = extractInviteCode(args[0]);
    if (!code) return text(`${e.warn} Provide invite code or link.`);

    try {
      const metadata = await sonic.groupGetInviteInfo(code);
      await text(
        `${e.check} Invite info:\nName: ${metadata.subject || 'Unknown'}\nGroup JID: ${metadata.id || 'Unknown'}\nMembers: ${metadata.size || 'Unknown'}`,
      );
    } catch (err) {
      await text(`${e.cross} Invalid invite or failed to retrieve info.`);
    }
  },
};
