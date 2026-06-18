import { emoji as e } from '../../config/config.js';

export default {
  cmd: ['define'],
  desc: 'Look up English definitions for a word',
  run: async ({ text }, args) => {
    if (!args.length) {
      await text(`${e.cross} Provide a word.\nExample: !define ephemeral`);
      return;
    }

    const word = args.join(' ').trim().toLowerCase();

    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      );

      if (!res.ok) {
        await text(`${e.cross} No definition found for *${word}*.`);
        return;
      }

      const data = await res.json();
      const entry = data[0];
      if (!entry?.meanings?.length) {
        await text(`${e.cross} No definition found for *${word}*.`);
        return;
      }

      const phonetic = entry.phonetics?.find((p) => p.text)?.text || entry.phonetic || '';

      const lines = [];
      for (const meaning of entry.meanings.slice(0, 3)) {
        const defs = meaning.definitions?.slice(0, 2) || [];
        if (!defs.length) continue;
        const block = defs.map((d, i) => `${i + 1}. ${d.definition}`).join('\n');
        lines.push(`*${meaning.partOfSpeech}*\n${block}`);
      }

      if (!lines.length) {
        await text(`${e.cross} No definition text for *${word}*.`);
        return;
      }

      const header = phonetic ? `📖 *${entry.word}* (${phonetic})\n\n` : `📖 *${entry.word}*\n\n`;
      await text(`${header}${lines.join('\n\n')}`);
    } catch (err) {
      await text(`${e.cross} Error looking up word: ${err.message}`);
    }
  },
};
