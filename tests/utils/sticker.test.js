import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import {
  imageToWebp,
  addExifToWebp,
  createSticker,
  videoToWebp,
} from '../../src/utils/sticker-helpers.js';

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

  test('videoToWebp converts a real GIF into animated WebP', async () => {
    const gifPath = '/tmp/sonic-sticker-test.gif';
    execSync(
      'ffmpeg -y -f lavfi -i color=c=black:s=64x64:d=1 -f lavfi -i color=c=red:s=64x64:d=1 -filter_complex \'[0:v][1:v]concat=n=2:v=1:a=0\' -loop 0 -an -q:v 5 -f gif "/tmp/sonic-sticker-test.gif"',
      { stdio: 'inherit' },
    );

    const gifBuf = readFileSync(gifPath);
    const webp = await videoToWebp(gifBuf);

    expect(webp.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(webp.subarray(8, 12).toString('latin1')).toBe('WEBP');
  });
});
