import { readdir } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = {};
const files = await readdir(__dirname);

for (const file of files) {
  if (file === "index.js" || file.startsWith("_") || !file.endsWith(".js"))
    continue;
  const mod = await import(`./${file}`);
  commands[file.replace(".js", "")] = mod.default;
}

export default commands;
