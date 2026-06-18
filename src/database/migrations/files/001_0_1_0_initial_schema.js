import { Migration } from '../migration-manager.js';

export default new Migration(
  '0.1.0',
  'Initial database schema',
  `
-- UP migration SQL
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 0,
  bank INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create inventory table
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, item_name)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_id TEXT,
  to_id TEXT,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_id);
CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_inventory_user ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_item ON inventory(item_name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
  `,
  `
-- DOWN migration SQL
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS users;
  `,
);
