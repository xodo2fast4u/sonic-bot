import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { jid } from '../utils/utils.js';
import logger from '../utils/logger.js';
import {
  generateRandomStartingStats,
  getXpRequiredForNextLevel,
  resolveCharacterWithGodmode,
} from '../services/rpg-service.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'sonic_database.db');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

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

  CREATE TABLE IF NOT EXISTS characters (
    user_id TEXT PRIMARY KEY,
    name TEXT,
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 100,
    max_hp INTEGER DEFAULT 100,
    attack INTEGER NOT NULL,
    defense INTEGER NOT NULL,
    magical_power_name TEXT NOT NULL,
    magical_power INTEGER NOT NULL,
    equipped_item TEXT DEFAULT NULL,
    equipped_armour TEXT DEFAULT NULL,
    level_up_messages INTEGER DEFAULT 1,
    battles_won INTEGER DEFAULT 0,
    battles_lost INTEGER DEFAULT 0,
    last_trained INTEGER DEFAULT 0,
    last_daily INTEGER DEFAULT 0,
    last_weekly INTEGER DEFAULT 0,
    last_monthly INTEGER DEFAULT 0,
    last_yearly INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  
  CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(from_id, to_id);
  CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
  CREATE INDEX IF NOT EXISTS idx_characters_level ON characters(level DESC, xp DESC);

  CREATE TABLE IF NOT EXISTS bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS group_mode_settings (
    group_jid TEXT PRIMARY KEY,
    admin_only INTEGER DEFAULT 0,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
`);

try {
  db.exec(`ALTER TABLE characters ADD COLUMN equipped_armour TEXT DEFAULT NULL`);
} catch (e) {
  void e;
}

db.exec(`
  INSERT OR IGNORE INTO bot_settings (key, value) VALUES ('operating_mode', 'public');
`);

const statements = {
  getUser: db.prepare(`SELECT * FROM users WHERE id = ?`),

  createUser: db.prepare(`INSERT OR IGNORE INTO users (id) VALUES (?)`),

  updateBalance: db.prepare(
    `UPDATE users SET balance = balance + ?, total_earned = total_earned + MAX(0, ?) WHERE id = ?`,
  ),

  setBalance: db.prepare(`UPDATE users SET balance = ? WHERE id = ?`),

  getLeaderboard: db.prepare(
    `SELECT id, balance, bank, total_earned FROM users ORDER BY (balance + bank) DESC LIMIT ?`,
  ),

  getTransactions: db.prepare(
    `SELECT from_id, to_id, amount, type, timestamp
     FROM transactions
     WHERE from_id = ? OR to_id = ?
     ORDER BY timestamp DESC, id DESC
     LIMIT ?`,
  ),

  logTransaction: db.prepare(
    `INSERT INTO transactions (from_id, to_id, amount, type) VALUES (?, ?, ?, ?)`,
  ),

  getInventory: db.prepare(`SELECT item_name, quantity FROM inventory WHERE user_id = ?`),

  addItem: db.prepare(
    `INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, ?) ON CONFLICT(user_id, item_name) DO UPDATE SET quantity = quantity + excluded.quantity`,
  ),

  removeItem: db.prepare(
    `UPDATE inventory SET quantity = quantity - ? WHERE user_id = ? AND item_name = ?`,
  ),
  deleteEmptyItems: db.prepare(`DELETE FROM inventory WHERE quantity <= 0`),

  depositFunds: db.prepare(`UPDATE users SET balance = balance - ?, bank = bank + ? WHERE id = ?`),
  withdrawFunds: db.prepare(`UPDATE users SET balance = balance + ?, bank = bank - ? WHERE id = ?`),

  getCharacter: db.prepare(`SELECT * FROM characters WHERE user_id = ?`),

  createCharacter: db.prepare(`
    INSERT OR IGNORE INTO characters (
      user_id, name, level, xp, hp, max_hp, attack, defense, magical_power_name, magical_power
    ) VALUES (?, ?, 1, 0, 100, 100, ?, ?, ?, ?)
  `),

  updateCharacterName: db.prepare(`UPDATE characters SET name = ? WHERE user_id = ?`),

  updateCharacterStats: db.prepare(`
    UPDATE characters 
    SET level = ?, xp = ?, hp = ?, max_hp = ?, attack = ?, defense = ?, magical_power = ? 
    WHERE user_id = ?
  `),

  trainStat: db.prepare(`
    UPDATE characters 
    SET attack = attack + ?, defense = defense + ?, magical_power = magical_power + ?, last_trained = ?
    WHERE user_id = ?
  `),

  setEquippedItem: db.prepare(`UPDATE characters SET equipped_item = ? WHERE user_id = ?`),

  setEquippedArmour: db.prepare(`UPDATE characters SET equipped_armour = ? WHERE user_id = ?`),

  toggleLevelUp: db.prepare(`
    UPDATE characters SET level_up_messages = CASE WHEN level_up_messages = 1 THEN 0 ELSE 1 END WHERE user_id = ?
  `),

  getCombatLeaderboard: db.prepare(`
    SELECT * FROM characters ORDER BY level DESC, xp DESC LIMIT ?
  `),

  recordWin: db.prepare(`UPDATE characters SET battles_won = battles_won + 1 WHERE user_id = ?`),
  recordLoss: db.prepare(`UPDATE characters SET battles_lost = battles_lost + 1 WHERE user_id = ?`),

  updatePeriodicReward: db.prepare(`
    UPDATE characters SET 
      last_daily = CASE WHEN ? = 'daily' THEN ? ELSE last_daily END,
      last_weekly = CASE WHEN ? = 'weekly' THEN ? ELSE last_weekly END,
      last_monthly = CASE WHEN ? = 'monthly' THEN ? ELSE last_monthly END,
      last_yearly = CASE WHEN ? = 'yearly' THEN ? ELSE last_yearly END
    WHERE user_id = ?
  `),

  getBotSetting: db.prepare(`SELECT value FROM bot_settings WHERE key = ?`),
  setBotSetting: db.prepare(`
    INSERT INTO bot_settings (key, value, updated_at)
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `),
  getAdminOnlyGroups: db.prepare(`SELECT group_jid FROM group_mode_settings WHERE admin_only = 1`),
  setGroupAdminOnly: db.prepare(`
    INSERT INTO group_mode_settings (group_jid, admin_only, updated_at)
    VALUES (?, ?, strftime('%s', 'now'))
    ON CONFLICT(group_jid) DO UPDATE SET admin_only = excluded.admin_only, updated_at = excluded.updated_at
  `),
  clearAdminOnlyGroups: db.prepare(`DELETE FROM group_mode_settings WHERE admin_only = 1`),
  deleteGroupModeSetting: db.prepare(`DELETE FROM group_mode_settings WHERE group_jid = ?`),
};

export const getUser = (/** @type {string} */ userId) => {
  const id = jid.fromUser(userId);
  if (!id) return null;

  statements.createUser.run(id);
  const user = statements.getUser.get(id);

  if (!user) return null;

  return {
    id: user.id,
    balance: user.balance,
    bank: user.bank,
    totalEarned: user.total_earned,
    createdAt: user.created_at,
  };
};

export const addCoins = (/** @type {string} */ userId, /** @type {number} */ amount) => {
  const id = jid.fromUser(userId);
  if (!id) return null;

  statements.createUser.run(id);
  statements.updateBalance.run(amount, amount, id);

  if (amount !== 0) {
    statements.logTransaction.run(null, id, Math.abs(amount), amount > 0 ? 'earn' : 'lose');
  }

  const updated = getUser(userId);
  if (!updated) return null;

  return updated.balance;
};

export const removeCoins = (/** @type {string} */ userId, /** @type {number} */ amount) => {
  const id = jid.fromUser(userId);
  const user = getUser(id);

  if (!user || user.balance < amount) return false;

  statements.updateBalance.run(-amount, 0, id);
  statements.logTransaction.run(id, null, amount, 'spend');

  const updated = getUser(id);
  if (!updated) return false;

  return updated.balance;
};

export const setBalance = (/** @type {string} */ userId, /** @type {number} */ amount) => {
  const id = jid.fromUser(userId);
  statements.createUser.run(id);
  statements.setBalance.run(amount, id);
  return amount;
};

export const transferCoins = (
  /** @type {string} */ fromId,
  /** @type {string} */ toId,
  /** @type {number} */ amount,
) => {
  const from = jid.fromUser(fromId);
  const to = jid.fromUser(toId);

  const fromUser = getUser(from);
  if (!fromUser || fromUser.balance < amount) {
    return { success: false, reason: 'insufficient' };
  }

  const transfer = db.transaction(() => {
    statements.updateBalance.run(-amount, 0, from);
    statements.createUser.run(to);
    statements.updateBalance.run(amount, 0, to);
    statements.logTransaction.run(from, to, amount, 'transfer');
  });

  transfer();

  const fromUpdated = getUser(from);
  const toUpdated = getUser(to);

  if (!fromUpdated || !toUpdated) {
    return { success: false, reason: 'user_not_found' };
  }

  return {
    success: true,
    fromBalance: fromUpdated.balance,
    toBalance: toUpdated.balance,
  };
};

export const getLeaderboard = (/** @type {number} */ limit = 10) => {
  return statements.getLeaderboard
    .all(limit)
    .map(
      (
        /** @type {{ id: string, balance: number, bank: number, total_earned: number }} */ user,
      ) => ({
        id: user.id,
        balance: user.balance,
        bank: user.bank,
        totalEarned: user.total_earned,
      }),
    );
};

export const getTransactions = (/** @type {string} */ userId, /** @type {number} */ limit = 10) => {
  const id = jid.fromUser(userId);
  if (!id) return [];

  return statements.getTransactions.all(id, id, limit);
};

export const getInventory = (/** @type {string} */ userId) => {
  const id = jid.fromUser(userId);
  return statements.getInventory.all(id);
};

export const addItem = (
  /** @type {string} */ userId,
  /** @type {string} */ itemName,
  /** @type {number} */ quantity = 1,
) => {
  const id = jid.fromUser(userId);
  statements.createUser.run(id);
  statements.addItem.run(id, itemName, quantity);
};

/*
 * Empty items are deleted separately after removal to maintain referential
 * integrity and avoid constraint violations during the quantity update.
 */
export const removeItem = (
  /** @type {string} */ userId,
  /** @type {string} */ itemName,
  /** @type {number} */ quantity = 1,
) => {
  const id = jid.fromUser(userId);
  statements.removeItem.run(quantity, id, itemName);
  statements.deleteEmptyItems.run();
};

export const hasItem = (
  /** @type {string} */ userId,
  /** @type {string} */ itemName,
  /** @type {number} */ quantity = 1,
) => {
  const id = jid.fromUser(userId);
  const inventory = getInventory(id);
  const item = inventory.find(
    (/** @type {{ item_name: string, quantity: number }} */ i) => i.item_name === itemName,
  );
  return item && item.quantity >= quantity;
};

export const deposit = (/** @type {string} */ userId, /** @type {number} */ amount) => {
  const id = jid.fromUser(userId);
  const user = getUser(id);

  if (!user || user.balance < amount) return { success: false, reason: 'insufficient' };

  statements.depositFunds.run(amount, amount, id);
  statements.logTransaction.run(id, null, amount, 'deposit');

  const updated = getUser(id);
  if (!updated) return { success: false, reason: 'user_not_found' };

  return { success: true, balance: updated.balance, bank: updated.bank };
};

export const withdraw = (/** @type {string} */ userId, /** @type {number} */ amount) => {
  const id = jid.fromUser(userId);
  const user = getUser(id);

  if (!user || user.bank < amount) return { success: false, reason: 'insufficient' };

  statements.withdrawFunds.run(amount, amount, id);
  statements.logTransaction.run(null, id, amount, 'withdraw');

  const updated = getUser(id);
  if (!updated) return { success: false, reason: 'user_not_found' };

  return { success: true, balance: updated.balance, bank: updated.bank };
};

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
  `,
    )
    .get();
};

