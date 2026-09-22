import { readFileSync } from 'fs';
import { config, emoji as e } from '../../config/config.js';
import { format } from '../../utils/utils.js';

const menuImage = readFileSync(new URL('../../assets/sonic-menu.png', import.meta.url));

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['menu'],
  desc: 'Show bot menu',

  run: async ({ image }) => {
    const { prefix: p, botName, version } = config;
    const readMoreMarker = `\n${'\u200e'.repeat(4000)}\n`;
    /** @param {...string} names */
    const commands = (...names) => names.map((name) => `⚝ ${p}${name}`).join('\n');

    const caption = `
${e.sonic} *${botName.toUpperCase()} BOT*
${e.star} Version: *${version}*
${e.time} Uptime: *${format.getUptime()}*
${e.bolt} Prefix: *${p}*${readMoreMarker}

${e.info} *GENERAL*
${commands('menu', 'ping', 'speed', 'info', 'runtime')}
${commands('server', 'profile', 'owner', 'modestatus')}

${e.rpg} *RPG & COMBAT*
${commands('fight', 'train', 'equip', 'unequip', 'togglelevelup', 'profile')}

${e.coin} *ECONOMY*
${commands('balance', 'daily', 'weekly', 'monthly', 'yearly')}
${commands('work', 'mine', 'fish', 'hunt', 'beg', 'rob', 'robbank', 'pay')}
${commands('shop', 'deposit', 'withdraw', 'inventory', 'transactions')}
${commands('leaderboard', 'sell', 'use', 'interest', 'gift', 'heist')}
${commands('bounty', 'invest', 'networth', 'vault', 'career')}

${e.gambling} *GAMES*
${commands('slots', 'coinflip', 'dice', 'roulette', 'blackjack', 'crash')}
${commands('higherlower', 'poker', 'baccarat', 'mines', 'plinko', 'derby')}
${commands('keno', 'wheel', 'limbo', 'war', 'cups', 'cashout')}

${e.tool} *TOOLS*
${commands('calculate', 'weather', 'search', 'bible', 'decode', 'define')}
${commands('directions', 'encode', 'image', 'name', 'songrecommendation')}
${commands('wiki', 'wallpaper')}

${e.download} *DOWNLOADER*
${commands('play')}

${e.maker} *MAKER*
${commands('sticker', 'brat', 'hd')}

${e.ring} *NEWSLETTER*
${commands('newsletteractions', 'newslettermanage')}

${e.group} *GROUP*
${commands('kick', 'add', 'promote', 'demote', 'mute', 'unmute')}
${commands('ginfo', 'admins', 'link', 'revoke', 'tagall', 'leave')}
${commands('lock', 'unlock', 'setname', 'setdesc', 'ephemeral', 'join')}
${commands('groupcreate', 'grouplist', 'groupmode', 'groupv4')}
${commands('groupinviteinfo', 'grouprequest')}

${e.admin} *OWNER*
${commands('mode', 'welcomegoodbyeoff', 'welcomegoodbyeon')}
${commands('promoterdemoteoff', 'promoterdemoteon', 'participantsoff', 'participantson')}

${e.rocket} *Gotta go fast!* ${e.sonic}`.trim();

    await image(menuImage, caption);
  },
};
