import { emoji as e } from '../../config/config.js'
import { send, resolveSender } from '../../utils/utils.js'
import { checkCommandCooldown, formatCooldown } from '../../utils/cooldown.js'
import { getUser } from '../../database/database.js'

export const JOBS = [
  {
    name: 'Programmer',
    emoji: '💻',
    min: 50,
    max: 150,
    messages: [
      'debugged a nasty bug',
      'deployed a new feature',
      'fixed a production issue',
      'reviewed some pull requests',
      'wrote clean code',
    ],
  },
  {
    name: 'Chef',
    emoji: '👨‍🍳',
    min: 30,
    max: 100,
    messages: [
      'cooked a delicious meal',
      'prepared a five-star dish',
      'catered a wedding',
      'created a new recipe',
      'served hungry customers',
    ],
  },
  {
    name: 'Driver',
    emoji: '🚗',
    min: 25,
    max: 80,
    messages: [
      'delivered packages on time',
      'completed a long-distance trip',
      'drove passengers safely',
      'finished all deliveries early',
      'navigated through traffic',
    ],
  },
  {
    name: 'Doctor',
    emoji: '👨‍⚕️',
    min: 100,
    max: 200,
    messages: [
      "saved a patient's life",
      'performed a successful surgery',
      'diagnosed a rare condition',
      'helped patients recover',
      'worked a double shift',
    ],
  },
  {
    name: 'Artist',
    emoji: '🎨',
    min: 20,
    max: 120,
    messages: ['sold a painting', 'completed a commission', 'designed a logo', 'created digital art', 'drew portraits'],
  },
  {
    name: 'Musician',
    emoji: '🎵',
    min: 30,
    max: 110,
    messages: [
      'performed at a concert',
      'recorded a new track',
      'taught music lessons',
      'played at a wedding',
      'busked on the street',
    ],
  },
  {
    name: 'Streamer',
    emoji: '🎮',
    min: 15,
    max: 90,
    messages: [
      'got a bunch of donations',
      'gained new subscribers',
      'went viral',
      'hosted a charity stream',
      'beat a hard game',
    ],
  },
  {
    name: 'Farmer',
    emoji: '🌾',
    min: 35,
    max: 85,
    messages: [
      'harvested the crops',
      'sold produce at the market',
      'milked the cows',
      'collected fresh eggs',
      'planted new seeds',
    ],
  },
  {
    name: 'Mechanic',
    emoji: '🔧',
    min: 40,
    max: 95,
    messages: [
      'fixed a broken engine',
      'replaced worn brakes',
      'tuned up a classic car',
      'changed oil for customers',
      'repaired a transmission',
    ],
  },
  {
    name: 'Sonic Impersonator',
    emoji: '🦔',
    min: 100,
    max: 250,
    messages: [
      'ran really fast at a birthday party',
      'collected golden rings',
      'defeated Dr. Eggman',
      'saved the world... again',
      'went supersonic',
    ],
  },
]

export const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

export const randomFrom = arr => arr[Math.floor(Math.random() * arr.length)]

export const formatCoins = amount => `${e.ring} ${amount.toLocaleString()}`

export const checkEconCooldown = async (sonic, msg, command, duration) => {
  const sender = resolveSender(msg)
  const cd = checkCommandCooldown(sender, command, duration)

  if (!cd.allowed) {
    await send.text(sonic, msg, `${e.time} You can use this command again in *${formatCooldown(cd.remaining)}*`)
    return false
  }

  return true
}

/**
 * Helper to display profile/wallet information with automatic mention handling
 * @param {Object} helpers - Command helpers (text, mention, msg)
 * @param {string} target - The user JID to display
 * @param {string} selfContent - Content to show when viewing own profile
 * @param {string} otherContent - Content to show when viewing someone else's profile
 */
export const sendProfileDisplay = async ({ text, mention, msg }, target, selfContent, otherContent) => {
  const ownerJid = resolveSender(msg)
  const isSelf = target === ownerJid

  if (isSelf) {
    return text(selfContent)
  } else {
    return mention(otherContent, [target])
  }
}

/**
 * Factory for bank-related actions (deposit/withdraw)
 * @param {Function} dbFunc - The database function to call (deposit or withdraw)
 * @param {string} sourceKey - The user property to check for 'all' (balance or bank)
 * @param {string} title - The display title for the UI
 */
export const bankAction = (dbFunc, sourceKey, title) => {
  return async ({ text, msg }, args) => {
    const sender = resolveSender(msg)
    const user = getUser(sender)

    const amount = args[0]?.toLowerCase() === 'all' ? user[sourceKey] : parseInt(args[0])

    if (!amount || amount <= 0) {
      return text(`${e.cross} Provide amount! Example: !${title.toLowerCase()} 100 or !${title.toLowerCase()} all`)
    }

    const result = dbFunc(sender, amount)

    if (!result.success) {
      const errorMsg = title === 'DEPOSIT' ? 'Insufficient cash!' : 'Insufficient bank balance!'
      return text(`${e.cross} ${errorMsg} You have ${formatCoins(user[sourceKey])}`)
    }

    await text(
      `
╭━━━ 🏦 *${title}* ━━━╮
┃
┃ ${e.check} ${title === 'DEPOSIT' ? 'Deposited' : 'Withdrew'}: ${formatCoins(amount)}
┃
┃ ${e.star} Cash: ${formatCoins(result.balance)}
┃ ${e.bolt} Bank: ${formatCoins(result.bank)}
╰━━━━━━━━━━━━━━━━━━━╯`.trim()
    )
  }
}