export const getCharacter = (/** @type {string} */ userId, pushName = '') => {
  const id = jid.fromUser(userId);
  if (!id) return null;

  statements.createUser.run(id);

  let character = statements.getCharacter.get(id);

  if (!character) {
    const randomStats = generateRandomStartingStats();
    const displayName = pushName?.trim() || id;
    statements.createCharacter.run(
      id,
      displayName,
      randomStats.attack,
      randomStats.defense,
      randomStats.magical_power_name,
      randomStats.magical_power,
    );
    character = statements.getCharacter.get(id);
  } else if (pushName && pushName.trim() && character.name !== pushName.trim()) {
    statements.updateCharacterName.run(pushName.trim(), id);
    character.name = pushName.trim();
  }

  return resolveCharacterWithGodmode(character, id);
};

export const awardCommandXp = (
  /** @type {string} */ userId,
  /** @type {number} */ xpAmount,
  pushName = '',
) => {
  const id = jid.fromUser(userId);
  if (!id) return null;

  const resolved = getCharacter(id, pushName);
  if (!resolved) return null;

  if (resolved.isGod) {
    return {
      leveledUp: false,
      oldLevel: '∞',
      newLevel: '∞',
      levelsGained: 0,
      shouldNotify: false,
      character: resolved,
    };
  }

  const dbChar = statements.getCharacter.get(id);
  if (!dbChar) return null;

  let xp = dbChar.xp + xpAmount;
  let level = dbChar.level;
  let maxHp = dbChar.max_hp;
  let hp = dbChar.hp;
  let attack = dbChar.attack;
  let defense = dbChar.defense;
  let magicalPower = dbChar.magical_power;

  let leveledUp = false;
  let levelsGained = 0;
  const oldLevel = level;

  let required = getXpRequiredForNextLevel(level);
  while (xp >= required) {
    xp -= required;
    level += 1;
    levelsGained += 1;
    maxHp += 20;
    hp = maxHp;
    attack += Math.floor(Math.random() * 4) + 2;
    defense += Math.floor(Math.random() * 4) + 2;
    magicalPower += Math.floor(Math.random() * 4) + 2;
    required = getXpRequiredForNextLevel(level);
    leveledUp = true;
  }

  statements.updateCharacterStats.run(level, xp, hp, maxHp, attack, defense, magicalPower, id);

  const updatedResolved = getCharacter(id, pushName);

  return {
    leveledUp,
    oldLevel,
    newLevel: level,
    levelsGained,
    shouldNotify: leveledUp && dbChar.level_up_messages === 1,
    character: updatedResolved,
  };
};

