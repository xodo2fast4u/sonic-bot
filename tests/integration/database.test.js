import Database from 'better-sqlite3';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { ConnectionPool } from '../../src/database/connection-pool.js';
import { UserRepository } from '../../src/database/repositories/user-repository.js';
import { InventoryRepository } from '../../src/database/repositories/inventory-repository.js';
import { container } from '../../src/core/container.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Database Integration', () => {
  let dbPath;
  let connectionPool;
  let userRepo;
  let inventoryRepo;
  let cache;

  beforeEach(async () => {
    const testDir = join(__dirname, '../test-data');
    mkdirSync(testDir, { recursive: true });
    dbPath = join(testDir, `test-${Date.now()}.db`);

    connectionPool = new ConnectionPool({
      maxConnections: 5,
      minConnections: 1,
      maxIdleTime: 1000,
      maxAge: 10000,
    });

    await connectionPool.initialize(dbPath);
    container.singletons.set('connectionPool', connectionPool);
    await connectionPool.execute(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        balance INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        total_earned INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);
    await connectionPool.execute(`
      CREATE TABLE inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        item_name TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, item_name)
      );
    `);
    await connectionPool.execute(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_id TEXT,
        to_id TEXT,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        timestamp INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

    cache = container.resolve('cache');
    if (!cache.initialized) await cache.initialize();
    await cache.clear();

    userRepo = new UserRepository();
    await userRepo.initialize();

    inventoryRepo = new InventoryRepository();
    await inventoryRepo.initialize();
  });

  afterEach(async () => {
    if (connectionPool) {
      await connectionPool.close();
    }

    if (cache) await cache.clear();

    if (existsSync(dbPath)) {
      unlinkSync(dbPath);
    }
  });

  describe('Connection Pool', () => {
    test('should initialize with correct configuration', () => {
      const stats = connectionPool.getStats();

      expect(stats.totalConnections).toBeGreaterThanOrEqual(1);
      expect(stats.maxConnections).toBe(5);
      expect(stats.minConnections).toBe(1);
    });

    test('should acquire and release connections', async () => {
      const initialStats = connectionPool.getStats();

      const connection1 = await connectionPool.acquire();
      const statsAfterAcquire = connectionPool.getStats();

      expect(statsAfterAcquire.activeConnections).toBe(initialStats.activeConnections + 1);

      await connectionPool.release(connection1);
      const statsAfterRelease = connectionPool.getStats();

      expect(statsAfterRelease.activeConnections).toBe(initialStats.activeConnections);
    });

    test('should handle concurrent requests', async () => {
      const promises = Array.from({ length: 10 }, () =>
        connectionPool.acquire().then((conn) => connectionPool.release(conn)),
      );

      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    test('should execute queries', async () => {
      const result = await connectionPool.execute(
        'CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)',
      );

      expect(result).toBeDefined();

      await connectionPool.execute('DROP TABLE test_table');
    });
  });

  describe('User Repository', () => {
    const testUserId = '1234567890@s.whatsapp.net';

    test('should create new user', async () => {
      const user = await userRepo.getOrCreate(testUserId);

      expect(user).toBeDefined();
      expect(user.id).toBe(testUserId);
      expect(user.balance).toBe(0);
      expect(user.bank).toBe(0);
      expect(user.totalEarned).toBe(0);
    });

    test('should get existing user', async () => {
      await userRepo.getOrCreate(testUserId);

      const user = await userRepo.getOrCreate(testUserId);

      expect(user.id).toBe(testUserId);
      expect(user.balance).toBe(0);
    });

    test('should add coins to user', async () => {
      await userRepo.getOrCreate(testUserId);

      const newBalance = await userRepo.addCoins(testUserId, 500);

      expect(newBalance).toBe(500);

      const user = await userRepo.getOrCreate(testUserId);
      expect(user.balance).toBe(500);
      expect(user.totalEarned).toBe(500);
    });

    test('should remove coins from user', async () => {
      await userRepo.getOrCreate(testUserId);
      await userRepo.addCoins(testUserId, 1000);

      const newBalance = await userRepo.removeCoins(testUserId, 300);

      expect(newBalance).toBe(700);
    });

    test('should fail when insufficient funds', async () => {
      await userRepo.getOrCreate(testUserId);
      await userRepo.addCoins(testUserId, 100);

      await expect(userRepo.removeCoins(testUserId, 200)).rejects.toThrow('Insufficient funds');
    });

    test('should transfer coins between users', async () => {
      const fromUser = '1234567890@s.whatsapp.net';
      const toUser = '0987654321@s.whatsapp.net';

      await userRepo.getOrCreate(fromUser);
      await userRepo.getOrCreate(toUser);
      await userRepo.addCoins(fromUser, 1000);

      const result = await userRepo.transferCoins(fromUser, toUser, 300);

      expect(result.success).toBe(true);
      expect(result.fromBalance).toBe(700);
      expect(result.toBalance).toBe(300);
    });

    test('should handle bank deposits', async () => {
      await userRepo.getOrCreate(testUserId);
      await userRepo.addCoins(testUserId, 1000);

      const result = await userRepo.deposit(testUserId, 400);

      expect(result.success).toBe(true);
      expect(result.balance).toBe(600);
      expect(result.bank).toBe(400);
    });

    test('should handle bank withdrawals', async () => {
      await userRepo.getOrCreate(testUserId);
      await userRepo.addCoins(testUserId, 1000);
      await userRepo.deposit(testUserId, 500);

      const result = await userRepo.withdraw(testUserId, 200);

      expect(result.success).toBe(true);
      expect(result.balance).toBe(700);
      expect(result.bank).toBe(300);
    });

    test('should get leaderboard', async () => {
      const users = [
        '1111111111@s.whatsapp.net',
        '2222222222@s.whatsapp.net',
        '3333333333@s.whatsapp.net',
      ];

      for (let i = 0; i < users.length; i++) {
        await userRepo.getOrCreate(users[i]);
        await userRepo.addCoins(users[i], (i + 1) * 1000);
      }

      const leaderboard = await userRepo.getLeaderboard(3);

      expect(leaderboard).toHaveLength(3);
      expect(leaderboard[0].totalWealth).toBe(3000); // User 3
      expect(leaderboard[1].totalWealth).toBe(2000); // User 2
      expect(leaderboard[2].totalWealth).toBe(1000); // User 1
    });

    test('should get economy statistics', async () => {
      const users = ['1111111111@s.whatsapp.net', '2222222222@s.whatsapp.net'];

      for (const userId of users) {
        await userRepo.getOrCreate(userId);
        await userRepo.addCoins(userId, 500);
      }

      const stats = await userRepo.getEconomyStats();

      expect(stats.total_users).toBeGreaterThanOrEqual(2);
      expect(stats.total_cash).toBeGreaterThanOrEqual(1000);
      expect(stats.total_wealth).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('Inventory Repository', () => {
    const testUserId = '1234567890@s.whatsapp.net';

    beforeEach(async () => {
      await userRepo.getOrCreate(testUserId);
    });

    test('should add item to inventory', async () => {
      await inventoryRepo.addItem(testUserId, 'sword', 1);

      const inventory = await inventoryRepo.getUserInventory(testUserId);

      expect(inventory).toHaveLength(1);
      expect(inventory[0].itemName).toBe('sword');
      expect(inventory[0].quantity).toBe(1);
    });

    test('should add multiple items', async () => {
      await inventoryRepo.addItem(testUserId, 'sword', 2);
      await inventoryRepo.addItem(testUserId, 'shield', 1);

      const inventory = await inventoryRepo.getUserInventory(testUserId);

      expect(inventory).toHaveLength(2);
      expect(inventory.find((item) => item.itemName === 'sword').quantity).toBe(2);
      expect(inventory.find((item) => item.itemName === 'shield').quantity).toBe(1);
    });

    test('should check if user has item', async () => {
      await inventoryRepo.addItem(testUserId, 'potion', 3);

      const hasItem = await inventoryRepo.hasItem(testUserId, 'potion', 2);
      const hasEnough = await inventoryRepo.hasItem(testUserId, 'potion', 4);

      expect(hasItem).toBe(true);
      expect(hasEnough).toBe(false);
    });

    test('should remove item from inventory', async () => {
      await inventoryRepo.addItem(testUserId, 'sword', 5);
      await inventoryRepo.removeItem(testUserId, 'sword', 2);

      const inventory = await inventoryRepo.getUserInventory(testUserId);
      const sword = inventory.find((item) => item.itemName === 'sword');

      expect(sword.quantity).toBe(3);
    });

    test('should delete item when quantity reaches zero', async () => {
      await inventoryRepo.addItem(testUserId, 'potion', 2);
      await inventoryRepo.removeItem(testUserId, 'potion', 2);

      const inventory = await inventoryRepo.getUserInventory(testUserId);
      const potion = inventory.find((item) => item.itemName === 'potion');

      expect(potion).toBeUndefined();
    });

    test('should transfer items between users', async () => {
      const fromUser = '1234567890@s.whatsapp.net';
      const toUser = '0987654321@s.whatsapp.net';

      await userRepo.getOrCreate(toUser);
      await inventoryRepo.addItem(fromUser, 'sword', 3);

      const result = await inventoryRepo.transferItem(fromUser, toUser, 'sword', 1);

      expect(result.success).toBe(true);

      const fromInventory = await inventoryRepo.getUserInventory(fromUser);
      const toInventory = await inventoryRepo.getUserInventory(toUser);

      expect(fromInventory.find((item) => item.itemName === 'sword').quantity).toBe(2);
      expect(toInventory.find((item) => item.itemName === 'sword').quantity).toBe(1);
    });

    test('should get item statistics', async () => {
      await inventoryRepo.addItem(testUserId, 'rare_item', 1);
      await inventoryRepo.addItem(testUserId, 'common_item', 100);

      const stats = await inventoryRepo.getInventoryStats();

      expect(stats.unique_items).toBeGreaterThanOrEqual(2);
      expect(stats.total_items).toBeGreaterThanOrEqual(101);
    });

    test('should search items by name', async () => {
      await inventoryRepo.addItem(testUserId, 'magic_sword', 1);

      const results = await inventoryRepo.searchItems('magic');

      expect(results).toHaveLength(1);
      expect(results[0].itemName).toBe('magic_sword');
    });
  });

  describe('Transaction Handling', () => {
    test('should handle successful transactions', async () => {
      const fromUser = '1111111111@s.whatsapp.net';
      const toUser = '2222222222@s.whatsapp.net';

      await userRepo.getOrCreate(fromUser);
      await userRepo.getOrCreate(toUser);
      await userRepo.addCoins(fromUser, 1000);

      await userRepo.transferCoins(fromUser, toUser, 500);

      const fromBalance = await userRepo.getBalance(fromUser);
      const toBalance = await userRepo.getBalance(toUser);

      expect(fromBalance).toBe(500);
      expect(toBalance).toBe(500);
    });

    test('should rollback on transaction failure', async () => {
      /*
       * This test would need to be implemented with explicit transaction handling
       * For now, we test that the system handles errors gracefully
       */
      const fromUser = '1111111111@s.whatsapp.net';

      await userRepo.getOrCreate(fromUser);
      await userRepo.addCoins(fromUser, 100);

      await expect(
        userRepo.transferCoins(fromUser, 'nonexistent@s.whatsapp.net', 200),
      ).rejects.toThrow();

      const balance = await userRepo.getBalance(fromUser);
      expect(balance).toBe(100);
    });
  });

  describe('Performance Tests', () => {
    test('should handle concurrent operations', async () => {
      const users = Array.from({ length: 50 }, (_, i) => `${i}@test.com`);

      await Promise.all(users.map((userId) => userRepo.getOrCreate(userId)));

      await Promise.all(users.map((userId) => userRepo.addCoins(userId, 100)));

      const results = await Promise.all(users.map((userId) => userRepo.getBalance(userId)));

      results.forEach((balance) => {
        expect(balance).toBe(100);
      });
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      const operations = 100;

      for (let i = 0; i < operations; i++) {
        const userId = `user${i}@test.com`;
        await userRepo.getOrCreate(userId);
        await userRepo.addCoins(userId, Math.floor(Math.random() * 1000));
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000);

      const avgTime = duration / operations;
      expect(avgTime).toBeLessThan(50);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity', async () => {
      const userId = '1234567890@s.whatsapp.net';

      await userRepo.getOrCreate(userId);
      await inventoryRepo.addItem(userId, 'item', 1);

      const user = await userRepo.getOrCreate(userId);
      expect(user.id).toBe(userId);

      const inventory = await inventoryRepo.getUserInventory(userId);
      expect(inventory).toHaveLength(1);
    });

    test('should handle edge cases', async () => {
      await expect(userRepo.getOrCreate('')).rejects.toThrow();

      await expect(userRepo.addCoins(null, 100)).rejects.toThrow();

      const userId = '1234567890@s.whatsapp.net';
      await userRepo.getOrCreate(userId);

      await expect(userRepo.addCoins(userId, -100)).rejects.toThrow();
    });
  });
});
