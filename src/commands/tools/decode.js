import { emoji as e } from '../../config/config.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['decode'],
  desc: 'Decode Base64 text',
  run: async ({ text }, args) => {
    if (!args.length) {
      await text(
        `${e.cross} Please provide Base64 text to decode.\nExample: !decode aGVsbG8gd29ybGQ=`,
      );
      return;
    }

    const input = args.join(' ');

    try {
      const decoded = Buffer.from(input, 'base64').toString('utf8');

      if (!decoded.trim()) {
        await text(`${e.cross} Decoded result was empty.`);
        return;
      }

      await text(`${e.check} *Decoded:*\n${decoded}`);
    } catch (err) {
      await text(`${e.cross} Invalid Base64 input.`);
    }
  },
};
