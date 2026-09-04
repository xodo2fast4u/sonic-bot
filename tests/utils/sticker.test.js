import { imageToWebp, addExifToWebp, createSticker } from '../../src/utils/sticker-helpers.js';

describe('Sticker Utility', () => {
  const samplePng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  test('converts image to WebP buffer', async () => {
    const webp = await imageToWebp(samplePng);
    expect(webp.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(webp.subarray(8, 12).toString('latin1')).toBe('WEBP');
  });

  test('injects WhatsApp EXIF metadata into WebP buffer', async () => {
    const webp = await imageToWebp(samplePng);
    const sticker = addExifToWebp(webp, {
      packName: 'Sonic Pack',
      author: 'Sonic Bot',
      emojis: ['🦔'],
    });

    expect(sticker.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(sticker.subarray(8, 12).toString('latin1')).toBe('WEBP');
    expect(sticker.includes(Buffer.from('EXIF'))).toBe(true);
    expect(sticker.includes(Buffer.from('Sonic Pack'))).toBe(true);
    expect(sticker.includes(Buffer.from('Sonic Bot'))).toBe(true);
  });

  test('createSticker handles raw image buffers end-to-end', async () => {
    const sticker = await createSticker(samplePng, {
      packName: 'CustomPack',
      author: 'CustomAuthor',
    });

    expect(sticker.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(sticker.subarray(8, 12).toString('latin1')).toBe('WEBP');
    expect(sticker.includes(Buffer.from('EXIF'))).toBe(true);
    expect(sticker.includes(Buffer.from('CustomPack'))).toBe(true);
    expect(sticker.includes(Buffer.from('CustomAuthor'))).toBe(true);
  });
});
