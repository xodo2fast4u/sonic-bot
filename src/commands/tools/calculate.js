import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['calculate'],
  desc: 'Calculate a math expression',

  run: async ({ text }, args) => {
    if (!args.length) {
      await text(
        `${e.cross} Please provide a math expression to calculate.\nExample: !calculate 2 + 2`,
      );
      return;
    }

    const expression = args.join(' ');

    try {
      const sanitized = expression.replace(/[^0-9+\-*/.().\s]/g, '').trim();

      if (!sanitized) {
        await text(`${e.cross} Invalid expression provided.`);
        return;
      }

      const result = Function('"use strict"; return (' + sanitized + ')')();

      if (typeof result !== 'number' || isNaN(result)) {
        await text(`${e.cross} Invalid calculation result.`);
        return;
      }

      await text(`${e.check} *${sanitized}* = *${result}*`);
    } catch (error) {
      await text(`${e.cross} Error calculating expression: ${getErrorMessage(error)}`);
    }
  },
};