export const trainCharacterStat = (
  /** @type {string} */ userId,
  /** @type {'attack'|'defense'|'magical_power'} */ stat,
  /** @type {number} */ gain,
) => {
  const id = jid.fromUser(userId);
  if (!id) return null;

  getCharacter(id);

  const atkGain = stat === 'attack' ? gain : 0;
  const defGain = stat === 'defense' ? gain : 0;
  const magGain = stat === 'magical_power' ? gain : 0;

  statements.trainStat.run(atkGain, defGain, magGain, Date.now(), id);
  return getCharacter(id);
};

export const setEquippedItem = (
  /** @type {string} */ userId,
  /** @type {string|null} */ itemId,
) => {
  const id = jid.fromUser(userId);
  if (!id) return null;

  getCharacter(id);
  statements.setEquippedItem.run(itemId, id);
  return getCharacter(id);
};

export const setEquippedArmour = (
  /** @type {string} */ userId,
  /** @type {string|null} */ armourId,
) => {
  const id = jid.fromUser(userId);
  if (!id) return null;

  getCharacter(id);
  statements.setEquippedArmour.run(armourId, id);
  return getCharacter(id);
};

export const toggleLevelUpSetting = (/** @type {string} */ userId) => {
  const id = jid.fromUser(userId);
  if (!id) return false;

  getCharacter(id);
  statements.toggleLevelUp.run(id);
  const updated = statements.getCharacter.get(id);
  return updated?.level_up_messages === 1;
};

