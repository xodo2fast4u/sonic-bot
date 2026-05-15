import { emoji as e } from '../../config/config.js'

export default {
  cmd: ['search'],
  desc: 'Search the web',
  run: async ({ text }, args) => {
    if (!args.length) {
      await text(`${e.cross} Please provide a search query.\nExample: !search best pizza recipes`)
      return
    }

    const query = args.join(' ')

    try {
      const res = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
      )

      if (!res.ok) {
        await text(`${e.cross} Failed to reach search service.`)
        return
      }

      const data = await res.json()

      const results = []

      if (data.AbstractText) {
        results.push(`📖 *Summary*\n${data.AbstractText}\n🔗 ${data.AbstractURL || 'N/A'}`)
      }

      if (data.RelatedTopics?.length) {
        const topics = data.RelatedTopics.filter(t => t.Text && t.FirstURL)
          .slice(0, 4)
          .map((t, i) => `${i + 1}. ${t.Text}\n   🔗 ${t.FirstURL}`)

        if (topics.length) {
          results.push(`🔍 *Related Results*\n${topics.join('\n\n')}`)
        }
      }

      if (!results.length) {
        await text(`${e.cross} No results found for *${query}*. Try a different search term.`)
        return
      }

      await text(`${e.check} *Search Results for:* ${query}\n\n${results.join('\n\n')}`)
    } catch (err) {
      await text(`${e.cross} Error fetching search results: ${err.message}`)
    }
  },
}
