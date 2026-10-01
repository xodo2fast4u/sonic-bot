import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['businessorder'],
  desc: 'Fetch order details for an order',

  run: async ({ text, sonic }, args) => {
    const orderId = args[0];
    const token = args[1];
    if (!orderId || !token) return text(`${e.warn} Use: businessorder <orderId> <token>`);

    try {
      const result = await sonic.getOrderDetails(orderId, token);
      return text(`${e.check} Order details:\n${JSON.stringify(result)}`);
    } catch (err) {
      return text(`${e.cross} Failed to fetch order details. ${getErrorMessage(err) || ''}`);
    }
  },
};
