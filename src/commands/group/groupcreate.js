import { emoji as e } from "../../config/config.js";
import { jid } from "../../utils/utils.js";

const parseParticipants = (text) =>
  text
    .split(/\s+/)
    .map((num) => num.replace(/[^0-9]/g, ""))
    .filter(Boolean)
    .map((num) => jid.toUser(num));

export default {
  cmd: ["groupcreate", "groupnew"],
  desc: "Create a group with a subject and members",

  run: async ({ text, sonic }, args) => {
    const input = args.join(" ");
    if (!input.includes("|"))
      return text(
        `${e.warn} Use: groupcreate <subject> | <number1> <number2> ...`,
      );

    const [subject, membersText] = input.split("|").map((part) => part.trim());
    const participants = parseParticipants(membersText);

    if (!subject) return text(`${e.warn} Provide a group subject.`);
    if (!participants.length)
      return text(`${e.warn} Provide at least one member number.`);

    try {
      const metadata = await sonic.groupCreate(subject, participants);
      await text(
        `${e.check} Group created!\nName: ${metadata.subject}\nJID: ${metadata.id}`,
      );
    } catch (err) {
      await text(`${e.cross} Failed to create group. ${err.message || ""}`);
    }
  },
};
