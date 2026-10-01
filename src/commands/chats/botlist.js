import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['botlist'],
  desc: 'Fetch the bot list',

  run: async ({ text, sonic }) => {
    try {
      const result = await sonic.getBotListV2();
      return text(`${e.check} Bot list:\n${JSON.stringify(result)}`);
    } catch (err) {
      return text(`${e.cross} Failed to fetch bot list. ${getErrorMessage(err) || ''}`);
    }
  },
};
