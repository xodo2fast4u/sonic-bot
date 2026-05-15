import { startSocket } from './core/socket.js'
import { config } from './config/config.js'

console.log(`
╔═════════════════════════════════════╗
║   🦔 SONIC WHATSAPP BOT 💨         ║
║   v${config.version} | Prefix: ${config.prefix}            ║
╚═════════════════════════════════════╝
`)

startSocket().catch(err => {
  console.error('💥 Fatal:', err)
  process.exit(1)
})
