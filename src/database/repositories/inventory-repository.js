import { BaseRepository } from './base-repository.js'
import { container } from '../../core/container.js'

export class InventoryRepository extends BaseRepository {
  constructor() {
    super('inventory')
    this.jidUtils = null
  }

  async initialize() {
    await super.initialize()
    this.jidUtils = container.resolve('utils').jid
  }

  async getUserInventory(userId) {
    const id = this.jidUtils.fromUser(userId)
    const query = `
      SELECT item_name, quantity 
      FROM inventory 
      WHERE user_id = ?
      ORDER BY item_name
    `

    const results = await this.all(query, [id], 'getUserInventory')
    return results.map(item => this.mapItem(item))
  }

  async addItem(userId, itemName, quantity = 1) {
    const id = this.jidUtils.fromUser(userId)

    await this.getOrCreateUser(id)

    const query = `
      INSERT INTO inventory (user_id, item_name, quantity)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, item_name) 
      DO UPDATE SET quantity = quantity + excluded.quantity
    `

    const result = await this.execute(query, [id, itemName, quantity], 'addItem')

    await this.clearUserCache(id)

    return result
  }

  async removeItem(userId, itemName, quantity = 1) {
    const id = this.jidUtils.fromUser(userId)

    const updateQuery = `
      UPDATE inventory 
      SET quantity = quantity - ?
      WHERE user_id = ? AND item_name = ?
    `

    await this.execute(updateQuery, [quantity, id, itemName], 'removeItem')
    await this.execute('DELETE FROM inventory WHERE quantity <= 0', [], 'deleteEmptyItems')

    await this.clearUserCache(id)
  }

  async hasItem(userId, itemName, quantity = 1) {
    const id = this.jidUtils.fromUser(userId)
    const query = `
      SELECT quantity FROM inventory 
      WHERE user_id = ? AND item_name = ?
    `

    const result = await this.get(query, [id, itemName], 'hasItem')
    return result && result.quantity >= quantity
  }

  async getItemQuantity(userId, itemName) {
    const id = this.jidUtils.fromUser(userId)
    const query = `
      SELECT quantity FROM inventory 
      WHERE user_id = ? AND item_name = ?
    `

    const result = await this.get(query, [id, itemName], 'getItemQuantity')
    return result ? result.quantity : 0
  }

  async setItemQuantity(userId, itemName, quantity) {
    const id = this.jidUtils.fromUser(userId)

    if (quantity <= 0) {
      await this.execute('DELETE FROM inventory WHERE user_id = ? AND item_name = ?', [id, itemName], 'deleteItem')
    } else {
      const query = `
        INSERT INTO inventory (user_id, item_name, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, item_name) 
        DO UPDATE SET quantity = excluded.quantity
      `

      await this.execute(query, [id, itemName, quantity], 'setItemQuantity')
    }

    await this.clearUserCache(id)
  }

  async transferItem(fromId, toId, itemName, quantity) {
    const from = this.jidUtils.fromUser(fromId)
    const to = this.jidUtils.fromUser(toId)

    const fromQuantity = await this.getItemQuantity(from, itemName)

    if (fromQuantity < quantity) {
      throw new Error(`Insufficient items: ${fromQuantity} < ${quantity}`)
    }

    return await this.transaction(async () => {
      await this.removeItem(from, itemName, quantity)

      await this.addItem(to, itemName, quantity)

      return {
        success: true,
        fromQuantity: await this.getItemQuantity(from, itemName),
        toQuantity: await this.getItemQuantity(to, itemName),
      }
    })
  }

  async getItemsByName(itemName, limit = 50) {
    const query = `
      SELECT user_id, item_name, quantity
      FROM inventory
      WHERE item_name = ?
      ORDER BY quantity DESC
      LIMIT ?
    `

    return await this.all(query, [itemName, limit], 'getItemsByName')
  }

  async getRareItems(maxQuantity = 5, limit = 20) {
    const query = `
      SELECT user_id, item_name, quantity
      FROM inventory
      WHERE quantity <= ?
      ORDER BY quantity ASC, item_name
      LIMIT ?
    `

    return await this.all(query, [maxQuantity, limit], 'getRareItems')
  }

  async getCommonItems(minQuantity = 100, limit = 20) {
    const query = `
      SELECT user_id, item_name, quantity
      FROM inventory
      WHERE quantity >= ?
      ORDER BY quantity DESC, item_name
      LIMIT ?
    `

    return await this.all(query, [minQuantity, limit], 'getCommonItems')
  }

