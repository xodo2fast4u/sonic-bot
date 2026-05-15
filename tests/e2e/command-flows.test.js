import { MessageRouter } from '../../src/core/message-router.js'
import { CommandRegistry } from '../../src/commands/command-registry.js'
import { UserRepository } from '../../src/database/repositories/user-repository.js'
import { CacheManager } from '../../src/cache/cache-manager.js'
import { SessionManager } from '../../src/cache/session-manager.js'

describe('End-to-End Command Flows', () => {
  let messageRouter
  let commandRegistry
  let userRepo
  let cache
  let sessionManager
  let mockSonic
  let mockMessage

  beforeEach(async () => {
    commandRegistry = new CommandRegistry()
    await commandRegistry.initialize()

    userRepo = new UserRepository()
    await userRepo.initialize()

    cache = new CacheManager()
    await cache.initialize()

    sessionManager = new SessionManager()
    await sessionManager.initialize()

    messageRouter = new MessageRouter()
    await messageRouter.initialize()

    mockSonic = {
      sendMessage: jest.fn().mockResolvedValue({ key: { id: 'test-message-id' } }),
      ev: {
        process: jest.fn(),
      },
    }

    mockMessage = testUtils.createMockMessage({
      key: {
        remoteJid: '1234567890@g.us',
        id: 'test-msg-id',
        participant: '1234567890@s.whatsapp.net',
      },
      message: {
        conversation: '!test',
      },
    })
  })

  afterEach(async () => {
    if (cache) await cache.destroy()
    if (sessionManager) await sessionManager.destroy()
  })

  describe('Economy Command Flow', () => {
    test('should handle complete economy workflow', async () => {
      const userId = '1234567890@s.whatsapp.net'

      const balanceMsg = testUtils.createMockMessage({
        message: { conversation: '!balance' },
      })

      await messageRouter.processMessage(mockSonic, balanceMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        '1234567890@g.us',
        expect.objectContaining({
          text: expect.stringContaining('💍'),
        }),
        { quoted: balanceMsg }
      )

      const workMsg = testUtils.createMockMessage({
        message: { conversation: '!work' },
      })

      await messageRouter.processMessage(mockSonic, workMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        '1234567890@g.us',
        expect.stringContaining('earned')
      )

      await messageRouter.processMessage(mockSonic, balanceMsg)

      expect(mockSonic.sendMessage).toHaveBeenLastCalledWith(
        '1234567890@g.us',
        expect.stringContaining('💍')
      )

      const user = await userRepo.getOrCreate(userId)
      expect(user.balance).toBeGreaterThan(0)
      expect(user.totalEarned).toBeGreaterThan(0)
    })

    test('should handle transfer flow', async () => {
      const fromUser = '1111111111@s.whatsapp.net'
      const toUser = '2222222222@s.whatsapp.net'

      await userRepo.addCoins(fromUser, 1000)
      await userRepo.addCoins(toUser, 500)

      const balanceMsg = testUtils.createMockMessage({
        key: { participant: fromUser },
        message: { conversation: '!balance' },
      })

      await messageRouter.processMessage(mockSonic, balanceMsg)

      const transferMsg = testUtils.createMockMessage({
        key: { participant: fromUser },
        message: {
          conversation: '!pay 2222222222@s.whatsapp.net 200',
          extendedTextMessage: {
            contextInfo: {
              mentionedJid: ['2222222222@s.whatsapp.net'],
            },
          },
        },
      })

      await messageRouter.processMessage(mockSonic, transferMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('transferred')
      )

      const fromBalance = await userRepo.getBalance(fromUser)
      const toBalance = await userRepo.getBalance(toUser)

      expect(fromBalance).toBe(800) // 1000 - 200
      expect(toBalance).toBe(700) // 500 + 200
    })

    test('should handle deposit flow', async () => {
      const userId = '1234567890@s.whatsapp.net'

      await userRepo.addCoins(userId, 1000)

      const depositMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: '!deposit 500' },
      })

      await messageRouter.processMessage(mockSonic, depositMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Deposited')
      )
      e
      const user = await userRepo.getOrCreate(userId)
      expect(user.balance).toBe(500) // 1000 - 500
      expect(user.bank).toBe(500) // 0 + 500
    })
  })

  describe('Inventory Command Flow', () => {
    test('should handle complete inventory workflow', async () => {
      const userId = '1234567890@s.whatsapp.net'

      const addItemMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: '!additem sword 1' },
      })

      await messageRouter.processMessage(mockSonic, addItemMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('added')
      )

      const inventoryMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: '!inventory' },
      })

      await messageRouter.processMessage(mockSonic, inventoryMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('sword')
      )

      const inventory = await userRepo.getInventory(userId)
      const swordItem = inventory.find(item => item.itemName === 'sword')
      expect(swordItem).toBeDefined()
      expect(swordItem.quantity).toBe(1)
    })

    test('should handle item transfer flow', async () => {
      const fromUser = '1111111111@s.whatsapp.net'
      const toUser = '2222222222@s.whatsapp.net'

      const inventoryRepo = container.resolve('inventoryRepository')
      await inventoryRepo.addItem(fromUser, 'potion', 5)

      const transferMsg = testUtils.createMockMessage({
        key: { participant: fromUser },
        message: {
          conversation: '!giveitem 2222222222@s.whatsapp.net potion 2',
          extendedTextMessage: {
            contextInfo: {
              mentionedJid: ['2222222222@s.whatsapp.net'],
            },
          },
        },
      })

      await messageRouter.processMessage(mockSonic, transferMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('transferred')
      )

      const fromInventory = await inventoryRepo.getUserInventory(fromUser)
      const toInventory = await inventoryRepo.getUserInventory(toUser)

      const fromPotion = fromInventory.find(item => item.itemName === 'potion')
      const toPotion = toInventory.find(item => item.itemName === 'potion')

      expect(fromPotion.quantity).toBe(3) // 5 - 2
      expect(toPotion.quantity).toBe(2)
    })
  })

  describe('Permission Flow', () => {
    test('should handle owner-only commands', async () => {
      const regularUser = '1111111111@s.whatsapp.net'
      const ownerUser = '1234567890@s.whatsapp.net'

      jest.spyOn(testUtils, 'isOwner').mockImplementation(user => user === ownerUser)

      const ownerCmdMsg = testUtils.createMockMessage({
        key: { participant: regularUser },
        message: { conversation: '!ownercommand' },
      })

      await messageRouter.processMessage(mockSonic, ownerCmdMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('only available to bot owner')
      )

      const ownerMsg = testUtils.createMockMessage({
        key: { participant: ownerUser },
        message: { conversation: '!ownercommand' },
      })

      await messageRouter.processMessage(mockSonic, ownerMsg)

      expect(mockSonic.sendMessage).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.not.stringContaining('only available to bot owner')
      )
    })

    test('should handle admin permissions in groups', async () => {
      const adminUser = '1111111111@s.whatsapp.net'
      const regularUser = '2222222222@s.whatsapp.net'
      const groupId = '1234567890@g.us'

      jest
        .spyOn(testUtils, 'isGroupAdmin')
        .mockImplementation((user, group) => user === adminUser && group === groupId)

      const adminCmdMsg = testUtils.createMockMessage({
        key: {
          remoteJid: groupId,
          participant: regularUser,
        },
        message: { conversation: '!admincommand' },
      })

      await messageRouter.processMessage(mockSonic, adminCmdMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        groupId,
        expect.stringContaining('requires admin privileges')
      )

      const adminMsg = testUtils.createMockMessage({
        key: {
          remoteJid: groupId,
          participant: adminUser,
        },
        message: { conversation: '!admincommand' },
      })

      await messageRouter.processMessage(mockSonic, adminMsg)

      expect(mockSonic.sendMessage).toHaveBeenLastCalledWith(
        groupId,
        expect.not.stringContaining('requires admin privileges')
      )
    })
  })

  describe('Cooldown Flow', () => {
    test('should enforce command cooldowns', async () => {
      const userId = '1234567890@s.whatsapp.net'

      const workMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: '!work' },
      })

      await messageRouter.processMessage(mockSonic, workMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('earned')
      )

      await messageRouter.processMessage(mockSonic, workMsg)

      expect(mockSonic.sendMessage).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.stringContaining('wait')
      )

      await testUtils.waitFor(2000) // Wait 2 seconds

      await messageRouter.processMessage(mockSonic, workMsg)

      expect(mockSonic.sendMessage).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.stringContaining('earned')
      )
    })

    test('should handle global cooldowns', async () => {
      const userId = '1234567890@s.whatsapp.net'

      const commands = ['!balance', '!work', '!inventory']

      for (const cmd of commands) {
        const msg = testUtils.createMockMessage({
          key: { participant: userId },
          message: { conversation: cmd },
        })

        await messageRouter.processMessage(mockSonic, msg)
      }

      expect(mockSonic.sendMessage).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.stringMatching(/slow down|wait/i)
      )
    })
  })

  describe('Cache Integration Flow', () => {
    test('should cache and retrieve user data', async () => {
      const userId = '1234567890@s.whatsapp.net'

      await userRepo.getOrCreate(userId)

      const cacheKey = `user:${userId}`
      const cachedUser = await cache.get(cacheKey)
      expect(cachedUser).toBeDefined()
      expect(cachedUser.id).toBe(userId)

      const user = await userRepo.getOrCreate(userId)
      expect(user.id).toBe(userId)

      expect(mockSonic.sendMessage).not.toHaveBeenCalled()
    })

    test('should invalidate cache on data changes', async () => {
      const userId = '1234567890@s.whatsapp.net'

      await userRepo.getOrCreate(userId)
      const cacheKey = `user:${userId}`
      let cachedUser = await cache.get(cacheKey)
      expect(cachedUser).toBeDefined()

      await userRepo.addCoins(userId, 100)

      cachedUser = await cache.get(cacheKey)
      expect(cachedUser.balance).toBe(100)
    })
  })

  describe('Error Handling Flow', () => {
    test('should handle command errors gracefully', async () => {
      const userId = '1234567890@s.whatsapp.net'

      const errorCommand = {
        cmd: ['error'],
        desc: 'Test error command',
        run: jest.fn().mockRejectedValue(new Error('Test error')),
      }

      commandRegistry.commands.set('error', errorCommand)

      const errorMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: '!error' },
      })

      await messageRouter.processMessage(mockSonic, errorMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Error')
      )
    })

    test('should handle database errors', async () => {
      const userId = 'invalid-user-id'

      const errorMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: '!balance' },
      })

      await messageRouter.processMessage(mockSonic, errorMsg)

      expect(mockSonic.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Error')
      )
    })
  })

  describe('Performance Flow', () => {
    test('should handle concurrent command processing', async () => {
      const users = Array.from({ length: 10 }, (_, i) => `user${i}@test.com`)

      const promises = users.map((userId, index) => {
        const msg = testUtils.createMockMessage({
          key: { participant: userId },
          message: { conversation: `!work` },
        })

        return messageRouter.processMessage(mockSonic, msg)
      })

      const startTime = Date.now()
      await Promise.all(promises)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000) // 5 seconds

      expect(mockSonic.sendMessage).toHaveBeenCalledTimes(10)
    })

    test('should maintain performance under load', async () => {
      const userId = '1234567890@s.whatsapp.net'
      const operations = 100

      const startTime = Date.now()

      for (let i = 0; i < operations; i++) {
        const msg = testUtils.createMockMessage({
          key: { participant: userId },
          message: { conversation: '!balance' },
        })

        await messageRouter.processMessage(mockSonic, msg)
      }

      const totalTime = Date.now() - startTime
      const avgTime = totalTime / operations

      expect(avgTime).toBeLessThan(50) // 50ms per operation
    })
  })

  describe('Session Management Flow', () => {
    test('should maintain user sessions across commands', async () => {
      const userId = '1234567890@s.whatsapp.net'

      const firstMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: '!balance' },
      })

      await messageRouter.processMessage(mockSonic, firstMsg)

      const session = await sessionManager.getSession(userId)
      expect(session).toBeDefined()
      expect(session.userId).toBe(userId)
      expect(session.accessCount).toBe(1)

      const secondMsg = testUtils.createMockMessage({
        key: { participant: userId },
        message: { conversation: '!work' },
      })

      await messageRouter.processMessage(mockSonic, secondMsg)

      const updatedSession = await sessionManager.getSession(userId)
      expect(updatedSession.accessCount).toBe(2)
      expect(updatedSession.lastAccessed).toBeGreaterThan(session.lastAccessed)
    })

    test('should handle session expiration', async () => {
      const userId = '1234567890@s.whatsapp.net'

      await sessionManager.getSession(userId)

      const session = await sessionManager.getSession(userId)
      session.lastAccessed = Date.now() - 30 * 60 * 1000 // 30 minutes ago

      expect(session.isExpired(15 * 60 * 1000)).toBe(true) // 15 minutes
    })
  })
})