export const getCombatLeaderboard = (/** @type {number} */ limit = 10) => {
  const rows = statements.getCombatLeaderboard.all(limit);
  return rows.map((char) => resolveCharacterWithGodmode(char, char.user_id));
};

export const recordCombatResult = (
  /** @type {string} */ winnerId,
  /** @type {string} */ loserId,
  /** @type {number} */ purse = 0,
  /** @type {{ wonItem?: any, destroyedItem?: any }} */ itemAction = {},
) => {
  const wId = jid.fromUser(winnerId);
  const lId = jid.fromUser(loserId);

  if (!wId || !lId) return;

  const combatTx = db.transaction(() => {
    statements.recordWin.run(wId);
    statements.recordLoss.run(lId);

    if (purse > 0) {
      statements.updateBalance.run(-purse, 0, lId);
      statements.updateBalance.run(purse, purse, wId);
      statements.logTransaction.run(lId, wId, purse, 'combat_bounty');
    }

    if (itemAction.wonItem) {
      statements.removeItem.run(1, lId, itemAction.wonItem.name);
      statements.removeItem.run(1, lId, itemAction.wonItem.id);
      statements.deleteEmptyItems.run();
      statements.setEquippedItem.run(null, lId);

      statements.addItem.run(wId, itemAction.wonItem.name, 1);
    } else if (itemAction.destroyedItem) {
      statements.removeItem.run(1, lId, itemAction.destroyedItem.name);
      statements.removeItem.run(1, lId, itemAction.destroyedItem.id);
      statements.deleteEmptyItems.run();
      statements.setEquippedItem.run(null, lId);
    }
  });

  combatTx();
};

