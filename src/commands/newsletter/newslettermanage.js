import { emoji as e } from "../../config/config.js";

export default {
  cmd: ["newslettermanage"],
  desc: "Create or update newsletters and fetch metadata/messages",

  run: async ({ text, sonic }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action)
      return text(
        `${e.warn} Use: newslettermanage <create|update|name|desc|picture|removepic|meta|fetch|subscribe> ...`,
      );

    try {
      if (action === "create") {
        const input = args.slice(1).join(" ");
        if (!input.includes("|"))
          return text(
            `${e.warn} Use: newslettermanage create <name> | <description>`,
          );

        const [name, description] = input.split("|").map((part) => part.trim());
        const metadata = await sonic.newsletterCreate(name, description || "");
        return text(
          `${e.check} Newsletter created!\nName: ${metadata.name}\nID: ${metadata.id}`,
        );
      }

      if (action === "update") {
        const jid = args[1];
        if (!jid) return text(`${e.warn} Provide newsletter JID.`);
        const input = args.slice(2).join(" ");
        if (!input.includes("|"))
          return text(
            `${e.warn} Use: newslettermanage update <jid> <name|description> | <value>`,
          );

        const [field, value] = input.split("|").map((part) => part.trim());
        if (field === "name") {
          await sonic.newsletterUpdateName(jid, value);
          return text(`${e.check} Name updated.`);
        }
        if (field === "description") {
          await sonic.newsletterUpdateDescription(jid, value);
          return text(`${e.check} Description updated.`);
        }
        return text(`${e.warn} Unknown field: ${field}`);
      }

      if (action === "name") {
        const jid = args[1];
        const name = args.slice(2).join(" ");
        if (!jid || !name)
          return text(`${e.warn} Use: newslettermanage name <jid> <name>`);
        await sonic.newsletterUpdateName(jid, name);
        return text(`${e.check} Newsletter name updated.`);
      }

      if (action === "desc") {
        const jid = args[1];
        const description = args.slice(2).join(" ");
        if (!jid)
          return text(
            `${e.warn} Use: newslettermanage desc <jid> <description>`,
          );
        await sonic.newsletterUpdateDescription(jid, description);
        return text(`${e.check} Newsletter description updated.`);
      }

      if (action === "picture") {
        const jid = args[1];
        const url = args[2];
        if (!jid || !url)
          return text(`${e.warn} Use: newslettermanage picture <jid> <url>`);
        await sonic.newsletterUpdatePicture(jid, { url });
        return text(`${e.check} Newsletter picture updated.`);
      }

      if (action === "removepic") {
        const jid = args[1];
        if (!jid)
          return text(`${e.warn} Use: newslettermanage removepic <jid>`);
        await sonic.newsletterRemovePicture(jid);
        return text(`${e.check} Newsletter picture removed.`);
      }

      if (action === "meta") {
        const type = args[1]?.toLowerCase();
        const key = args[2];
        if (!type || !key)
          return text(
            `${e.warn} Use: newslettermanage meta <invite|jid> <key>`,
          );
        const metadata = await sonic.newsletterMetadata(type, key);
        return text(
          `${e.check} Newsletter metadata:\nName: ${metadata?.name || "Unknown"}\nID: ${metadata?.id || "Unknown"}\nSubscribers: ${metadata?.subscribers ?? "Unknown"}`,
        );
      }

      if (action === "fetch") {
        const [jid, count, since, after] = [args[1], args[2], args[3], args[4]];
        if (!jid || !count)
          return text(
            `${e.warn} Use: newslettermanage fetch <jid> <count> [since] [after]`,
          );
        const result = await sonic.newsletterFetchMessages(
          jid,
          Number(count),
          Number(since) || 0,
          Number(after) || 0,
        );
        return text(`${e.check} Messages fetched:\n${JSON.stringify(result)}`);
      }

      if (action === "subscribe") {
        const jid = args[1];
        if (!jid)
          return text(`${e.warn} Use: newslettermanage subscribe <jid>`);
        const result = await sonic.subscribeNewsletterUpdates(jid);
        return text(`${e.check} Subscribed: ${JSON.stringify(result)}`);
      }

      return text(`${e.warn} Unknown newsletter action: ${action}`);
    } catch (err) {
      await text(`${e.cross} Failed to ${action}. ${err.message || ""}`);
    }
  },
};
