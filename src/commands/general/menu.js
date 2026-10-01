import { readFileSync } from 'fs';
import { container } from '../../core/container.js';
import { config, emoji as e } from '../../config/config.js';
import { format } from '../../utils/utils.js';

const menuImage = readFileSync(new URL('../../assets/sonic-menu.png', import.meta.url));

const SECTION_ORDER = [
  { category: 'general', label: 'GENERAL', emoji: e.general },
  { category: 'combat', label: 'RPG & COMBAT', emoji: e.combat },
  { category: 'economy', label: 'ECONOMY', emoji: e.economy },
  { category: 'gambling', label: 'GAMES', emoji: e.games },
  { category: 'tools', label: 'TOOLS', emoji: e.tool },
  { category: 'downloader', label: 'DOWNLOADER', emoji: e.downloader },
  { category: 'maker', label: 'MAKER', emoji: e.maker },
  { category: 'newsletter', label: 'NEWSLETTER', emoji: e.newsletter },
  { category: 'business', label: 'BUSINESS', emoji: e.business },
  { category: 'chats', label: 'CHATS', emoji: e.chats },
  { category: 'community', label: 'COMMUNITY', emoji: e.community },
  { category: 'group', label: 'GROUP', emoji: e.group },
  { category: 'owner', label: 'OWNER', emoji: e.owner },
];

/** @param {any} command */
const getPrimaryCommandName = (command) => {
  if (!command) return null;

  if (Array.isArray(command.cmd) && command.cmd.length > 0) {
    const primary = String(command.cmd[0]).trim();
    return primary || null;
  }

  if (typeof command.cmd === 'string' && command.cmd.trim()) {
    return command.cmd.trim();
  }

  return null;
};

/**
 * @param {string} categoryName
 * @param {string} label
 * @param {string} emoji
 * @param {string} prefix
 */
const buildMenuSection = async (categoryName, label, emoji, prefix) => {
  const registry = container.resolve('commandRegistry');
  await registry.initialize?.();

  const categoryCommands = await registry.getByCategory(categoryName);
  const primaryNames = [];
  const seen = new Set();

  for (const command of categoryCommands.values()) {
    const primaryName = getPrimaryCommandName(command);
    if (!primaryName || seen.has(primaryName)) continue;
    seen.add(primaryName);
    primaryNames.push(primaryName);
  }

  if (primaryNames.length === 0) {
    return '';
  }

  primaryNames.sort((a, b) => a.localeCompare(b));

  return `\n${emoji} *${label}*\n${primaryNames.map((name) => `⚝ ${prefix}${name}`).join('\n')}`;
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['menu'],
  desc: 'Show bot menu',

  run: async ({ image }) => {
    const { prefix: p, botName, version } = config;
    const readMoreMarker = `\n${'\u200e'.repeat(4000)}\n`;

    const sections = [];

    for (const section of SECTION_ORDER) {
      const rendered = await buildMenuSection(section.category, section.label, section.emoji, p);
      if (rendered) sections.push(rendered);
    }

    const caption = `
${e.sonic} *${botName.toUpperCase()} BOT*
${e.star} Version: *${version}*
${e.time} Uptime: *${format.getUptime()}*
${e.bolt} Prefix: *${p}*${readMoreMarker}
${sections.join('\n')}

${e.rocket} *Gotta go fast!*`.trim();

    await image(menuImage, caption);
  },
};
