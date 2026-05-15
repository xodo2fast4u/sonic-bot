import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { jid } from '../utils/utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DB_PATH = join(DATA_DIR, 'sonic_database.db')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

/**
 * Initialize tables
 * Note: We store just the number part (without @s.whatsapp.net or @lid)
 * This ensures consistency regardless of LID/PN format changes
 */
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    bank INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, item_name)
  );
  
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_id TEXT,
    to_id TEXT,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    timestamp INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(from_id, to_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
`)

const statements = {
  getUser: db.prepare(`SELECT * FROM users WHERE id = ?`),

  createUser: db.prepare(`INSERT OR IGNORE INTO users (id) VALUES (?)`),

  updateBalance: db.prepare(
    `UPDATE users SET balance = balance + ?, total_earned = total_earned + MAX(0, ?) WHERE id = ?`
  ),

  setBalance: db.prepare(`UPDATE users SET balance = ? WHERE id = ?`),

  getLeaderboard: db.prepare(
    `SELECT id, balance, bank, total_earned FROM users ORDER BY (balance + bank) DESC LIMIT ?`
  ),

  logTransaction: db.prepare(`INSERT INTO transactions (from_id, to_id, amount, type) VALUES (?, ?, ?, ?)`),

  getInventory: db.prepare(`SELECT item_name, quantity FROM inventory WHERE user_id = ?`),

  addItem: db.prepare(
    `INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, item_name) DO UPDATE SET quantity = quantity + excluded.quantity`
  ),

  removeItem: db.prepare(`UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND item_name = ?`),
  deleteEmptyItems: db.prepare(`DELETE FROM inventory WHERE quantity <= 0`),

  depositFunds: db.prepare(`UPDATE users SET balance = balance - ?, bank = bank + ? WHERE id = ?`),
  withdrawFunds: db.prepare(`UPDATE users SET balance = balance + ?, bank = bank - ? WHERE id = ?`),
}

export const getUser = userId => {
  const id = jid.fromUser(userId)
  if (!id) return null

  statements.createUser.run(id)
  const user = statements.getUser.get(id)

  if (!user) return null

  return {
    id: user.id,
    balance: user.balance,
    bank: user.bank,
    totalEarned: user.total_earned,
    createdAt: user.created_at,
  }
}

export const addCoins = (userId, amount) => {
  const id = jid.fromUser(userId)
  if (!id) return null

  statements.createUser.run(id)
  statements.updateBalance.run(amount, amount, id)

  if (amount !== 0) {
    statements.logTransaction.run(null, id, Math.abs(amount), amount > 0 ? 'earn' : 'lose')
  }

  return getUser(userId).balance
}

export const removeCoins = (userId, amount) => {
  const id = jid.fromUser(userId)
  const user = getUser(id)

  if (!user || user.balance < amount) return false

  statements.updateBalance.run(-amount, 0, id)
  statements.logTransaction.run(id, null, amount, 'spend')

  return getUser(id).balance
}

export const setBalance = (userId, amount) => {
  const id = jid.fromUser(userId)
  statements.createUser.run(id)
  statements.setBalance.run(amount, id)
  return amount
}

export const transferCoins = (fromId, toId, amount) => {
  const from = jid.fromUser(fromId)
  const to = jid.fromUser(toId)

  const fromUser = getUser(from)
  if (!fromUser || fromUser.balance < amount) {
    return { success: false, reason: 'insufficient' }
  }

  const transfer = db.transaction(() => {
    statements.updateBalance.run(-amount, 0, from)
    statements.createUser.run(to)
    statements.updateBalance.run(amount, 0, to)
    statements.logTransaction.run(from, to, amount, 'transfer')
  })

  transfer()

  return {
    success: true,
    fromBalance: getUser(from).balance,
    toBalance: getUser(to).balance,
  }
}

export const getLeaderboard = (limit = 10) => {
  return statements.getLeaderboard.all(limit).map(user => ({
    id: user.id,
    balance: user.balance,
    bank: user.bank,
    totalEarned: user.total_earned,
  }))
}

export const getInventory = userId => {
  const id = jid.fromUser(userId)
  return statements.getInventory.all(id)
}

export const addItem = (userId, itemName, quantity = 1) => {
  const id = jid.fromUser(userId)
  statements.createUser.run(id)
  statements.addItem.run(id, itemName, quantity)
}

/*
 * Empty items are deleted separately after removal to maintain referential
 * integrity and avoid constraint violations during the quantity update.
 */
export const removeItem = (userId, itemName, quantity = 1) => {
  const id = jid.fromUser(userId)
  statements.removeItem.run(quantity, id, itemName)
  statements.deleteEmptyItems.run()
}

export const hasItem = (userId, itemName, quantity = 1) => {
  const id = jid.fromUser(userId)
  const inventory = getInventory(id)
  const item = inventory.find(i => i.item_name === itemName)
  return item && item.quantity >= quantity
}

export const deposit = (userId, amount) => {
  const id = jid.fromUser(userId)
  const user = getUser(id)

  if (!user || user.balance < amount) return { success: false, reason: 'insufficient' }

  statements.depositFunds.run(amount, amount, id)
  statements.logTransaction.run(id, null, amount, 'deposit')

  const updated = getUser(id)
  return { success: true, balance: updated.balance, bank: updated.bank }
}

export const withdraw = (userId, amount) => {
  const id = jid.fromUser(userId)
  const user = getUser(id)

  if (!user || user.bank < amount) return { success: false, reason: 'insufficient' }

  statements.withdrawFunds.run(amount, amount, id)
  statements.logTransaction.run(null, id, amount, 'withdraw')

  const updated = getUser(id)
  return { success: true, balance: updated.balance, bank: updated.bank }
}

export const getEconomyStats = () => {
  return db
    .prepare(
      `
    SELECT 
      COUNT(*) as total_users,
      SUM(balance) as total_cash,
      SUM(bank) as total_bank,
      SUM(balance + bank) as total_wealth
    FROM users
  `
    )
    .get()
}

/*
 * Gracefully shuts down the database connection.
 * Database connections must be explicitly closed on process termination to flush
 * WAL checkpoints and prevent potential corruption from abrupt shutdowns.
 */
const shutdown = () => {
  console.log('💾 Closing database...')
  db.close()
  process.exit()
}

process.on('exit', () => db.close())
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

console.log('💾 Database initialized')
