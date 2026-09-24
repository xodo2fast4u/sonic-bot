import { jest } from '@jest/globals';

const mockGetLeaderboard = jest.fn();
const mockGetCombatLeaderboard = jest.fn();

jest.unstable_mockModule('../../src/config/config.js', () => ({
  emoji: { cross: 'X' },
}));
jest.unstable_mockModule('../../src/database/database.js', () => ({
  getLeaderboard: mockGetLeaderboard,
  getCombatLeaderboard: mockGetCombatLeaderboard,
  getUser: jest.fn(),
  hasItem: jest.fn(),
}));
jest.unstable_mockModule('../../src/utils/utils.js', () => ({
  jid: {},
  send: {},
  resolveSender: jest.fn(),
}));

const leaderboardCommand = (await import('../../src/commands/economy/leaderboard.js')).default;

describe('Leaderboard command', () => {
  beforeEach(() => {
    mockGetLeaderboard.mockReset();
    mockGetCombatLeaderboard.mockReset();
  });

  test('shows wealth display names without mention metadata', async () => {
    mockGetLeaderboard.mockReturnValue([
      {
        id: '1234567890',
        displayName: 'Sonic Fan',
        balance: 100,
        bank: 900,
      },
    ]);
    const text = jest.fn();
    const mention = jest.fn();

    await leaderboardCommand.run({ text, mention }, ['coins']);

    expect(text).toHaveBeenCalledTimes(1);
    expect(mention).not.toHaveBeenCalled();
    expect(text.mock.calls[0][0]).toContain('Sonic Fan');
    expect(text.mock.calls[0][0]).not.toContain('@1234567890');
  });

  test('shows combat character names without mention metadata', async () => {
    mockGetCombatLeaderboard.mockReturnValue([
      {
        user_id: '1234567890',
        name: 'Battle Sonic',
        level: 5,
        xp: 40,
        attack: 60,
        defense: 50,
        displayAttack: 60,
        displayDefense: 50,
        battles_won: 3,
        battles_lost: 1,
        isGod: false,
      },
    ]);
    const text = jest.fn();
    const mention = jest.fn();

    await leaderboardCommand.run({ text, mention }, []);

    expect(text).toHaveBeenCalledTimes(1);
    expect(mention).not.toHaveBeenCalled();
    expect(text.mock.calls[0][0]).toContain('Battle Sonic');
    expect(text.mock.calls[0][0]).not.toContain('@1234567890');
  });

  test('falls back to user ID without creating a mention placeholder', async () => {
    mockGetLeaderboard.mockReturnValue([
      {
        id: '1234567890',
        displayName: null,
        balance: 100,
        bank: 900,
      },
    ]);
    const text = jest.fn();

    await leaderboardCommand.run({ text, mention: jest.fn() }, ['wealth']);

    expect(text.mock.calls[0][0]).toContain('1234567890');
    expect(text.mock.calls[0][0]).not.toContain('@1234567890');
  });
});
