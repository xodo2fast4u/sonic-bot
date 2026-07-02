/*
 * SQLite-based authentication state persistence for WhatsApp multi-device connections
 * Handles credentials, encryption keys and session data across app restarts
 */

import Database from 'better-sqlite3';
import { proto, initAuthCreds, BufferJSON } from 'baileys';

const KNOWN_KEY_TYPES = [
  'app-state-sync-key',
  'app-state-sync-version',
  'sender-key',
  'sender-key-memory',
  'pre-key',
  'session',
  'sender-key-status',
  'credit',
  'sender-key-retry',
  'adv-secret-key',
  'me',
  'signal-identities',
  'app-state-sync-key-share',
  'lid-mapping',
  'device-list',
  'tctoken',
];

/*
 * Helper for serializing/deserializing binary data with JSON
 * Handles Buffer objects that can't normally be stringified
 */
const J = {
  /** @param {any} v @returns {string} */
  to(v) {
    return JSON.stringify(v, BufferJSON.replacer);
  },
  /** @param {string} s @returns {any} */
  from(s) {
    return JSON.parse(s, BufferJSON.reviver);
  },
};

/*
 * Initialize database schema and apply migrations
 * Optimizes performance with WAL mode and proper foreign key constraints
 */

/** @param {any} db */
function applyMigrations(db) {
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');

  db.prepare(
    `
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `,
  ).run();

  const getVersion = () => {
    const row = db.prepare("SELECT value FROM schema_meta WHERE key='version'").get();
    return row ? Number(row.value) : 0;
  };
  /** @param {any} v */
  const setVersion = (v) =>
    db
      .prepare(
        "INSERT INTO schema_meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
      )
      .run(String(v));

  const migrations = [
    {
      version: 1,
      name: 'baseline',
      sql: `
        -- multi-tenant because of course one day you'll sell this to 3 clients and pretend you're a saas
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          label TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- 1:1 creds with account. you get exactly one set of creds per account.
        CREATE TABLE IF NOT EXISTS creds (
          account_id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
        );

        -- politely force you to not typo key categories like a sleep-deprived goblin
        CREATE TABLE IF NOT EXISTS key_types (
          name TEXT PRIMARY KEY
          -- could add display_name, docs_url if you want to build a ui. please don't.
        );

        -- the money table: a billion tiny records instead of your "one table to hold all sins"
        CREATE TABLE IF NOT EXISTS keys (
          account_id TEXT NOT NULL,
          type TEXT NOT NULL,      -- fk to key_types
          id TEXT NOT NULL,        -- compound id (e.g., jid or device id)
          value TEXT NOT NULL,     -- json blob, yes, but at least constrained
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          PRIMARY KEY (account_id, type, id),
          FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (type) REFERENCES key_types(name) ON DELETE RESTRICT
        );

        -- timestamps because apparently you like to ask "why is it slow" without metrics
        CREATE TRIGGER IF NOT EXISTS trg_accounts_updated
        AFTER UPDATE ON accounts
        FOR EACH ROW BEGIN
          UPDATE accounts SET updated_at = datetime('now') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_keys_updated
        AFTER UPDATE ON keys
        FOR EACH ROW BEGIN
          UPDATE keys SET updated_at = datetime('now') WHERE account_id = NEW.account_id AND type = NEW.type AND id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_creds_updated
        AFTER UPDATE ON creds
        FOR EACH ROW BEGIN
          UPDATE creds SET updated_at = datetime('now') WHERE account_id = NEW.account_id;
        END;

        -- indices so lookups don’t degenerate into a linear scan like your last “db”
        CREATE INDEX IF NOT EXISTS idx_keys_account_type ON keys(account_id, type);
        CREATE INDEX IF NOT EXISTS idx_keys_type_id ON keys(type, id);

        -- helpful view for dashboards / debugging without 400 lines of SQL
        CREATE VIEW IF NOT EXISTS v_key_counts AS
          SELECT account_id, type, COUNT(*) AS cnt
          FROM keys
          GROUP BY account_id, type;
      `,
      /** @param {any} db */
      seed: (db) => {
        const insert = db.prepare('INSERT OR IGNORE INTO key_types(name) VALUES (?)');
        db.transaction(() => {
          for (const t of KNOWN_KEY_TYPES) insert.run(t);
        })();
      },
    },
  ];

  const current = getVersion();
  const pending = migrations
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);

  for (const m of pending) {
    db.transaction(() => {
      db.exec(m.sql);
      if (typeof m.seed === 'function') m.seed(db);
      setVersion(m.version);
    })();
  }
}

