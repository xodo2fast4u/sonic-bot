import { spawn } from 'child_process';
import { downloadMediaMessage, extractMessageContent } from 'baileys';

const FFMPEG = process.env['FFMPEG_PATH'] || 'ffmpeg';
const SAMPLE_RATE = 48000;
const WAVEFORM_BARS = 64;

/** @type {Record<string, string>} */
export const VOICE_PRESETS = Object.freeze({
  deep: 'asetrate=48000*0.72,aresample=48000,atempo=1.3889,lowpass=f=3600,acompressor=threshold=-18dB:ratio=3:attack=20:release=180',
  chipmunk:
    'asetrate=48000*1.55,aresample=48000,atempo=0.6452,highpass=f=120,acompressor=threshold=-18dB:ratio=3:attack=10:release=100',
  robot:
    'tremolo=f=28:d=0.75,acrusher=bits=8:mode=log:aa=1,aecho=0.8:0.7:35:0.25,alimiter=limit=0.9',
  echo: 'aecho=0.8:0.88:900|1400:0.28|0.18,acompressor=threshold=-20dB:ratio=2.5:attack=15:release=160',
  reverb: 'aecho=0.8:0.9:60|120|180:0.28|0.2|0.12,alimiter=limit=0.92',
  bass: 'bass=g=12:f=110:width_type=h:w=1,acompressor=threshold=-20dB:ratio=3:attack=15:release=180,alimiter=limit=0.9',
  nightcore: 'asetrate=48000*1.25,aresample=48000,atempo=0.8,highpass=f=100,alimiter=limit=0.92',
  underwater:
    'lowpass=f=720,highpass=f=70,aecho=0.8:0.7:420|760:0.3|0.18,acompressor=threshold=-22dB:ratio=4:attack=10:release=220',
  radio:
    'highpass=f=280,lowpass=f=3400,acompressor=threshold=-24dB:ratio=6:attack=5:release=120,acrusher=bits=9:mode=log:aa=1,alimiter=limit=0.88',
  megaphone:
    'highpass=f=520,lowpass=f=2800,acompressor=threshold=-18dB:ratio=5:attack=5:release=110,acrusher=bits=10:mode=log:aa=1,alimiter=limit=0.9',
});

/** @param {string} preset */
const getPresetFilter = (preset) => {
  const filter = VOICE_PRESETS[preset?.toLowerCase()];
  if (!filter) throw new Error(`Unknown voice preset: ${preset}`);
  return filter;
};

/** @param {string[]} args @param {Buffer} input */
const runFfmpeg = (args, input) =>
  new Promise((resolve, reject) => {
    const process = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', ...args]);
    /** @type {Buffer[]} */
    const output = [];
    /** @type {Buffer[]} */
    const errors = [];

    process.stdout.on('data', (chunk) => output.push(chunk));
    process.stderr.on('data', (chunk) => errors.push(chunk));
    process.on('error', (error) => reject(error));
    process.on('close', (code) => {
      if (code === 0 && output.length) {
        resolve(Buffer.concat(output));
        return;
      }

      const detail = Buffer.concat(errors).toString().trim() || `exit code ${code}`;
      reject(new Error(`FFmpeg failed: ${detail}`));
    });

    process.stdin.end(input);
  });

/** @param {Buffer} audio @param {string} preset @returns {Promise<Buffer>} */
export const changeVoice = async (audio, preset) => {
  if (!Buffer.isBuffer(audio) || !audio.length) throw new Error('Audio input is empty');

  return runFfmpeg(
    [
      '-i',
      'pipe:0',
      '-vn',
      '-af',
      getPresetFilter(preset),
      '-map_metadata',
      '-1',
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
      String(SAMPLE_RATE),
      '-avoid_negative_ts',
      'make_zero',
      '-f',
      'ogg',
      'pipe:1',
    ],
    audio,
  );
};

/** @param {Buffer} audio @returns {Promise<{ waveform: Uint8Array, seconds: number }>} */
export const createVoiceWaveform = async (audio) => {
  const pcm = await runFfmpeg(
    ['-i', 'pipe:0', '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 's16le', 'pipe:1'],
    audio,
  );

  const sampleCount = Math.floor(pcm.length / 2);
  if (!sampleCount) return { waveform: new Uint8Array(WAVEFORM_BARS), seconds: 0 };

  const waveform = new Uint8Array(WAVEFORM_BARS);
  for (let bar = 0; bar < WAVEFORM_BARS; bar++) {
    const start = Math.floor((bar * sampleCount) / WAVEFORM_BARS);
    const end = Math.max(start + 1, Math.floor(((bar + 1) * sampleCount) / WAVEFORM_BARS));
    let peak = 0;

    for (let sample = start; sample < end; sample++) {
      peak = Math.max(peak, Math.abs(pcm.readInt16LE(sample * 2)));
    }

    waveform[bar] = Math.min(100, Math.max(1, Math.round((peak / 32768) * 100)));
  }

  return {
    waveform,
    seconds: Math.max(1, Math.ceil(sampleCount / SAMPLE_RATE)),
  };
};

/** @param {any} msg @returns {any|null} */
export const getAudioSource = (msg) => {
  const content = extractMessageContent(msg?.message);
  if (content?.audioMessage) return msg;

  const quoted = content?.extendedTextMessage?.contextInfo?.quotedMessage;
  const quotedContent = extractMessageContent(quoted);
  if (quotedContent?.audioMessage) return { key: msg?.key, message: quoted };

  return null;
};

/** @param {any} msg @returns {Promise<Buffer>} */
export const downloadAudio = async (msg) => {
  const source = getAudioSource(msg);
  if (!source) throw new Error('Reply to an audio message or send one with the command');

  const audio = await downloadMediaMessage(source, 'buffer', {});
  if (!Buffer.isBuffer(audio) || !audio.length) throw new Error('Could not download the audio');
  return audio;
};
