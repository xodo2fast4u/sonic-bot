import { spawn } from 'child_process';
import { downloadMediaMessage, extractMessageContent } from 'baileys';
import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/**
 * Finds a direct or quoted image message.
 * @param {any} msg
 * @returns {any|null}
 */
const getImageSource = (msg) => {
  const content = extractMessageContent(msg?.message);

  if (content?.imageMessage || content?.stickerMessage) {
    return msg;
  }

  if (content?.documentMessage?.mimetype?.startsWith('image/')) {
    return msg;
  }

  const quoted = content?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (!quoted) return null;

  const quotedContent = extractMessageContent(quoted);
  if (
    quotedContent?.imageMessage ||
    quotedContent?.stickerMessage ||
    quotedContent?.documentMessage?.mimetype?.startsWith('image/')
  ) {
    return { key: msg?.key, message: quoted };
  }

  return null;
};

/** @param {Buffer} imageBuffer @returns {Promise<Buffer>} */
const enhanceImage = (imageBuffer) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-frames:v',
      '1',
      '-vf',
      "scale=w='min(iw*2,4096)':h='min(ih*2,4096)':force_original_aspect_ratio=decrease:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp,unsharp=5:5:0.65:5:5:0",
      '-c:v',
      'png',
      '-compression_level',
      '9',
      '-f',
      'image2pipe',
      'pipe:1',
    ]);

    /** @type {Buffer[]} */
    const chunks = [];
    /** @type {Buffer[]} */
    const errors = [];

    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
    ffmpeg.stderr.on('data', (chunk) => errors.push(chunk));
    ffmpeg.on('error', reject);
    ffmpeg.on('close', (code) => {
      if (code === 0 && chunks.length) {
        resolve(Buffer.concat(chunks));
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(errors).toString()}`));
    });

    ffmpeg.stdin.end(imageBuffer);
  });
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['hd'],
  desc: 'Upscale and sharpen a replied image with FFmpeg',
  run: async ({ image, msg, react, text }) => {
    const imageSource = getImageSource(msg);

    if (!imageSource) {
      await text(`${e.cross} Reply to an image with *!hd*.`);
      return;
    }

    try {
      await react('✨');

      const sourceBuffer = await downloadMediaMessage(imageSource, 'buffer', {});
      if (!sourceBuffer?.length) {
        await text(`${e.cross} I could not download that image.`);
        return;
      }

      const enhancedBuffer = await enhanceImage(sourceBuffer);
      await image(enhancedBuffer, '✨ HD image', 'image/png');
    } catch (error) {
      await text(`${e.cross} Failed to enhance the image: ${getErrorMessage(error)}`);
    }
  },
};
