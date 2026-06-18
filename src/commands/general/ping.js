import { emoji as e } from '../../config/config.js';

export default {
  cmd: ['ping'],
  desc: 'Check if bot is alive',

  run: async ({ text }) => {
    await text(`${e.ping} Pong!`);
  },
};
