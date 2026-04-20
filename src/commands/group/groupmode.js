import { emoji as e } from "../../config/config.js";

export default {
  cmd: ["groupmode"],
  desc: "Change group member add or join approval mode",

  run: async ({ text, sonic, msg }, args) => {
    const sub = args[0]?.toLowerCase();
    if (!sub || !["memberadd", "joinapproval"].includes(sub))
      return text(`${e.warn} Use: groupmode <memberadd|joinapproval> <value>`);

    try {
      if (sub === "memberadd") {
        const mode = args[1]?.toLowerCase();
        if (
          !mode ||
          !["admin_add", "all_member_add", "admin", "all"].includes(mode)
        )
          return text(`${e.warn} Provide mode: admin_add or all_member_add`);

        await sonic.groupMemberAddMode(
          msg.key.remoteJid,
          mode === "admin" ? "admin_add" : mode,
        );
        await text(`${e.check} Group member add mode updated!`);
        return;
      }

      const value = args[1]?.toLowerCase();
      if (!value || !["on", "off"].includes(value))
        return text(`${e.warn} Provide on or off.`);

      await sonic.groupJoinApprovalMode(msg.key.remoteJid, value);
      await text(`${e.check} Group join approval set to ${value}!`);
    } catch (err) {
      await text(`${e.cross} Failed to update mode. ${err.message || ""}`);
    }
  },
};
