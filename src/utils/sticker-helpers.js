import { spawn } from 'child_process';

/**
 * Converts an image buffer (JPEG, PNG, etc.) to a 512x512 WebP buffer.
 *
 * @param {Buffer} imageBuffer
 * @returns {Promise<Buffer>}
 */
export const imageToWebp = (imageBuffer) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0',
      '-frames:v',
      '1',
      '-vcodec',
      'libwebp',
      '-filter:v',
      'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
      '-lossless',
      '0',
      '-compression_level',
      '6',
      '-q:v',
      '75',
      '-f',
      'webp',
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
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(errors).toString()}`));
      }
    });

    ffmpeg.stdin.end(imageBuffer);
  });
};

/**
 * Converts a video/gif buffer to a 512x512 animated WebP buffer.
 *
 * @param {Buffer} videoBuffer
 * @returns {Promise<Buffer>}
 */
export const videoToWebp = (videoBuffer) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-i',
      'pipe:0',
      '-t',
      '10',
      '-vcodec',
      'libwebp',
      '-filter:v',
      'scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
      '-lossless',
      '0',
      '-compression_level',
      '6',
      '-q:v',
      '50',
      '-loop',
      '0',
      '-an',
      '-vsync',
      '0',
      '-f',
      'webp',
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
      if (code === 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(`ffmpeg exited with code ${code}: ${Buffer.concat(errors).toString()}`));
      }
    });

    ffmpeg.stdin.end(videoBuffer);
  });
};

/**
 * Injects WhatsApp sticker EXIF metadata (pack name, author, emojis) into a WebP buffer.
 *
 * @param {Buffer} webpBuf
 * @param {{ packName?: string, author?: string, emojis?: string[] }} [options]
 * @returns {Buffer}
 */
export const addExifToWebp = (
  webpBuf,
  { packName = 'Sonic', author = 'Sonic Bot', emojis = ['🦔'] } = {},
) => {
  const json = {
    'sticker-pack-id': `com.sonic.bot.${Date.now()}`,
    'sticker-pack-name': packName,
    'sticker-pack-publisher': author,
    emojis: Array.isArray(emojis) ? emojis : [emojis],
  };

  const jsonBuf = Buffer.from(JSON.stringify(json), 'utf-8');
  const exifHeader = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x1a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);

  exifHeader.writeUInt32LE(jsonBuf.length, 14);
  const exifPayload = Buffer.concat([exifHeader, jsonBuf]);

  const exifChunkHeader = Buffer.from('EXIF');
  const exifSize = Buffer.alloc(4);
  exifSize.writeUInt32LE(exifPayload.length, 0);
  const padding = exifPayload.length % 2 === 1 ? Buffer.from([0x00]) : Buffer.alloc(0);
  const exifChunk = Buffer.concat([exifChunkHeader, exifSize, exifPayload, padding]);

  if (
    webpBuf.subarray(0, 4).toString('latin1') !== 'RIFF' ||
    webpBuf.subarray(8, 12).toString('latin1') !== 'WEBP'
  ) {
    throw new Error('Invalid WebP buffer');
  }

  let pos = 12;
  /** @type {Buffer[]} */
  const chunks = [];
  let hasVp8x = false;
  /** @type {Buffer|null} */
  let vp8xChunk = null;

  while (pos < webpBuf.length) {
    const chunkHeader = webpBuf.subarray(pos, pos + 4).toString('latin1');
    const chunkSize = webpBuf.readUInt32LE(pos + 4);
    const paddedSize = chunkSize + (chunkSize % 2);
    const chunkData = webpBuf.subarray(pos, pos + 8 + paddedSize);

    if (chunkHeader === 'VP8X') {
      hasVp8x = true;
      vp8xChunk = Buffer.from(chunkData);
    } else if (chunkHeader !== 'EXIF') {
      chunks.push(chunkData);
    }
    pos += 8 + paddedSize;
  }

  if (hasVp8x && vp8xChunk && vp8xChunk.length >= 9) {
    vp8xChunk.writeUInt8(vp8xChunk.readUInt8(8) | 0x08, 8);
    const body = Buffer.concat([vp8xChunk, ...chunks, exifChunk]);
    const riffHeader = Buffer.alloc(12);
    riffHeader.write('RIFF', 0);
    riffHeader.writeUInt32LE(body.length + 4, 4);
    riffHeader.write('WEBP', 8);
    return Buffer.concat([riffHeader, body]);
  } else {
    const vp8xHeader = Buffer.from('VP8X');
    const vp8xSize = Buffer.alloc(4);
    vp8xSize.writeUInt32LE(10, 0);
    const vp8xPayload = Buffer.from([0x08, 0x00, 0x00, 0x00, 0xff, 0x01, 0x00, 0xff, 0x01, 0x00]);
    const newVp8x = Buffer.concat([vp8xHeader, vp8xSize, vp8xPayload]);
    const body = Buffer.concat([newVp8x, ...chunks, exifChunk]);
    const riffHeader = Buffer.alloc(12);
    riffHeader.write('RIFF', 0);
    riffHeader.writeUInt32LE(body.length + 4, 4);
    riffHeader.write('WEBP', 8);
    return Buffer.concat([riffHeader, body]);
  }
};

/**
 * Creates a fully mobile-compatible WhatsApp sticker WebP buffer with metadata.
 *
 * @param {Buffer} mediaBuffer
 * @param {{ isVideo?: boolean, packName?: string, author?: string, emojis?: string[] }} [options]
 * @returns {Promise<Buffer>}
 */
export const createSticker = async (mediaBuffer, options = {}) => {
  const isWebp =
    mediaBuffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    mediaBuffer.subarray(8, 12).toString('latin1') === 'WEBP';

  let webpBuffer;
  if (options.isVideo) {
    webpBuffer = await videoToWebp(mediaBuffer);
  } else if (isWebp) {
    webpBuffer = mediaBuffer;
  } else {
    webpBuffer = await imageToWebp(mediaBuffer);
  }

  return addExifToWebp(webpBuffer, options);
};
