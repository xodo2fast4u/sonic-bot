import { emoji as e } from '../../config/config.js';
import { parseJsonArg } from './_utils.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['businessproduct'],
  desc: 'Create, update or delete business products',

  run: async ({ text, sonic }, args) => {
    const action = args[0]?.toLowerCase();
    if (!action) return text(`${e.warn} Use: businessproduct <create|update|delete> ...`);

    try {
      if (action === 'create') {
        const json = args.slice(1).join(' ');
        const payload = parseJsonArg(json);
        if (!payload) return text(`${e.warn} Provide product JSON.`);
        const result = await sonic.productCreate(payload);
        return text(`${e.check} Product created: ${JSON.stringify(result)}`);
      }

      if (action === 'update') {
        const id = args[1];
        const json = args.slice(2).join(' ');
        const payload = parseJsonArg(json);
        if (!id || !payload) return text(`${e.warn} Use: businessproduct update <id> <json>`);
        const result = await sonic.productUpdate(id, payload);
        return text(`${e.check} Product updated: ${JSON.stringify(result)}`);
      }

      if (action === 'delete') {
        const ids = args[1]
          ?.split(',')
          .map((id) => id.trim())
          .filter(Boolean);
        if (!ids?.length) return text(`${e.warn} Use: businessproduct delete <id1,id2,...>`);
        const result = await sonic.productDelete(ids);
        return text(`${e.check} Products deleted: ${JSON.stringify(result)}`);
      }

      return text(`${e.warn} Unknown product action: ${action}`);
    } catch (err) {
      return text(`${e.cross} Failed to execute product action. ${getErrorMessage(err) || ''}`);
    }
  },
};
