import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';
import { changeVoice, createVoiceWaveform, downloadAudio } from '../../utils/voice-changer.js';

/**
 * @param {string} preset
 * @param {string[]} aliases
 * @param {string} description
 * @returns {import('../../../types/index.js').Command}
 */
const createVoiceCommand = (preset, aliases, description) => ({
  cmd: aliases,
  desc: description,
  /** @param {import('../../../types/index.js').CommandHelpers} helpers */
  run: async ({ msg, react, text, voice }) => {
    try {
      await react('🎙️');
      const source = await downloadAudio(msg);
      const changedAudio = await changeVoice(source, preset);
      const { waveform, seconds } = await createVoiceWaveform(changedAudio);
      await voice(changedAudio, waveform, seconds);
    } catch (error) {
      await text(`${e.cross} Voice change failed: ${getErrorMessage(error)}`);
    }
  },
});

/** @type {import('../../../types/index.js').Command[]} */
export default [
  createVoiceCommand('deep', ['deep'], 'Make a deep cinematic voice'),
  createVoiceCommand('chipmunk', ['chipmunk'], 'Make a high-pitched chipmunk voice'),
  createVoiceCommand('robot', ['robot'], 'Add a metallic robot voice'),
  createVoiceCommand('echo', ['echo'], 'Add a spacious echo effect'),
  createVoiceCommand('reverb', ['reverb'], 'Add a lush reverb effect'),
  createVoiceCommand('bass', ['bass'], 'Add a powerful bass voice'),
  createVoiceCommand('nightcore', ['nightcore'], 'Create a bright nightcore voice'),
  createVoiceCommand('underwater', ['underwater'], 'Create an underwater voice'),
  createVoiceCommand('radio', ['radio'], 'Create a vintage radio voice'),
  createVoiceCommand('megaphone', ['megaphone'], 'Create a megaphone voice'),
];
