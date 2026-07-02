import { emoji as e } from '../../config/config.js';
import { getErrorMessage } from '../../utils/error-message.js';

/** @type {import('../../../types/index.js').Command} */
export default {
  cmd: ['wallpaper'],
  desc: 'Fetch a high-quality wallpaper',
  run: async ({ text, react, image }, args) => {
    try {
      await react('🔍');

      let url;
      let queryText = '';

      if (args.length) {
        const query = args.join(' ');
        queryText = ` for *${query}*`;
        url = `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(query)}&purity=100`;
      } else {
        url = 'https://wallhaven.cc/api/v1/search?sorting=random&purity=100';
      }

      const res = await fetch(url);

      if (!res.ok) {
        await text(`${e.cross} Failed to fetch wallpaper from the service.`);
        return;
      }

      const result = await res.json();

      if (!result?.data?.length) {
        await text(`${e.cross} No wallpapers found${queryText}.`);
        return;
      }

      const wp = result.data[0];
      const imageUrl = wp.path;
      const resolution = wp.resolution || 'N/A';
      const category = wp.category || 'N/A';
      const views = wp.views?.toLocaleString() || '0';
      const favorites = wp.favorites?.toLocaleString() || '0';
      const shortUrl = wp.short_url || 'N/A';

      if (!imageUrl) {
        await text(`${e.cross} Could not extract wallpaper image URL.`);
        return;
      }

      const caption = [
        `🖼️ *Wallpaper Found${queryText}*`,
        `🖥️ *Resolution:* ${resolution}`,
        `📁 *Category:* ${category.charAt(0).toUpperCase() + category.slice(1)}`,
        `👁️ *Views:* ${views} | ⭐ *Favorites:* ${favorites}`,
        `🔗 *Source:* ${shortUrl}`,
      ].join('\n');

      await image(imageUrl, caption);
      await react('✅');
    } catch (err) {
      await react('❌');
      await text(`${e.cross} Error fetching wallpaper: ${getErrorMessage(err)}`);
    }
  },
};
