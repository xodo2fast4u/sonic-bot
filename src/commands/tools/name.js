import { emoji as e } from '../../config/config.js'

export default {
  cmd: ['name'],
  desc: 'Generate a random name with gender and country',
  run: async ({ text }, args) => {
    try {
      const res = await fetch('https://randomuser.me/api/')

      if (!res.ok) {
        await text(`${e.cross} Failed to fetch a random name.`)
        return
      }

      const data = await res.json()
      const user = data.results[0]

      await text(
        `${e.check} *Random Name*\n\n👤 Name: *${user.name.first} ${user.name.last}*\n⚥ Gender: ${user.gender}\n🌍 Country: ${user.location.country}`
      )
    } catch (err) {
      await text(`${e.cross} Error generating name: ${err.message}`)
    }
  },
}
