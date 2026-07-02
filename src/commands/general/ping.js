import { emoji as e } from '../../config/config.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['ping'],
  desc: 'Check if bot is alive',

  run: async ({ text }) => {
    await text(`${e.ping} Pong!`);
  },
};
