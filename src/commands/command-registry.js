/**
 * Command Registry with Lazy Loading and Caching
 * Provides efficient command management with on-demand loading
 */
import { readdir } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { container } from '../core/container.js';
import { CommandError } from '../core/errors.js';
import { getErrorMessage } from '../utils/error-message.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @param {any} exports */
const getCommandList = (exports) => {
  if (Array.isArray(exports)) return exports;
  if (exports?.cmd && exports?.run) return [exports];
  return Object.values(exports || {});
};

/**
 * Command metadata
 */
class CommandMetadata {
  /**
   * @param {string} category
   * @param {string} fileName
   * @param {string} modulePath
   */
  constructor(category, fileName, modulePath) {
    this.category = category;
    this.fileName = fileName;
    this.modulePath = modulePath;
    this.loaded = false;
    this.commands = null;
    this.loadTime = 0;
    this.accessCount = 0;
    this.lastAccessed = null;
  }

  async load() {
    if (this.loaded) {
      this.accessCount++;
      this.lastAccessed = Date.now();
      return this.commands;
    }

    const startTime = Date.now();

    try {
      const module = await import(this.modulePath);
      const exports = module.default || module;

      this.commands = new Map();

      const commandList = getCommandList(exports);

      for (const cmd of commandList) {
        if (!cmd?.cmd || !cmd?.run) continue;

        for (const alias of cmd.cmd) {
          this.commands.set(alias.toLowerCase(), {
            ...cmd,
            category: this.category,
            fileName: this.fileName,
            loadedAt: Date.now(),
          });
        }
      }

      this.loaded = true;
      this.loadTime = Date.now() - startTime;
      this.accessCount = 1;
      this.lastAccessed = Date.now();

      return this.commands;
    } catch (error) {
      throw new CommandError(
        `Failed to load command module ${this.modulePath}: ${getErrorMessage(error)}`,
        null,
        {
          modulePath: this.modulePath,
          category: this.category,
        },
      );
    }
  }

  unload() {
    this.loaded = false;
    this.commands = null;
  }

  getStats() {
    return {
      category: this.category,
      fileName: this.fileName,
      loaded: this.loaded,
      loadTime: this.loadTime,
      accessCount: this.accessCount,
      lastAccessed: this.lastAccessed,
      commandCount: this.commands ? this.commands.size : 0,
    };
  }
}

/**
 * Command Registry
 */
export class CommandRegistry {
  constructor() {
    this.metadata = new Map(); // category -> Map<fileName, CommandMetadata>
    this.commands = new Map(); // commandName -> CommandMetadata
    this.logger = null;
    this.cache = null;
    this.commandsPath = __dirname;
    this.initialized = false;
  }

  /**
   * Initialize command registry
   */
  async initialize() {
    this.logger = container.resolve('logger');
    this.cache = container.resolve('cache');

    await this.discoverCommands();

    this.initialized = true;
    this.logger.info('Command registry initialized', {
      categories: this.metadata.size,
      totalFiles: Array.from(this.metadata.values()).reduce((sum, cat) => sum + cat.size, 0),
    });
  }

  /**
   * Discover command files
   */
  async discoverCommands() {
    const folders = await readdir(this.commandsPath, { withFileTypes: true });

    for (const folder of folders.filter((f) => f.isDirectory())) {
      const categoryPath = join(this.commandsPath, folder.name);
      const categoryMetadata = new Map();

      try {
        const files = await readdir(categoryPath);
        const jsFiles = files.filter((file) => file.endsWith('.js') && file !== 'index.js');

        for (const file of jsFiles) {
          const fileName = file.slice(0, -3); // Remove .js extension
          const modulePath = join(categoryPath, file);
          const metadata = new CommandMetadata(folder.name, fileName, modulePath);

          categoryMetadata.set(fileName, metadata);

          // Pre-register command aliases for quick lookup
          await this.preRegisterCommands(metadata);
        }

        this.metadata.set(folder.name, categoryMetadata);
        this.logger.debug(`Discovered category: ${folder.name}`, { fileCount: jsFiles.length });
      } catch (error) {
        this.logger.error(`Failed to discover commands in ${folder.name}:`, error);
      }
    }
  }

