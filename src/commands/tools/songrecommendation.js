import { emoji as e } from '../../config/config.js';

const BASE_URL = 'https://itunes.apple.com';

const searchArtist = async (query) => {
  const res = await fetch(
    `${BASE_URL}/search?term=${encodeURIComponent(query)}&media=music&entity=musicTrack&limit=50`,
  );
  if (!res.ok) throw new Error('iTunes search failed');
  return res.json();
};

const getTopSongsByArtist = (results, artistName) => {
  const normalized = artistName.toLowerCase();
  return results.filter((t) => t.artistName.toLowerCase().includes(normalized)).slice(0, 5);
};

const formatTrack = (track, index) => {
  const preview = track.previewUrl ? `\n   🎧 Preview: ${track.previewUrl}` : '';
  return `${index + 1}. 🎵 *${track.trackName}*\n   👤 ${track.artistName} | 💿 ${track.collectionName || 'Single'}${preview}`;
};

export default {
  cmd: ['songrecommendation', 'songreccomendation', 'recommend'],
  desc: 'Get song recommendations based on an artist or genre',
  run: async ({ text }, args) => {
    if (!args.length) {
      await text(
        `${e.cross} Please provide an artist or genre.\nExample: !songrecommendation The Weeknd\nExample: !songrecommendation afrobeats`,
      );
      return;
    }

    const query = args.join(' ');

    try {
      const data = await searchArtist(query);

      if (!data.results?.length) {
        await text(`${e.cross} No songs found for *${query}*. Try a different artist or genre.`);
        return;
      }

      const exactMatches = getTopSongsByArtist(data.results, query);
      const tracks = exactMatches.length >= 3 ? exactMatches : data.results.slice(0, 5);

      if (!tracks.length) {
        await text(`${e.cross} Could not build recommendations for *${query}*.`);
        return;
      }

      const list = tracks.map((t, i) => formatTrack(t, i)).join('\n\n');

      await text(
        `${e.check} *Song Recommendations for:* ${query}\n\n${list}\n\n💡 Try another artist or genre for more.`,
      );
    } catch (err) {
      await text(`${e.cross} Error fetching recommendations: ${err.message}`);
    }
  },
};
