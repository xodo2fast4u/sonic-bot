import { MessageRouter } from '../../src/core/message-router.js';
import { CommandRegistry } from '../../src/commands/command-registry.js';
import { MiddlewarePipeline } from '../../src/commands/middleware-pipeline.js';
import { SessionManager } from '../../src/cache/session-manager.js';
import { container } from '../../src/core/container.js';
import { config as botConfig, setOwner } from '../../src/config/config.js';
import { addCoins, addItem, getInventory, getUser } from '../../src/database/database.js';

const commandText = (command) => `${botConfig.prefix}${command}`;

const sentText = (sonic) =>
  sonic.sendMessage.mock.calls.map(([, payload]) => payload?.text || '').join('\n');

describe('End-to-End Command Flows', () => {
  let messageRouter;
  let commandRegistry;
  let cache;
  let sessionManager;
  let cooldownManager;
  let middlewarePipeline;
  let mockSonic;

  beforeEach(async () => {
    setOwner('1234567890');
    const configManager = container.resolve('configManager');
    await configManager.initialize();
    commandRegistry = new CommandRegistry();
    container.singletons.set('commandRegistry', commandRegistry);
    await commandRegistry.initialize();

    cache = container.resolve('cache');
    if (!cache.initialized) await cache.initialize();

    sessionManager = new SessionManager();
    if (!sessionManager.initialized) await sessionManager.initialize();

    middlewarePipeline = new MiddlewarePipeline();
    await middlewarePipeline.initialize();
    messageRouter = new MessageRouter({ commandRegistry, middlewarePipeline });
    await messageRouter.initialize();
    cooldownManager = container.resolve('cooldownManager');
    await cooldownManager.reset();
    middlewarePipeline.rateLimitBuckets.clear();

    mockSonic = {
      sendMessage: jest.fn().mockResolvedValue({ key: { id: 'test-message-id' } }),
      ev: {
        process: jest.fn(),
      },
      user: { id: '9999999999@s.whatsapp.net' },
      groupMetadata: jest.fn().mockResolvedValue({
        subject: 'Test group',
        creation: Math.floor(Date.now() / 1000),
        desc: '',
        participants: [
          { id: '1111111111@s.whatsapp.net', admin: 'admin' },
          { id: '9999999999@s.whatsapp.net', admin: 'admin' },
        ],
      }),
    };
  });

  afterEach(async () => {
    if (cache) {
      await cache.clear();
      cache.stopCleanupTimer();
    }
    if (sessionManager) await sessionManager.destroy();
    setOwner('1234567890');
  });

  describe('Economy Command Flow', () => {
    test('should handle complete economy workflow', async () => {
      const userId = '1234567890@s.whatsapp.net';

      const balanceMsg = testUtils.createMockMessage({
        message: { conversation: commandText('balance') },
      });

      await messageRouter.processMessage(mockSonic, balanceMsg);

      expect(sentText(mockSonic)).toContain('WALLET');

      const workMsg = testUtils.createMockMessage({
        message: { conversation: commandText('work') },
      });

      await cooldownManager.reset();
      await messageRouter.processMessage(mockSonic, workMsg);

      expect(sentText(mockSonic)).toContain('Earned');

      await cooldownManager.reset();
      await messageRouter.processMessage(mockSonic, balanceMsg);

      expect(sentText(mockSonic)).toContain('WALLET');

      const user = getUser(userId);
      expect(user.balance).toBeGreaterThan(0);
      expect(user.totalEarned).toBeGreaterThan(0);
    });

    test('should handle transfer flow', async () => {
      const suffix = Date.now().toString().slice(-6);
      const fromUser = `77${suffix}@s.whatsapp.net`;
      const toUser = `88${suffix}@s.whatsapp.net`;

      const initialFromBalance = getUser(fromUser)?.balance || 0;
      const initialToBalance = getUser(toUser)?.balance || 0;
      addCoins(fromUser, 1000);
      addCoins(toUser, 500);

      const balanceMsg = testUtils.createMockMessage({
        key: { participant: fromUser },
        message: { conversation: commandText('balance') },
      });

      await messageRouter.processMessage(mockSonic, balanceMsg);

      await cooldownManager.reset();

      const transferMsg = testUtils.createMockMessage({
        key: { participant: fromUser },
        message: {
          conversation: commandText('pay 200'),
          extendedTextMessage: {
            contextInfo: {
              mentionedJid: [toUser],
            },
          },
        },
      });

      await messageRouter.processMessage(mockSonic, transferMsg);

      expect(sentText(mockSonic)).toMatch(/PAYMENT|Insufficient coins|wait/i);

      const fromBalance = getUser(fromUser).balance;
      const toBalance = getUser(toUser).balance;

      expect(fromBalance).toBe(initialFromBalance + 800); // +1000 - 200
      expect(toBalance).toBe(initialToBalance + 700); // +500 + 200
    });

    test('should handle deposit flow', async () => {
      const userId = '6666666666@s.whatsapp.net';

      const initialUser = getUser(userId);
      const initialBalance = initialUser.balance;
      const initialBank = initialUser.bank;
      addCoins(userId, 1000);

      const depositMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: commandText('deposit 500') },
      });

      await messageRouter.processMessage(mockSonic, depositMsg);

      expect(sentText(mockSonic)).toContain('Deposited');
      const user = getUser(userId);
      expect(user.balance).toBe(initialBalance + 500); // +1000 - 500
      expect(user.bank).toBe(initialBank + 500); // +500
    });
  });

  describe('Inventory Command Flow', () => {
    test('should handle complete inventory workflow', async () => {
      const userId = '5555555555@s.whatsapp.net';
      const initialSword = getInventory(userId).find((item) => item.item_name === 'e2e-sword');

      const addItemMsg = testUtils.createMockMessage({
        key: { participant: '1234567890@s.whatsapp.net' },
        message: {
          conversation: commandText('additem @user e2e-sword 1'),
          extendedTextMessage: { contextInfo: { mentionedJid: [userId] } },
        },
      });

      await messageRouter.processMessage(mockSonic, addItemMsg);

      expect(sentText(mockSonic)).toContain('ITEM ADDED');

      const inventoryMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: commandText('inventory') },
      });

      await cooldownManager.reset();
      await messageRouter.processMessage(mockSonic, inventoryMsg);

      expect(sentText(mockSonic)).toContain('e2e-sword');

      const inventory = getInventory(userId);
      const swordItem = inventory.find((item) => item.item_name === 'e2e-sword');
      expect(swordItem).toBeDefined();
      expect(swordItem.quantity).toBe((initialSword?.quantity || 0) + 1);
    });

    test('should handle item removal flow', async () => {
      const fromUser = '9999999998@s.whatsapp.net';

      const initialPotion = getInventory(fromUser).find((item) => item.item_name === 'e2e-potion');
      addItem(fromUser, 'e2e-potion', 5);

      const transferMsg = testUtils.createMockMessage({
        key: { participant: '1234567890@s.whatsapp.net' },
        message: {
          conversation: commandText('removeitem @user e2e-potion 2'),
          extendedTextMessage: {
            contextInfo: {
              mentionedJid: [fromUser],
            },
          },
        },
      });

      await messageRouter.processMessage(mockSonic, transferMsg);

      expect(sentText(mockSonic)).toContain('ITEM REMOVED');

      const fromInventory = getInventory(fromUser);
      const fromPotion = fromInventory.find((item) => item.item_name === 'e2e-potion');

      expect(fromPotion.quantity).toBe((initialPotion?.quantity || 0) + 3); // +5 - 2
    });
  });

  describe('Permission Flow', () => {
    test('should handle owner-only commands', async () => {
      const regularUser = '1111111111@s.whatsapp.net';
      const ownerUser = '1234567890@s.whatsapp.net';

      const ownerCmdMsg = testUtils.createMockMessage({
        key: { participant: regularUser },
        message: { conversation: commandText('participantson') },
      });

      await messageRouter.processMessage(mockSonic, ownerCmdMsg);

      expect(sentText(mockSonic)).toContain('only available to the bot owner');

      const ownerMsg = testUtils.createMockMessage({
        key: { participant: ownerUser },
        message: { conversation: commandText('participantson') },
      });

      await messageRouter.processMessage(mockSonic, ownerMsg);

      const ownerResponse = mockSonic.sendMessage.mock.calls.at(-1)?.[1]?.text || '';
      expect(ownerResponse).not.toContain('only available to the bot owner');
    });

    test('should handle admin permissions in groups', async () => {
      const adminUser = '1111111111@s.whatsapp.net';
      const regularUser = '2222222222@s.whatsapp.net';
      const groupId = '1234567890@g.us';

      const adminCmdMsg = testUtils.createMockMessage({
        key: {
          remoteJid: groupId,
          participant: regularUser,
        },
        message: { conversation: commandText('tagall') },
      });

      await messageRouter.processMessage(mockSonic, adminCmdMsg);

      expect(sentText(mockSonic)).toContain('Admin only');

      const adminMsg = testUtils.createMockMessage({
        key: {
          remoteJid: groupId,
          participant: adminUser,
        },
        message: { conversation: commandText('tagall') },
      });

      await messageRouter.processMessage(mockSonic, adminMsg);

      const lastCall = mockSonic.sendMessage.mock.calls.at(-1);
      expect(lastCall?.[1]?.text || '').not.toContain('Admin only');
    });
  });

  describe('Cooldown Flow', () => {
    test('should enforce command cooldowns', async () => {
      const userId = '6666666667@s.whatsapp.net';

      const workMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: commandText('work') },
      });

      await messageRouter.processMessage(mockSonic, workMsg);

      expect(sentText(mockSonic)).toContain('WORK');

      await messageRouter.processMessage(mockSonic, workMsg);

      expect(sentText(mockSonic)).toMatch(/wait|slow down/i);
    });

    test('should handle global cooldowns', async () => {
      const userId = '6666666668@s.whatsapp.net';

      const commands = [commandText('balance'), commandText('work'), commandText('inventory')];

      for (const cmd of commands) {
        const msg = testUtils.createMockMessage({
          key: { participant: userId },
          message: { conversation: cmd },
        });

        await messageRouter.processMessage(mockSonic, msg);
      }

      expect(sentText(mockSonic)).toMatch(/slow down|wait/i);
    });
  });

  describe('Cache Integration Flow', () => {
    test('should cache and retrieve user data', async () => {
      const userId = '1234567890@s.whatsapp.net';

      const cacheKey = `e2e:user:${userId}`;
      getUser(userId);
      await cache.set(cacheKey, getUser(userId));
      const cachedUser = await cache.get(cacheKey);
      expect(cachedUser).toBeDefined();
      expect(cachedUser.id).toBe('1234567890');

      const user = getUser(userId);
      expect(user.id).toBe('1234567890');

      expect(mockSonic.sendMessage).not.toHaveBeenCalled();
    });

    test('should invalidate cache on data changes', async () => {
      const userId = '1234567890@s.whatsapp.net';

      const cacheKey = `e2e:user:${userId}`;
      getUser(userId);
      await cache.set(cacheKey, getUser(userId));
      let cachedUser = await cache.get(cacheKey);
      expect(cachedUser).toBeDefined();

      addCoins(userId, 100);
      await cache.delete(cacheKey);

      cachedUser = await cache.get(cacheKey);
      expect(cachedUser).toBeNull();
    });
  });

  describe('Error Handling Flow', () => {
    test('should handle command errors gracefully', async () => {
      const userId = '1234567890@s.whatsapp.net';

      const errorCommand = {
        cmd: ['error'],
        desc: 'Test error command',
        run: jest.fn().mockRejectedValue(new Error('Test error')),
      };

      commandRegistry.commands.set('error', {
        load: async () => new Map([['error', errorCommand]]),
      });

      const errorMsg = testUtils.createMockMessage({
        key: { remoteJid: userId, participant: userId },
        message: { conversation: commandText('error') },
      });

      await messageRouter.processMessage(mockSonic, errorMsg);

      expect(sentText(mockSonic)).toContain('Error');
    });

    test('should handle database errors', async () => {
      const userId = 'invalid-user-id';

      const errorMsg = testUtils.createMockMessage({
        key: { remoteJid: userId, participant: userId },
        message: { conversation: commandText('balance') },
      });

      await messageRouter.processMessage(mockSonic, errorMsg);

      expect(sentText(mockSonic)).toContain('wallet data');
    });
  });

  describe('Performance Flow', () => {
    test('should handle concurrent command processing', async () => {
      const users = Array.from({ length: 10 }, (_, i) => `55${i + 1}0000000@s.whatsapp.net`);

      const promises = users.map((userId, _index) => {
        const msg = testUtils.createMockMessage({
          key: { participant: userId },
          message: { conversation: commandText('work') },
        });

        return messageRouter.processMessage(mockSonic, msg);
      });

      const startTime = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // 5 seconds

      expect(mockSonic.sendMessage).toHaveBeenCalledTimes(10);
    });

    test('should maintain performance under load', async () => {
      const userId = '1234567890@s.whatsapp.net';
      const operations = 100;

      const startTime = Date.now();

      for (let i = 0; i < operations; i++) {
        const msg = testUtils.createMockMessage({
          key: { participant: userId },
          message: { conversation: commandText('balance') },
        });

        await messageRouter.processMessage(mockSonic, msg);
      }

      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / operations;

      expect(avgTime).toBeLessThan(50); // 50ms per operation
    });
  });

  describe('Session Management Flow', () => {
    test('should maintain user sessions across commands', async () => {
      const userId = '1234567890@s.whatsapp.net';

      const firstMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: commandText('balance') },
      });

      await messageRouter.processMessage(mockSonic, firstMsg);

      const session = await sessionManager.getSession(userId);
      expect(session).toBeDefined();
      expect(session.userId).toBe('1234567890');
      expect(session.accessCount).toBe(1);

      const secondMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: commandText('work') },
      });

      await messageRouter.processMessage(mockSonic, secondMsg);

      const updatedSession = await sessionManager.getSession(userId);
      expect(updatedSession.accessCount).toBe(2);
      expect(updatedSession.lastAccessed).toBeGreaterThanOrEqual(session.lastAccessed);
    });

    test('should handle session expiration', async () => {
      const userId = '1234567890@s.whatsapp.net';

      await sessionManager.getSession(userId);

      const session = await sessionManager.getSession(userId);
      session.lastAccessed = Date.now() - 30 * 60 * 1000; // 30 minutes ago

      expect(session.isExpired(15 * 60 * 1000)).toBe(true); // 15 minutes
    });
  });
});
