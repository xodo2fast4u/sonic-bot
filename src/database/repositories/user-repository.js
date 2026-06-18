import { BaseRepository } from './base-repository.js';
import { InsufficientFundsError, InvalidTransactionError } from '../../core/errors.js';
import { container } from '../../core/container.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
    this.jidUtils = null;
  }

  async initialize() {
    await super.initialize();
    this.jidUtils = container.resolve('utils').jid;
  }

  async getOrCreate(userId) {
    const id = this.jidUtils.fromUser(userId);
    if (!id) {
      throw new InvalidTransactionError('Invalid user ID');
    }

    let user = await this.findById(id);

    if (!user) {
      await this.create({ id });
      user = await this.findById(id);
    }

    return this.mapUser(user);
  }

  async addCoins(userId, amount) {
    if (amount === 0) return;

    const id = this.jidUtils.fromUser(userId);
    const user = await this.getOrCreate(id);

    const updateQuery = `
      UPDATE users 
      SET balance = balance + ?, 
          total_earned = total_earned + MAX(0, ?)
      WHERE id = ?
    `;

    await this.execute(updateQuery, [amount, amount, id], 'addCoins');

    await this.logTransaction(null, id, Math.abs(amount), amount > 0 ? 'earn' : 'lose');

    return await this.getBalance(id);
  }

  async removeCoins(userId, amount) {
    const id = this.jidUtils.fromUser(userId);
    const user = await this.getOrCreate(id);

    if (user.balance < amount) {
      throw new InsufficientFundsError(id, amount, user.balance);
    }

    const updateQuery = `
      UPDATE users 
      SET balance = balance - ?
      WHERE id = ?
    `;

    await this.execute(updateQuery, [amount, id], 'removeCoins');
    await this.logTransaction(id, null, amount, 'spend');

    return await this.getBalance(id);
  }

  async setBalance(userId, amount) {
    const id = this.jidUtils.fromUser(userId);
    await this.getOrCreate(id);

    const updateQuery = `UPDATE users SET balance = ? WHERE id = ?`;
    await this.execute(updateQuery, [amount, id], 'setBalance');

    return amount;
  }

  async transferCoins(fromId, toId, amount) {
    const from = this.jidUtils.fromUser(fromId);
    const to = this.jidUtils.fromUser(toId);

    const fromUser = await this.getOrCreate(from);

    if (fromUser.balance < amount) {
      throw new InsufficientFundsError(from, amount, fromUser.balance);
    }

    return await this.transaction(async () => {
      await this.execute(
        `UPDATE users SET balance = balance - ? WHERE id = ?`,
        [amount, from],
        'transferFrom',
      );

      await this.execute(
        `UPDATE users SET balance = balance + ? WHERE id = ?`,
        [amount, to],
        'transferTo',
      );

      await this.logTransaction(from, to, amount, 'transfer');

      return {
        success: true,
        fromBalance: await this.getBalance(from),
        toBalance: await this.getBalance(to),
      };
    });
  }

  async getBalance(userId) {
    const id = this.jidUtils.fromUser(userId);
    const result = await this.get('SELECT balance FROM users WHERE id = ?', [id], 'getBalance');
    return result ? result.balance : 0;
  }

  async deposit(userId, amount) {
    const id = this.jidUtils.fromUser(userId);
    const user = await this.getOrCreate(id);

    if (user.balance < amount) {
      throw new InsufficientFundsError(id, amount, user.balance);
    }

    const updateQuery = `
      UPDATE users 
      SET balance = balance - ?, 
          bank = bank + ?
      WHERE id = ?
    `;

    await this.execute(updateQuery, [amount, amount, id], 'deposit');
    await this.logTransaction(id, null, amount, 'deposit');

    const updated = await this.getOrCreate(id);
    return {
      success: true,
      balance: updated.balance,
      bank: updated.bank,
    };
  }

  async withdraw(userId, amount) {
    const id = this.jidUtils.fromUser(userId);
    const user = await this.getOrCreate(id);

    if (user.bank < amount) {
      throw new InsufficientFundsError(id, amount, user.bank);
    }

    const updateQuery = `
      UPDATE users 
      SET balance = balance + ?, 
          bank = bank - ?
      WHERE id = ?
    `;

    await this.execute(updateQuery, [amount, amount, id], 'withdraw');
    await this.logTransaction(null, id, amount, 'withdraw');

    const updated = await this.getOrCreate(id);
    return {
      success: true,
      balance: updated.balance,
      bank: updated.bank,
    };
  }

  async getLeaderboard(limit = 10, sortBy = 'total') {
    let orderBy;
    switch (sortBy) {
      case 'balance':
        orderBy = 'balance DESC';
        break;
      case 'bank':
        orderBy = 'bank DESC';
        break;
      case 'total':
      default:
        orderBy = '(balance + bank) DESC';
        break;
    }

    const query = `
      SELECT id, balance, bank, total_earned, created_at
      FROM users 
      ORDER BY ${orderBy}
      LIMIT ?
    `;

    const results = await this.all(query, [limit], 'getLeaderboard');
    return results.map((user) => this.mapUser(user));
  }

  async getEconomyStats() {
    const query = `
      SELECT 
        COUNT(*) as total_users,
        SUM(balance) as total_cash,
        SUM(bank) as total_bank,
        SUM(balance + bank) as total_wealth,
        AVG(balance + bank) as avg_wealth,
        MAX(balance + bank) as max_wealth,
        SUM(total_earned) as total_earned
      FROM users
    `;

    return await this.get(query, [], 'getEconomyStats');
  }

  async getUserStats(userId) {
    const id = this.jidUtils.fromUser(userId);
    const user = await this.getOrCreate(id);

    const transactionCount = await this.get(
      'SELECT COUNT(*) as count FROM transactions WHERE from_id = ? OR to_id = ?',
      [id, id],
      'getUserTransactionCount',
    );

    return {
      ...user,
      transactionCount: transactionCount ? transactionCount.count : 0,
      totalWealth: user.balance + user.bank,
    };
  }

  async logTransaction(fromId, toId, amount, type) {
    const query = `
      INSERT INTO transactions (from_id, to_id, amount, type)
      VALUES (?, ?, ?, ?)
    `;

    await this.execute(query, [fromId, toId, amount, type], 'logTransaction');
  }

  async getTransactions(userId, limit = 10, offset = 0) {
    const id = this.jidUtils.fromUser(userId);
    const query = `
      SELECT * FROM transactions 
      WHERE from_id = ? OR to_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `;

    return await this.all(query, [id, id, limit, offset], 'getTransactions');
  }

  async searchUsers(query, limit = 10) {
    const searchQuery = `
      SELECT id, balance, bank, total_earned, created_at
      FROM users 
      WHERE id LIKE ?
      ORDER BY (balance + bank) DESC
      LIMIT ?
    `;

    const results = await this.all(searchQuery, [`%${query}%`, limit], 'searchUsers');
    return results.map((user) => this.mapUser(user));
  }

  mapUser(dbUser) {
    if (!dbUser) return null;

    return {
      id: dbUser.id,
      balance: dbUser.balance || 0,
      bank: dbUser.bank || 0,
      totalEarned: dbUser.total_earned || 0,
      createdAt: dbUser.created_at,
      totalWealth: (dbUser.balance || 0) + (dbUser.bank || 0),
    };
  }

  async batchUpdateUsers(updates) {
    return await this.transaction(async () => {
      const results = [];

      for (const update of updates) {
        const { userId, ...data } = update;
        const id = this.jidUtils.fromUser(userId);

        const fields = Object.keys(data);
        const setClause = fields.map((field) => `${field} = ?`).join(', ');
        const values = [...Object.values(data), id];

        const query = `UPDATE users SET ${setClause} WHERE id = ?`;
        await this.execute(query, values, 'batchUpdate');

        results.push({ id, success: true });
      }

      return results;
    });
  }

  async getInactiveUsers(days = 30) {
    const query = `
      SELECT u.* FROM users u
      LEFT JOIN transactions t ON u.id = t.from_id OR u.id = t.to_id
      WHERE t.timestamp < ? OR t.timestamp IS NULL
      GROUP BY u.id
      HAVING MAX(t.timestamp) < ? OR MAX(t.timestamp) IS NULL
    `;

    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
    const results = await this.all(query, [cutoffTime, cutoffTime], 'getInactiveUsers');
    return results.map((user) => this.mapUser(user));
  }
}
