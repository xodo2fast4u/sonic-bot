import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['calllink'],
  desc: 'Create an audio or video call link',

  run: async ({ text, sonic }, args) => {
    const type = args[0]?.toLowerCase();
    if (!type || !['audio', 'video'].includes(type))
      return text(`${e.warn} Use: call <audio|video>`);

    try {
      const token = await sonic.createCallLink(type);
      return text(`${e.check} Call link token: ${token}`);
    } catch (err) {
      return text(`${e.cross} Failed to create call link. ${getErrorMessage(err) || ''}`);
    }
  },
};
