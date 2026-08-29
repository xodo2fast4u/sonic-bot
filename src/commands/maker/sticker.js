import { downloadMediaMessage, extractMessageContent } from 'baileys';
import { config, emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';
import { createSticker } from '../../utils/sticker-helpers.js';

/**
 * Extracts the target media source message and its type.
 *
 * @param {any} msg
 * @returns {{ source: any, isVideo: boolean } | null}
 */
const getSourceMessage = (msg) => {
  const content = extractMessageContent(msg?.message);

  if (content?.imageMessage || content?.stickerMessage || content?.videoMessage) {
    return {
      source: msg,
      isVideo: Boolean(content?.videoMessage),
    };
  }

  if (content?.documentMessage?.mimetype?.startsWith('image/')) {
    return {
      source: msg,
      isVideo: false,
    };
  }

  const quoted = content?.extendedTextMessage?.contextInfo?.quotedMessage;
  if (quoted) {
    const quotedContent = extractMessageContent(quoted);
    if (
      quotedContent?.imageMessage ||
      quotedContent?.stickerMessage ||
      quotedContent?.videoMessage
    ) {
      return {
        source: {
          key: msg?.key,
          message: quoted,
        },
        isVideo: Boolean(quotedContent?.videoMessage),
      };
    }

    if (quotedContent?.documentMessage?.mimetype?.startsWith('image/')) {
      return {
        source: {
          key: msg?.key,
          message: quoted,
        },
        isVideo: false,
      };
    }
  }

  return null;
};

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['sticker', 's'],
  desc: 'Convert a replied image or video into a WhatsApp sticker',
  run: async ({ sonic, msg, react, text }, args) => {
    const mediaSource = getSourceMessage(msg);

    if (!mediaSource) {
      await text(
        `${e.cross} Reply to an image, sticker, or short video with *!sticker* (or *!sticker <pack> | <author>*).`,
      );
      return;
    }

    try {
      await react('🪄');

      const rawMedia = await downloadMediaMessage(mediaSource.source, 'buffer', {});
      if (!rawMedia || !rawMedia.length) {
        await text(`${e.cross} I could not download that media to make a sticker.`);
        return;
      }

      const rawArgs = args.join(' ');
      /** @type {string} */
      let packName = typeof config.botName === 'string' ? config.botName : 'Sonic';
      /** @type {string} */
      let author = typeof config.botName === 'string' ? `${config.botName} Bot` : 'Sonic Bot';

      if (rawArgs.includes('|')) {
        const parts = rawArgs.split('|').map((p) => p.trim());
        if (parts[0]) packName = parts[0];
        if (parts[1]) author = parts[1];
      } else if (rawArgs.trim()) {
        packName = rawArgs.trim();
      }

      const stickerBuffer = await createSticker(rawMedia, {
        isVideo: mediaSource.isVideo,
        packName,
        author,
        emojis: ['🦔'],
      });

      await sonic.sendMessage(
        msg.key.remoteJid,
        {
          sticker: stickerBuffer,
        },
        { quoted: msg },
      );
    } catch (error) {
      await text(`${e.cross} Failed to create sticker: ${getErrorMessage(error)}`);
    }
  },
};
