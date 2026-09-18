import { Migration } from '../migration-manager.js';

export default new Migration(
  '0.2.0',
  'RPG characters and combat system schema',
  `
-- UP migration SQL
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

CREATE INDEX IF NOT EXISTS idx_characters_level ON characters(level DESC, xp DESC);
  `,
  `
-- DOWN migration SQL
DROP TABLE IF EXISTS characters;
  `,
);
