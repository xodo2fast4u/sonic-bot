import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { container } from '../../core/container.js';
import { DatabaseError } from '../../core/errors.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

class Migration {
  constructor(version, description, up, down) {
    this.version = version;
    this.description = description;
    this.up = up;
    this.down = down;
    this.timestamp = new Date().toISOString();
  }

  async execute(connectionPool, direction = 'up') {
    const sql = direction === 'up' ? this.up : this.down;
    if (!sql) {
      throw new DatabaseError(`No ${direction} migration defined for version ${this.version}`);
    }

    const statements = sql
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    for (const statement of statements) {
      await connectionPool.execute(statement);
    }
  }
}

export class MigrationManager {
  constructor() {
    this.connectionPool = null;
    this.logger = null;
    this.migrations = new Map();
    this.migrationsPath = join(__dirname, 'files');
  }

  async initialize() {
    this.connectionPool = container.resolve('connectionPool');
    this.logger = container.resolve('logger');

    await this.createMigrationsTable();

    await this.loadMigrations();

    this.logger.info('Migration manager initialized', {
      loadedMigrations: this.migrations.size,
    });
  }

  async createMigrationsTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        executed_at INTEGER NOT NULL,
        execution_time INTEGER NOT NULL
      )
    `;

    await this.connectionPool.execute(sql);
  }

  async loadMigrations() {
    if (!existsSync(this.migrationsPath)) {
      this.logger.warn('Migrations directory not found', {
        path: this.migrationsPath,
      });
      return;
    }

    const files = readdirSync(this.migrationsPath)
      .filter((file) => file.endsWith('.js'))
      .sort();

    for (const file of files) {
      try {
        const migrationPath = join(this.migrationsPath, file);
        const module = await import(migrationPath);

        if (module.default && module.default instanceof Migration) {
          this.migrations.set(module.default.version, module.default);
          this.logger.debug(`Loaded migration: ${module.default.version}`);
        } else {
          this.logger.warn(`Invalid migration file: ${file}`);
        }
      } catch (error) {
        this.logger.error(`Failed to load migration ${file}:`, error);
      }
    }
  }

  async getCurrentVersion() {
    const result = await this.connectionPool.get(
      'SELECT version FROM schema_migrations ORDER BY executed_at DESC LIMIT 1',
    );
    return result ? result.version : null;
  }

  async getExecutedMigrations() {
    const results = await this.connectionPool.all(
      'SELECT version, description, executed_at FROM schema_migrations ORDER BY executed_at',
    );
    return new Map(results.map((row) => [row.version, row]));
  }

  async getPendingMigrations() {
    const currentVersion = await this.getCurrentVersion();
    const executed = await this.getExecutedMigrations();

    const pending = [];

    for (const [version, migration] of this.migrations) {
      if (!executed.has(version)) {
        pending.push(migration);
      }
    }

    return pending.sort((a, b) => a.version.localeCompare(b.version));
  }

  async migrate(targetVersion = null) {
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      this.logger.info('No pending migrations');
      return { success: true, migrated: 0 };
    }

    const toRun = targetVersion ? pending.filter((m) => m.version <= targetVersion) : pending;

    if (toRun.length === 0) {
      this.logger.info('No migrations to run for target version', {
        targetVersion,
      });
      return { success: true, migrated: 0 };
    }

    this.logger.info(`Running ${toRun.length} migrations`);

    let migrated = 0;

    for (const migration of toRun) {
      try {
        const startTime = Date.now();

        await this.connectionPool.transaction(async () => {
          await migration.execute(this.connectionPool, 'up');

          const executionTime = Date.now() - startTime;

          await this.connectionPool.execute(
            `INSERT INTO schema_migrations (version, description, executed_at, execution_time)
             VALUES (?, ?, ?, ?)`,
            [migration.version, migration.description, Date.now(), executionTime],
          );
        });

        migrated++;
        this.logger.info(`Migration completed: ${migration.version}`, {
          description: migration.description,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        this.logger.error(`Migration failed: ${migration.version}`, error);
        throw new DatabaseError(`Migration ${migration.version} failed: ${error.message}`);
      }
    }

    this.logger.info(`Migration completed successfully`, { migrated });
    return { success: true, migrated };
  }

  async rollback(targetVersion) {
    const currentVersion = await this.getCurrentVersion();
    const executed = await this.getExecutedMigrations();

    if (!currentVersion) {
      throw new DatabaseError('No migrations to rollback');
    }

    const toRollback = [];

    for (const [version, migration] of this.migrations) {
      if (executed.has(version) && version > targetVersion) {
        toRollback.push(migration);
      }
    }

    toRollback.sort((a, b) => b.version.localeCompare(a.version));

    if (toRollback.length === 0) {
      this.logger.info('No migrations to rollback');
      return { success: true, rolledBack: 0 };
    }

    this.logger.info(`Rolling back ${toRollback.length} migrations`);

    let rolledBack = 0;

    for (const migration of toRollback) {
      try {
        const startTime = Date.now();

        await this.connectionPool.transaction(async () => {
          await migration.execute(this.connectionPool, 'down');

          await this.connectionPool.execute('DELETE FROM schema_migrations WHERE version = ?', [
            migration.version,
          ]);
        });

        rolledBack++;
        this.logger.info(`Rollback completed: ${migration.version}`, {
          description: migration.description,
          executionTime: Date.now() - startTime,
        });
      } catch (error) {
        this.logger.error(`Rollback failed: ${migration.version}`, error);
        throw new DatabaseError(`Rollback ${migration.version} failed: ${error.message}`);
      }
    }

    this.logger.info(`Rollback completed successfully`, { rolledBack });
    return { success: true, rolledBack };
  }

  async getStatus() {
    const currentVersion = await this.getCurrentVersion();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      currentVersion,
      totalMigrations: this.migrations.size,
      executedMigrations: executed.size,
      pendingMigrations: pending.length,
      executed: Array.from(executed.values()),
      pending: pending.map((m) => ({
        version: m.version,
        description: m.description,
      })),
    };
  }

  createMigration(version, description) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${timestamp}_${version.replace(/\./g, '_')}_${description.replace(/\s+/g, '_').toLowerCase()}.js`;
    const filePath = join(this.migrationsPath, filename);

    const template = `import { Migration } from '../migration-manager.js';

/**
 * Migration: ${description}
 * Version: ${version}
 */
export default new Migration(
  '${version}',
  '${description}',
  \`
-- UP migration SQL
-- Add your schema changes here
  \`,
  \`
-- DOWN migration SQL
-- Add your rollback changes here
  \`
);
`;

    require('fs').writeFileSync(filePath, template);
    this.logger.info(`Created migration file: ${filename}`);

    return filePath;
  }

  async validateMigrations() {
    const issues = [];

    for (const [version, migration] of this.migrations) {
      if (!/^\d+\.\d+\.\d+$/.test(version)) {
        issues.push(`Invalid version format: ${version}`);
      }

      if (!migration.up) {
        issues.push(`Missing UP migration for version: ${version}`);
      }

      if (!migration.down) {
        issues.push(`Missing DOWN migration for version: ${version}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

container.singleton('migrationManager', () => new MigrationManager());
