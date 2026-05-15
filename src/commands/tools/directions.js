import { emoji as e } from '../../config/config.js'

export default {
  cmd: ['directions'],
  desc: 'Get directions between two locations via Google Maps',
  run: async ({ text, react }, args) => {
    if (!args.length) {
      await text(`${e.cross} Please provide a route.\nExample: !directions London to Paris`)
      return
    }

    const input = args.join(' ')
    const match = input.match(/(.+)\s+to\s+(.+)/i)

    if (!match) {
      await text(`${e.cross} Invalid format.\nExample: !directions London to Paris`)
      return
    }

    const [, from, to] = match

    await react('🗺️')

    const base = 'https://www.google.com/maps/dir'
    const encodedFrom = encodeURIComponent(from.trim())
    const encodedTo = encodeURIComponent(to.trim())

    const drive = `${base}/${encodedFrom}/${encodedTo}`
    const walk = `${base}/${encodedFrom}/${encodedTo}/@0,0,14z/data=!4m2!4m1!3e2`
    const transit = `${base}/${encodedFrom}/${encodedTo}/@0,0,14z/data=!4m2!4m1!3e3`

    await text(
      `🗺️ *Directions from ${from.trim()} to ${to.trim()}*\n\n🚗 Drive: ${drive}\n🚶 Walk: ${walk}\n🚆 Transit: ${transit}\n\n📍 Tip: Open in browser for full route options.`
    )
  },
}