// Compile all database queries for better performance
/** @param {any} db */
function prepareStatements(db) {
  return {
    insertAccount: db.prepare(`
      INSERT INTO accounts(id, label) VALUES (?, ?)
      ON CONFLICT(id) DO NOTHING
    `),
    upsertCreds: db.prepare(`
      INSERT INTO creds(account_id, data) VALUES (?, ?)
      ON CONFLICT(account_id) DO UPDATE SET data=excluded.data, updated_at=datetime('now')
    `),
    getCreds: db.prepare(`
      SELECT data FROM creds WHERE account_id = ?
    `),
    selectKey: db.prepare(`
      SELECT value FROM keys WHERE account_id=? AND type=? AND id=?
    `),
    upsertKey: db.prepare(`
      INSERT INTO keys(account_id, type, id, value) VALUES (?, ?, ?, ?)
      ON CONFLICT(account_id, type, id) DO UPDATE SET value=excluded.value, updated_at=datetime('now')
    `),
    deleteKey: db.prepare(`
      DELETE FROM keys WHERE account_id=? AND type=? AND id=?
    `),
    purgeType: db.prepare(`
      DELETE FROM keys WHERE account_id=? AND type=?
    `),
    seedType: db.prepare(`
      INSERT OR IGNORE INTO key_types(name) VALUES (?)
    `),
    countKeys: db.prepare(`
      SELECT COUNT(*) as n FROM keys WHERE account_id=? AND type=?
    `),
  };
}

// Support for multiple accounts in one database with separate credential storage
export function useSqliteAuthState(
  dbPath = 'sonic_session.db',
  opts = /** @type {{accountId?:string,accountLabel?:string|null}} */ ({}),
) {
  const { accountId = 'default', accountLabel = null } =
    /** @type {{accountId?:string,accountLabel?:string|null}} */ (opts);

  const db = new Database(dbPath);
  applyMigrations(db);
  const st = prepareStatements(db);

  st.insertAccount.run(accountId, accountLabel);

  const row = st.getCreds.get(accountId);
  const creds = row ? J.from(row.data) : initAuthCreds();
  if (!row) st.upsertCreds.run(accountId, J.to(creds));

  /** @param {string} type @param {any} value @returns {any} */
  const decodeIfNeeded = (type, value) => {
    if (value == null) return null;
    if (type === 'app-state-sync-key') {
      return proto.Message.AppStateSyncKeyData.create(value);
    }
    return value;
  };

  const keysApi = {
    /**
     * @param {string} type
     * @param {string[]} ids
     * @returns {Promise<Record<string, any>>}
     */
    /**
     * @param {string} type
     * @param {string[]} ids
     * @returns {Promise<Record<string, any>>}
     */
    get: async function (type, ids) {
      st.seedType.run(type);
      /** @type {Record<string, any>} */
      const data = {};
      for (const id of ids) {
        const r = st.selectKey.get(accountId, type, id);
        data[id] = r ? decodeIfNeeded(type, J.from(r.value)) : null;
      }
      return data;
    },

    /**
     * @param {Record<string, Record<string, any>>} patch
     * @returns {Promise<void>}
     */
    set: async function (patch) {
      const transaction = db.transaction(
        /** @param {Record<string, Record<string, any>>} innerPatch */
        (innerPatch) => {
          for (const type of Object.keys(/** @type {Record<string, any>} */ (innerPatch))) {
            st.seedType.run(type);
            /** @type {Record<string, any>} */
            const records = /** @type {Record<string, any>} */ (innerPatch[type]);
            if (!records) continue;
            for (const id of Object.keys(records)) {
              const value = records[id];
              if (value == null) {
                st.deleteKey.run(accountId, type, id);
              } else {
                st.upsertKey.run(accountId, type, id, J.to(value));
              }
            }
          }
        },
      );
      transaction(patch);
    },
  };

  return {
    state: {
      creds,
      keys: keysApi,
    },

    saveCreds: async () => {
      db.transaction(() => {
        st.upsertCreds.run(accountId, J.to(creds));
      })();
    },

    // Admin utilities for account management and debugging
    admin: {
      /** @param {string} type */
      purgeType(type) {
        return st.purgeType.run(accountId, type);
      },
      /** @param {string} type */
      countByType(type) {
        return st.countKeys.get(accountId, type)?.n ?? 0;
      },
      exportAccount: () => {
        /** @type {{creds:any, keys: Record<string, Record<string, any>>}} */
        const dump = { creds: null, keys: {} };
        const keysStmt = db.prepare('SELECT type, id, value FROM keys WHERE account_id=?');
        dump.creds = creds;
        dump.keys = {};
        for (const row of keysStmt.iterate(accountId)) {
          const typedRow = /** @type {{type:string,id:string,value:string}} */ (row);
          if (!typedRow) continue;
          const bucket = dump.keys[typedRow.type] || (dump.keys[typedRow.type] = {});
          bucket[typedRow.id] = J.from(typedRow.value);
        }
        return dump;
      },
      /** @param {{creds?: any, keys?: Record<string, Record<string, any>>}} payload */
      /**
       * @param {{creds?: any, keys?: Record<string, Record<string, any>>}} payload
       */
      importAccount(payload) {
        const safePayload =
          /** @type {{creds?: any, keys?: Record<string, Record<string, any>>}} */ (payload);
        db.transaction(() => {
          if (safePayload.creds) st.upsertCreds.run(accountId, J.to(safePayload.creds));
          if (safePayload.keys) {
            const keys = /** @type {Record<string, Record<string, any>>} */ (safePayload.keys);
            for (const type of Object.keys(keys)) {
              st.seedType.run(type);
              const records = keys[type];
              if (!records) continue;
              for (const id of Object.keys(records)) {
                st.upsertKey.run(accountId, type, id, J.to(records[id]));
              }
            }
          }
        })();
      },
    },

    _db: db,
  };
}
