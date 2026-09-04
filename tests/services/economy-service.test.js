import { EconomyService } from '../../src/services/economy-service.js';

test('calculateDailyStreak increments and persists the streak', async () => {
  const service = new EconomyService();
  const stored = {};

  service.cache = {
    async get(key) {
      if (key === 'daily:streak:user-1') return 2;
      if (key === 'daily:user-1') return Date.now() - 2 * 60 * 60 * 1000;
      return null;
    },
    async set(key, value) {
      stored[key] = value;
    },
  };

  const streak = await service.calculateDailyStreak('user-1');

  expect(streak).toBe(3);
  expect(stored['daily:streak:user-1']).toBe(3);
});

test('processSlots returns a numeric final balance when the player loses', async () => {
  const service = new EconomyService();

  service.userService = {
    async getUserProfile() {
      return { balance: 40 };
    },
    async removeCoins() {
      return 40;
    },
    async addCoins() {
      return 50;
    },
  };
  service.eventBus = { emitEvent: async () => undefined };
  service.logger = {
    info() {
      return undefined;
    },
  };
  service.generateSlotsResult = () => [];
  service.calculateSlotsWin = () => 0;

  const result = await service.processSlots('user-2', 10);

  expect(typeof result.finalBalance).toBe('number');
  expect(result.finalBalance).toBe(40);
});