export const claimPeriodicReward = (
  /** @type {string} */ userId,
  /** @type {'daily'|'weekly'|'monthly'|'yearly'} */ tier,
) => {
  const id = jid.fromUser(userId);
  if (!id) return;
  getCharacter(id);
  statements.updatePeriodicReward.run(
    tier,
    Date.now(),
    tier,
    Date.now(),
    tier,
    Date.now(),
    tier,
    Date.now(),
    id,
  );
};

/** @param {string} key */
export const getBotSetting = (key) => {
  const row = statements.getBotSetting.get(key);
  return row?.value ?? null;
};

/** @param {string} key @param {string} value */
export const setBotSetting = (key, value) => {
  statements.setBotSetting.run(key, value);
  return value;
};

export const getAdminOnlyGroups = () => {
  return statements.getAdminOnlyGroups
    .all()
    .map((/** @type {{ group_jid: string }} */ row) => row.group_jid);
};

/** @param {string} groupJid @param {boolean} enabled */
export const setGroupAdminOnly = (groupJid, enabled) => {
  if (enabled) {
    statements.setGroupAdminOnly.run(groupJid, 1);
  } else {
    statements.deleteGroupModeSetting.run(groupJid);
  }
};

export const clearAdminOnlyGroups = () => {
  statements.clearAdminOnlyGroups.run();
};

/*
 * Gracefully shuts down the database connection.
 * Database connections must be explicitly closed on process termination to flush
 * WAL checkpoints and prevent potential corruption from abrupt shutdowns.
 */
const shutdown = () => {
  logger.info('💾 Closing database...');
  db.close();
  process.exit();
};

process.on('exit', () => db.close());
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

logger.info('💾 Database initialized');
