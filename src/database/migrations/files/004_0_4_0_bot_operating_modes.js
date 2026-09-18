import { Migration } from '../migration-manager.js';

export default new Migration(
  '0.4.0',
  'Bot operating modes - global mode settings and per-group admin-only overrides',
  `
-- UP migration SQL
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

INSERT OR IGNORE INTO bot_settings (key, value) VALUES ('operating_mode', 'public');
  `,
  `
-- DOWN migration SQL
DROP TABLE IF EXISTS group_mode_settings;
DROP TABLE IF EXISTS bot_settings;
  `,
);
