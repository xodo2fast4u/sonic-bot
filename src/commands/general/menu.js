import { config, emoji as e } from '../../config/config.js';
import { format } from '../../utils/utils.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['menu'],
  desc: 'Show bot menu',

  run: async ({ text }) => {
    const { prefix: p, botName, version } = config;

    await text(
      `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃  ${e.sonic} *${botName.toUpperCase()} BOT* ${e.speed}
┃━━━━━━━━━━━━━━━━━━━━━
┃ ${e.star} Version: ${version}
┃ ${e.time} Uptime: ${format.getUptime()}
┃ ${e.bolt} Prefix: ${p}
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ${e.info} *GENERAL* ━━━╮
┃ ${p}menu - This menu
┃ ${p}ping - Bot latency
┃ ${p}speed - Speed test
┃ ${p}info - Bot info
┃ ${p}runtime - Uptime
┃ ${p}server - Server stats
┃ ${p}profile - User info
┃ ${p}owner - Bot owner
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ${e.coin} *ECONOMY* ━━━╮
┃ ${p}balance - Check coins
┃ ${p}daily - Daily reward
┃ ${p}work - Work for coins
┃ ${p}mine - Go mining
┃ ${p}fish - Go fishing
┃ ${p}hunt - Go hunting
┃ ${p}beg - Beg for coins
┃ ${p}rob - Rob someone
┃ ${p}pay - Pay someone
┃ ${p}shop - Buy items
┃ ${p}deposit - To bank
┃ ${p}withdraw - From bank
┃ ${p}inventory - Your items
┃ ${p}transactions - Coin history
┃ ${p}leaderboard - Top rich
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ 🎰 *GAMBLING* ━━━╮
┃ ${p}slots - Slot machine
┃ ${p}coinflip - Heads or tails
┃ ${p}dice - Roll a dice
┃ ${p}roulette - Spin the wheel
┃ ${p}blackjack - Beat the dealer
┃ ${p}crash - Ride the rocket
┃ ${p}higherlower - Guess the next card
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ${e.tool} *TOOLS* ━━━╮
┃ ${p}calculate - Do maths
┃ ${p}weather - Check the weather
┃ ${p}search - Search the web
┃ ${p}bible - Bible verse
┃ ${p}decode - Decode text
┃ ${p}define - Define word
┃ ${p}directions - Get directions
┃ ${p}encode - Encode text
┃ ${p}image - Get image
┃ ${p}name - Name info
┃ ${p}songrecommendation - Music suggestion
┃ ${p}wiki - Wikipedia search
┃ ${p}wallpaper - Gets a wallpaper
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ${e.maker} *MAKER* ━━━╮
┃ ${p}sticker - Convert image to sticker
┃ ${p}brat - Create Brat sticker
┃ ${p}hd - Enhance image quality
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ${e.ring} *NEWSLETTER* ━━━╮
┃ ${p}newsletteractions - Newsletter actions
┃ ${p}newslettermanage - Manage newsletter
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ${e.group} *GROUP* ━━━╮
┃ ${p}kick / ${p}add
┃ ${p}promote / ${p}demote
┃ ${p}mute / ${p}unmute
┃ ${p}ginfo / ${p}admins
┃ ${p}link / ${p}revoke
┃ ${p}tagall / ${p}leave
┃ ${p}lock / ${p}unlock
┃ ${p}setname / ${p}setdesc
┃ ${p}ephemeral / ${p}join
┃ ${p}groupcreate / ${p}grouplist
┃ ${p}groupmode / ${p}groupv4
┃ ${p}groupinviteinfo / ${p}grouprequest
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━ ${e.admin} *OWNER* ━━━╮
┃ ${p}welcomegoodbyeoff / ${p}welcomegoodbyeon
┃ ${p}promoterdemoteoff / ${p}promoterdemoteon
┃ ${p}participantsoff / ${p}participantson
╰━━━━━━━━━━━━━━━━━━━━━╯

${e.rocket} *Gotta go fast!* ${e.sonic}`.trim(),
    );
  },
};
