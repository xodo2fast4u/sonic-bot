import { emoji as e } from "../../config/config.js";
import { send } from "../../utils/utils.js";

export default {
  cmd: ["ping", "p"],
  desc: "Check if bot is alive",

  run: async (sock, msg) => {
    await send.text(sock, msg, `${e.ping} Pong!`);
  },
};