  /**
   * Pre-register command aliases without loading the module
   * @param {CommandMetadata} metadata
   */
  async preRegisterCommands(metadata) {
    try {
      const module = await import(metadata.modulePath);
      const exports = module.default || module;
      const commandList = getCommandList(exports);

      for (const cmd of commandList) {
        if (!cmd?.cmd || !cmd?.run) continue;

        for (const alias of cmd.cmd) {
          this.commands.set(alias.toLowerCase(), metadata);
        }
      }
    } catch (error) {
      this.logger.debug(
        `Pre-registration failed for ${metadata.fileName}:`,
        getErrorMessage(error),
      );
    }
  }

  /**
   * Get command by name/alias
   * @param {string} commandName
   */
  async get(commandName) {
    if (!this.initialized) {
      throw new CommandError('Command registry not initialized');
    }

    const metadata = this.commands.get(commandName?.toLowerCase());

    if (!metadata) {
      return null;
    }

    // Load command if not already loaded
    const commands = await metadata.load();

    return commands.get(commandName?.toLowerCase());
  }

  /**
   * Get all loaded commands
   */
  async getAllLoaded() {
    const allCommands = new Map();

    for (const metadata of this.commands.values()) {
      if (metadata.loaded && metadata.commands) {
        for (const [name, command] of metadata.commands) {
          allCommands.set(name, command);
        }
      }
    }

    return allCommands;
  }

  /**
   * Get commands by category
   * @param {string} category
   */
  async getByCategory(category) {
    const categoryMetadata = this.metadata.get(category);

    if (!categoryMetadata) {
      return new Map();
    }

    const categoryCommands = new Map();

    for (const metadata of categoryMetadata.values()) {
      const commands = await metadata.load();

      for (const [name, command] of commands) {
        categoryCommands.set(name, command);
      }
    }

    return categoryCommands;
  }

