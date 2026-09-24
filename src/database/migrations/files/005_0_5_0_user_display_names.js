import { Migration } from '../migration-manager.js';

export default new Migration(
  '0.5.0',
  'Store user display names for non-mention leaderboard output',
  `
ALTER TABLE users ADD COLUMN display_name TEXT;
  `,
  `
-- SQLite does not support dropping a column on all supported versions.
  `,
);
