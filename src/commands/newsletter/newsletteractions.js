import { emoji as e } from "../../config/config.js";
import { getTarget } from "../../utils/utils.js";

const parseTarget = (args, msg) => {
  if (args[2]) return `${args[2].replace(/[^0-9]/g, "")}@s.whatsapp.net`;
  return getTarget(msg);
};

export default {
  cmd: ["newsletteractions"],
  desc: "Follow, mute, react, and manage newsletter permissions",

  run: async ({ text, sonic, msg }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action)
      return text(
        `${e.warn} Use: newsletteractions <follow|unfollow|mute|unmute|react|admincount|changeowner|demote|delete> ...`,
      );

    try {
      if (["follow", "unfollow", "mute", "unmute"].includes(action)) {
        const jidArg = args[1];
        if (!jidArg) return text(`${e.warn} Provide newsletter JID.`);
        if (action === "follow") await sonic.newsletterFollow(jidArg);
        if (action === "unfollow") await sonic.newsletterUnfollow(jidArg);
        if (action === "mute") await sonic.newsletterMute(jidArg);
        if (action === "unmute") await sonic.newsletterUnmute(jidArg);
        return text(`${e.check} ${action} succeeded.`);
      }

      if (action === "react") {
        const jidArg = args[1];
        const serverId = args[2];
        const reaction = args[3];
        if (!jidArg || !serverId)
          return text(
            `${e.warn} Use: newsletteractions react <jid> <serverId> [emoji]`,
          );
        await sonic.newsletterReactMessage(jidArg, serverId, reaction);
        return text(`${e.check} Reaction sent.`);
      }

      if (action === "admincount") {
        const jidArg = args[1];
        if (!jidArg) return text(`${e.warn} Provide newsletter JID.`);
        const count = await sonic.newsletterAdminCount(jidArg);
        return text(`${e.check} Admin count: ${count}`);
      }

      if (action === "changeowner") {
        const jidArg = args[1];
        const user = parseTarget(args, msg);
        if (!jidArg || !user)
          return text(
            `${e.warn} Use: newsletteractions changeowner <newsletterJid> <user>`,
          );
        await sonic.newsletterChangeOwner(jidArg, user);
        return text(`${e.check} Owner changed to ${user}`);
      }

      if (action === "demote") {
        const jidArg = args[1];
        const user = parseTarget(args, msg);
        if (!jidArg || !user)
          return text(
            `${e.warn} Use: newsletteractions demote <newsletterJid> <user>`,
          );
        await sonic.newsletterDemote(jidArg, user);
        return text(`${e.check} User demoted: ${user}`);
      }

      if (action === "delete") {
        const jidArg = args[1];
        if (!jidArg) return text(`${e.warn} Provide newsletter JID.`);
        await sonic.newsletterDelete(jidArg);
        return text(`${e.check} Newsletter deleted.`);
      }

      return text(`${e.warn} Unknown newsletter action: ${action}`);
    } catch (err) {
      await text(`${e.cross} Failed to ${action}. ${err.message || ""}`);
    }
  },
};
