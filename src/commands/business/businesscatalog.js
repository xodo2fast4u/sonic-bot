import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['businesscatalog'],
  desc: 'Fetch the business product catalog',

  run: async ({ text, sonic }, args) => {
    const jid = args[0];
    const limit = Number(args[1] || 10);
    const cursor = args[2];

    try {
      const result = await sonic.getCatalog({ jid, limit, cursor });
      return text(`${e.check} Catalog result:\n${JSON.stringify(result)}`);
    } catch (err) {
      return text(`${e.cross} Failed to fetch catalog. ${getErrorMessage(err) || ''}`);
    }
  },
};
