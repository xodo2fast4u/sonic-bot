import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { emoji as e } from '../../config/config.js';
import { createVoiceWaveform } from '../../utils/voice-changer.js';
import { downloadSongFromQuery } from '../../utils/youtube-to-mp3-converter.js';

const FFMPEG = process.env['FFMPEG_PATH'] || 'ffmpeg';

/**
 * @param {Buffer} audio
 * @returns {Promise<Buffer>}
 */
async function transcodeToVoiceNote(audio) {
  /** @type {Buffer[]} */
  const output = [];
  /** @type {Buffer[]} */
  const errors = [];

  return new Promise((resolve, reject) => {
    const process = spawn(FFMPEG, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      '-vn',
      '-c:a',
      'libopus',
      '-application',
      'voip',
      '-frame_duration',
      '20',
      '-vbr',
      'on',
      '-compression_level',
      '10',
      '-ac',
      '1',
      '-ar',
      '48000',
      '-f',
      'ogg',
      'pipe:1',
    ]);

    process.stdout.on('data', (chunk) => output.push(Buffer.from(chunk)));
    process.stderr.on('data', (chunk) => errors.push(Buffer.from(chunk)));
    process.on('error', (error) => reject(error));
    process.on('close', (code) => {
      if (code === 0 && output.length) {
        resolve(Buffer.concat(output));
        return;
      }

      const detail = Buffer.concat(errors).toString().trim() || `exit code ${code}`;
      reject(new Error(`FFmpeg voice conversion failed: ${detail}`));
    });

    process.stdin.end(audio);
  });
}

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['play'],
  desc: 'Download a song from YouTube and send it back as a voice note with waveform',

  run: async ({ msg, react, text, voice }, args) => {
    try {
      const query =
        (args.length ? args.join(' ') : '').trim() ||
        (msg?.message ? String(msg.message.conversation || '') : '').trim();

      if (!query) {
        await text(`${e.warn} Usage: play <youtube url or song name>`);
        return;
      }

      await react('🎵');

      const result = await downloadSongFromQuery(query);
      const source = await fs.readFile(result.filePath);
      const voiceAudio = await transcodeToVoiceNote(source);
      const { waveform, seconds } = await createVoiceWaveform(voiceAudio);

      await voice(voiceAudio, waveform, seconds);
    } catch (error) {
      console.error('play command failed', error);
      await text(
        `${e.cross} Song failed. Please try a more specific title, a direct YouTube link, or a different search.`,
      );
    }
  },
};
