import { emoji as e } from '../../config/config.js'

export default {
  cmd: ['wiki'],
  desc: 'Search Wikipedia for a summary of a topic',
  run: async ({ text }, args) => {
    if (!args.length) {
      await text(`${e.cross} Please provide a search query.\nExample: !wikipedia Black holes`)
      return
    }

    const query = args.join(' ')

    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`)

      if (!res.ok) {
        await text(`${e.cross} No results found for *${query}*.`)
        return
      }

      const data = await res.json()

      if (!data.extract) {
        await text(`${e.cross} No results found for *${query}*.`)
        return
      }

      await text(`📚 *${data.title}*\n\n${data.extract}\n\n🔗 ${data.content_urls?.desktop?.page || ''}`)
    } catch (err) {
      await text(`${e.cross} Error fetching Wikipedia data: ${err.message}`)
    }
  },
}
