import { emoji as e } from '../../config/config.js'

export default {
  cmd: ['bible'],
  desc: 'Get a random Bible verse',
  run: async ({ text }, args) => {
    try {
      const res = await fetch('https://labs.bible.org/api/?passage=random&type=json')

      if (!res.ok) {
        await text(`${e.cross} Failed to reach Bible API.`)
        return
      }

      const data = await res.json()
      const verse = data[0]

      await text(`📖 *${verse.bookname} ${verse.chapter}:${verse.verse}*\n\n${verse.text.trim()}`)
    } catch (err) {
      await text(`${e.cross} Error fetching Bible verse: ${err.message}`)
    }
  },
}