  /**
   * Search commands
   * @param {string} query
   * @param {import('../../types/index.js').SearchCommandOptions} [options]
   */
  async search(query, options = {}) {
    const { includeCategory = false, includeDescription = false, limit = 50 } = options;
    /** @type {{ name: string, category?: string, fileName?: string, description?: string }[]} */
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [commandName, metadata] of this.commands) {
      if (commandName.includes(lowerQuery)) {
        /** @type {{ name: string, category?: string, fileName?: string, description?: string }} */
        const entry = { name: commandName };

        if (includeCategory) {
          entry.category = metadata.category;
          entry.fileName = metadata.fileName;
        }

        if (includeDescription) {
          const commands = await metadata.load();
          const command = commands.get(commandName);
          if (command?.desc) {
            entry.description = command.desc;
          }
        }

        results.push(entry);
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Load category
   * @param {string} category
   */
  async loadCategory(category) {
    const categoryMetadata = this.metadata.get(category);

    if (!categoryMetadata) {
      throw new CommandError(`Category not found: ${category}`);
    }

    const results = [];

    for (const metadata of categoryMetadata.values()) {
      await metadata.load();
      results.push(metadata.getStats());
    }

    return results;
  }

  /**
   * Unload category
   * @param {string} category
   */
  async unloadCategory(category) {
    const categoryMetadata = this.metadata.get(category);

    if (!categoryMetadata) {
      throw new CommandError(`Category not found: ${category}`);
    }

    for (const metadata of categoryMetadata.values()) {
      metadata.unload();
    }

    this.logger.info(`Unloaded category: ${category}`);
  }

  /**
   * Reload category
   * @param {string} category
   */
  async reloadCategory(category) {
    await this.unloadCategory(category);
    await this.loadCategory(category);
  }

  /**
   * Get registry statistics
   */
  getStats() {
    const stats = {
      categories: this.metadata.size,
      totalFiles: 0,
      loadedFiles: 0,
      totalCommands: this.commands.size,
      loadedCommands: 0,
      categoryBreakdown:
        /** @type {Record<string, { files: number, loadedFiles: number, commands: number, loadedCommands: number, totalLoadTime: number, totalAccessCount: number }>} */ ({}),
    };

    for (const [categoryName, categoryMetadata] of this.metadata) {
      const categoryStats = {
        files: categoryMetadata.size,
        loadedFiles: 0,
        commands: 0,
        loadedCommands: 0,
        totalLoadTime: 0,
        totalAccessCount: 0,
      };

      for (const metadata of categoryMetadata.values()) {
        stats.totalFiles++;

        if (metadata.loaded) {
          stats.loadedFiles++;
          categoryStats.loadedFiles++;
          stats.loadedCommands += metadata.commands ? metadata.commands.size : 0;
          categoryStats.loadedCommands += metadata.commands ? metadata.commands.size : 0;
        }

        categoryStats.totalLoadTime += metadata.loadTime;
        categoryStats.totalAccessCount += metadata.accessCount;
      }

      stats.categoryBreakdown[categoryName] = categoryStats;
    }

    return stats;
  }

  /**
   * Get detailed statistics for all commands
   */
  getDetailedStats() {
    const detailed = [];

    for (const [categoryName, categoryMetadata] of this.metadata) {
      for (const metadata of categoryMetadata.values()) {
        detailed.push({ categoryName, ...metadata.getStats() });
      }
    }

    return detailed;
  }

  /**
   * Clear cache for specific command
   * @param {string} commandName
   */
  async clearCommandCache(commandName) {
    const metadata = this.commands.get(commandName?.toLowerCase());

    if (metadata) {
      metadata.unload();
      this.logger.debug(`Cleared cache for command: ${commandName}`);
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches() {
    for (const metadata of this.commands.values()) {
      metadata.unload();
    }

    this.logger.info('Cleared all command caches');
  }

  /**
   * Get hot commands (frequently accessed)
   * @param {number} [threshold]
   */
  getHotCommands(threshold = 10) {
    const hot = [];

    for (const metadata of this.commands.values()) {
      if (metadata.accessCount >= threshold) {
        hot.push({
          category: metadata.category,
          fileName: metadata.fileName,
          accessCount: metadata.accessCount,
          lastAccessed: metadata.lastAccessed,
          loadTime: metadata.loadTime,
        });
      }
    }

    return hot.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Get cold commands (rarely accessed)
   * @param {number} [threshold]
   */
  getColdCommands(threshold = 1) {
    const cold = [];

    for (const metadata of this.commands.values()) {
      if (metadata.accessCount <= threshold) {
        cold.push({
          category: metadata.category,
          fileName: metadata.fileName,
          accessCount: metadata.accessCount,
          lastAccessed: metadata.lastAccessed,
          loaded: metadata.loaded,
        });
      }
    }

    return cold.sort((a, b) => a.accessCount - b.accessCount);
  }

  /**
   * Validate command structure
   */
  async validateCommands() {
    const issues = [];

    for (const [categoryName, categoryMetadata] of this.metadata) {
      for (const metadata of categoryMetadata.values()) {
        try {
          const commands = await metadata.load();

          for (const [name, command] of commands) {
            if (!command.cmd || !Array.isArray(command.cmd)) {
              issues.push(`Invalid cmd array in ${categoryName}/${metadata.fileName}/${name}`);
            }

            if (!command.run || typeof command.run !== 'function') {
              issues.push(
                `Missing or invalid run function in ${categoryName}/${metadata.fileName}/${name}`,
              );
            }

            if (!command.desc) {
              issues.push(`Missing description in ${categoryName}/${metadata.fileName}/${name}`);
            }
          }
        } catch (error) {
          issues.push(
            `Failed to load ${categoryName}/${metadata.fileName}: ${getErrorMessage(error)}`,
          );
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

// Register as singleton
container.singleton('commandRegistry', () => new CommandRegistry());
