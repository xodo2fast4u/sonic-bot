import { Migration } from '../migration-manager.js';

export default new Migration(
  '0.3.0',
  'Armour system - adds equipped_armour slot to characters table',
  `
-- UP migration SQL
ALTER TABLE characters ADD COLUMN equipped_armour TEXT DEFAULT NULL;
  `,
  `
-- DOWN migration SQL
-- SQLite does not support DROP COLUMN in older versions; safe to leave as-is.
-- ALTER TABLE characters DROP COLUMN equipped_armour;
  `,
);
