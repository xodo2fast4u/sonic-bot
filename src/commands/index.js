import { readdir } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import logger from "../utils/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const commands = new Map();

const loadCommands = async () => {
  const folders = await readdir(__dirname, { withFileTypes: true });

  for (const folder of folders.filter((f) => f.isDirectory())) {
    try {
      const module = await import(`./${folder.name}/index.js`);

      for (const cmd of Object.values(module.default || module)) {
        if (!cmd.cmd || !cmd.run) continue;
        for (const alias of cmd.cmd) {
          commands.set(alias.toLowerCase(), cmd);
        }
      }

      logger.info(`📂 Loaded: ${folder.name}`);
    } catch (err) {
      logger.error(`❌ Failed to load ${folder.name}:`, err.message);
    }
  }

  logger.info(`📦 Total: ${commands.size} command aliases\n`);
};

await loadCommands();
