import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

const BRAT_API_URL = 'https://bratapi-ochre.vercel.app/api/v1/generate';
const MAX_TEXT_LENGTH = 280;

/** @param {Response} response @returns {Promise<string>} */
const getApiError = async (response) => {
  try {
    const body = await response.json();
    return body?.error?.reason || body?.error?.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['brat'],
  desc: 'Create a Brat-style sticker from text',
  run: async ({ react, sticker, text }, args) => {
    const stickerText = args.join(' ').trim();

    if (!stickerText) {
      await text(`${e.cross} Use *!brat <text>* to create a sticker.`);
      return;
    }

    if (stickerText.length > MAX_TEXT_LENGTH) {
      await text(`${e.cross} Brat text must be ${MAX_TEXT_LENGTH} characters or fewer.`);
      return;
    }

    try {
      await react('✨');

      const url = new URL(BRAT_API_URL);
      url.searchParams.set('text', stickerText);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Brat API: ${await getApiError(response)}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('image/webp')) {
        throw new Error('Brat API returned an unexpected response format.');
      }

      const stickerBuffer = Buffer.from(await response.arrayBuffer());
      if (!stickerBuffer.length) {
        throw new Error('Brat API returned an empty sticker.');
      }

      await sticker(stickerBuffer);
    } catch (error) {
      await text(`${e.cross} Failed to create the Brat sticker: ${getErrorMessage(error)}`);
    }
  },
};
