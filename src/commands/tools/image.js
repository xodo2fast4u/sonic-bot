import { emoji as e } from '../../config/config.js'

export default {
  cmd: ['image'],
  desc: 'Search and send an image from DuckDuckGo',
  run: async ({ text, react, image }, args) => {
    if (!args.length) {
      await text(`${e.cross} Please provide a search query.\nExample: !image sunset beach`)
      return
    }

    const query = args.join(' ')
    const encoded = encodeURIComponent(query)

    try {
      await react('🔍')

      const pageRes = await fetch(`https://duckduckgo.com/?q=${encoded}`)
      const pageText = await pageRes.text()
      const vqdMatch = pageText.match(/vqd=["']([^"']+)["']/)

      if (!vqdMatch) {
        await text(`${e.cross} Could not initialize image search.`)
        return
      }

      const vqd = vqdMatch[1]

      const res = await fetch(`https://duckduckgo.com/i.js?q=${encoded}&o=json&vqd=${vqd}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      })

      if (!res.ok) {
        await text(`${e.cross} Failed to fetch image results.`)
        return
      }

      const data = await res.json()

      if (!data?.results?.length) {
        await text(`${e.cross} No images found for *${query}*.`)
        return
      }

      let imageUrl = data.results[0].image || data.results[0].url

      if (!imageUrl) {
        await text(`${e.cross} Could not extract image URL.`)
        return
      }

      if (!imageUrl.startsWith('http')) {
        imageUrl = `https://${imageUrl}`
      }

      await image(imageUrl, `🖼️ Result for: *${query}*`)
    } catch (err) {
      await text(`${e.cross} Error fetching image: ${err.message}`)
    }
  },
}
