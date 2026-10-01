import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['businesscollections'],
  desc: 'Fetch business catalog collections',

  run: async ({ text, sonic }, args) => {
    const jid = args[0];
    const limit = Number(args[1] || 51);

    try {
      const result = await sonic.getCollections(jid, limit);
      return text(`${e.check} Collections result:\n${JSON.stringify(result)}`);
    } catch (err) {
      return text(`${e.cross} Failed to fetch collections. ${getErrorMessage(err) || ''}`);
    }
  },
};