  async getInventoryStats() {
    const query = `
      SELECT 
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT item_name) as unique_items,
        SUM(quantity) as total_items,
        AVG(quantity) as avg_quantity,
        MAX(quantity) as max_quantity,
        COUNT(*) as total_inventory_entries
      FROM inventory
    `

    return await this.get(query, [], 'getInventoryStats')
  }

  async getUserInventoryCount(userId) {
    const id = this.jidUtils.fromUser(userId)
    const query = `
      SELECT 
        COUNT(*) as item_count,
        SUM(quantity) as total_quantity
      FROM inventory
      WHERE user_id = ?
    `

    return await this.get(query, [id], 'getUserInventoryCount')
  }

  async searchItems(searchTerm, limit = 20) {
    const query = `
      SELECT user_id, item_name, quantity
      FROM inventory
      WHERE item_name LIKE ?
      ORDER BY quantity DESC
      LIMIT ?
    `

    return await this.all(query, [`%${searchTerm}%`, limit], 'searchItems')
  }

  async getTopItemHolders(itemName, limit = 10) {
    const query = `
      SELECT user_id, item_name, quantity
      FROM inventory
      WHERE item_name = ?
      ORDER BY quantity DESC
      LIMIT ?
    `

    const results = await this.all(query, [itemName, limit], 'getTopItemHolders')
    return results.map(item => this.mapItem(item))
  }

  async getUserTopItems(userId, limit = 10) {
    const id = this.jidUtils.fromUser(userId)
    const query = `
      SELECT item_name, quantity
      FROM inventory
      WHERE user_id = ?
      ORDER BY quantity DESC
      LIMIT ?
    `

    const results = await this.all(query, [id, limit], 'getUserTopItems')
    return results.map(item => this.mapItem(item))
  }

  async batchAddItems(additions) {
    return await this.transaction(async () => {
      const results = []

      for (const addition of additions) {
        const { userId, itemName, quantity } = addition
        const id = this.jidUtils.fromUser(userId)

        await this.getOrCreateUser(id)

        const query = `
          INSERT INTO inventory (user_id, item_name, quantity)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id, item_name) 
          DO UPDATE SET quantity = quantity + excluded.quantity
        `

        await this.execute(query, [id, itemName, quantity], 'batchAddItems')

        results.push({ userId, itemName, quantity, success: true })
      }

      return results
    })
  }

  async clearUserInventory(userId) {
    const id = this.jidUtils.fromUser(userId)
    await this.execute('DELETE FROM inventory WHERE user_id = ?', [id], 'clearUserInventory')

    await this.clearUserCache(id)
  }

  async getExpiringItems(hours = 24, limit = 20) {
    const query = `
      SELECT user_id, item_name, quantity, created_at
      FROM inventory
      WHERE created_at < ?
      ORDER BY created_at ASC
      LIMIT ?
    `

    const expirationTime = Date.now() - hours * 60 * 60 * 1000
    const results = await this.all(query, [expirationTime, limit], 'getExpiringItems')

    return results.map(item => ({
      userId: this.jidUtils.toUser(item.user_id),
      itemName: item.item_name,
      quantity: item.quantity,
      createdAt: item.created_at,
      ageHours: Math.floor((Date.now() - item.created_at) / (60 * 60 * 1000)),
    }))
  }

  async getOrCreateUser(userId) {
    const userRepo = container.resolve('userRepository')
    return await userRepo.getOrCreate(userId)
  }

  async clearUserCache(userId) {
    const cacheKeys = [`inventory:${userId}`, `inventory:count:${userId}`, `inventory:top:${userId}`]

    for (const key of cacheKeys) {
      await this.cache.delete(key)
    }
  }

  mapItem(dbItem) {
    if (!dbItem) return null

    return {
      userId: dbItem.user_id,
      itemName: dbItem.item_name,
      quantity: dbItem.quantity,
    }
  }

  async getItemDistribution(itemName) {
    const query = `
      SELECT 
        COUNT(*) as holder_count,
        SUM(quantity) as total_quantity,
        AVG(quantity) as avg_quantity,
        MAX(quantity) as max_quantity,
        MIN(quantity) as min_quantity
      FROM inventory
      WHERE item_name = ?
    `

    return await this.get(query, [itemName], 'getItemDistribution')
  }

  async getUserInventorySummary(userId) {
    const id = this.jidUtils.fromUser(userId)
    const query = `
      SELECT 
        COUNT(*) as unique_items,
        SUM(quantity) as total_items
      FROM inventory
      WHERE user_id = ?
    `

    return await this.get(query, [id], 'getUserInventorySummary')
  }
}
