import { emoji as e } from "../../config/config.js";
import { getTarget, jid } from "../../utils/utils.js";

const parseTarget = (args, msg) => {
  if (args[1]) return jid.toUser(args[1].replace(/[^0-9]/g, ""));
  return getTarget(msg);
};

export default {
  cmd: ["groupv4"],
  desc: "Manage v4 group invites (accept/revoke)",

  run: async ({ text, sonic, msg }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action || !["accept", "revoke"].includes(action))
      return text(`${e.warn} Use: groupv4 <accept|revoke> <code|mention>`);

    try {
      if (action === "accept") {
        const code = args[1]?.replace("https://chat.whatsapp.com/", "")?.trim();
        if (!code) return text(`${e.warn} Provide invite code or link.`);
        const result = await sonic.groupAcceptInvite(code);
        return text(`${e.check} Joined: ${result}`);
      }

      const target = parseTarget(args, msg);
      if (!target)
        return text(`${e.warn} Mention or provide invited user number.`);

      await sonic.groupRevokeInviteV4(msg.key.remoteJid, target);
      await text(`${e.check} Revoked v4 invite for ${target}`);
    } catch (err) {
      await text(
        `${e.cross} Failed to ${action} v4 invite. ${err.message || ""}`,
      );
    }
  },
};
