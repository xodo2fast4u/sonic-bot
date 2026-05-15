import { emoji as e } from '../../config/config.js'

export default {
  cmd: ['encode'],
  desc: 'Encode text to Base64',
  run: async ({ text }, args) => {
    if (!args.length) {
      await text(`${e.cross} Please provide text to encode.\nExample: !encode hello world`)
      return
    }

    const input = args.join(' ')
    const encoded = Buffer.from(input).toString('base64')

    await text(`${e.check} *Encoded:*\n${encoded}`)
  },
}
