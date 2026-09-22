import { DatabaseSync } from 'node:sqlite';

/**
 * @param {string | Buffer | URL} path
 * @param {{ enableForeignKeyConstraints?: boolean } & Record<string, unknown>} [options]
 * @returns {import('../../types/sqlite-database.js').SqliteDatabase}
 */
export function openDatabase(path, options = {}) {
  const { enableForeignKeyConstraints = false, ...rest } = options;

  /** @type {any} */
  const db = new DatabaseSync(path, {
    enableForeignKeyConstraints,
    ...rest,
  });

  /** @param {string} source */
  db.pragma = (source) => {
    db.exec(`PRAGMA ${source}`);
  };

  /**
   * @template {(...args: any[]) => any} T
   * @param {T} fn
   * @returns {T}
   */
  db.transaction = (fn) => {
    /** @param {...any} args */
    const wrapped = (...args) => {
      if (db.isTransaction) {
        const name = `sp_${Math.random().toString(36).slice(2)}`;
        db.exec(`SAVEPOINT ${name}`);
        try {
          const result = fn(...args);
          db.exec(`RELEASE SAVEPOINT ${name}`);
          return result;
        } catch (err) {
          db.exec(`ROLLBACK TO SAVEPOINT ${name}`);
          db.exec(`RELEASE SAVEPOINT ${name}`);
          throw err;
        }
      }

      db.exec('BEGIN');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    };

    return /** @type {T} */ (wrapped);
  };

  return db;
}
