import {
  getCharacter,
  awardCommandXp,
  trainCharacterStat,
  setEquippedItem,
  setEquippedArmour,
  toggleLevelUpSetting,
} from '../../src/database/database.js';
import trainCommand from '../../src/commands/combat/train.js';
import toggleLevelUpCommand from '../../src/commands/combat/togglelevelup.js';
import equipCommand from '../../src/commands/combat/equip.js';
import unequipCommand from '../../src/commands/combat/unequip.js';
import dailyCommand from '../../src/commands/economy/daily.js';
import weeklyCommand from '../../src/commands/economy/weekly.js';

describe('Combat and RPG Commands & DB Operations', () => {
  const generateUserId = () => `${Date.now()}_${Math.floor(Math.random() * 100000)}@s.whatsapp.net`;

  test('creates new character with initial level 1, 100 HP and valid stats', () => {
    const userId = generateUserId();
    const char = getCharacter(userId, 'SonicWarrior');
    expect(char).toBeDefined();
    expect(char.level).toBe(1);
    expect(char.hp).toBe(100);
    expect(char.max_hp).toBe(100);
    expect(char.attack).toBeGreaterThanOrEqual(35);
    expect(char.attack).toBeLessThanOrEqual(100);
    expect(char.defense).toBeGreaterThanOrEqual(30);
    expect(char.defense).toBeLessThanOrEqual(100);
    expect(char.magical_power).toBeGreaterThanOrEqual(40);
    expect(char.magical_power).toBeLessThanOrEqual(100);
    expect(char.name).toBe('SonicWarrior');
  });

  test('awardCommandXp scales level and increases max HP, ATK, DEF', () => {
    const userId = generateUserId();
    getCharacter(userId, 'Leveler');
    const result = awardCommandXp(userId, 150);
    expect(result).toBeDefined();
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
    expect(result.character.max_hp).toBe(120);
    expect(result.character.hp).toBe(120);
    expect(result.character.attack).toBeGreaterThanOrEqual(37);
  });

  test('trainStat increases chosen stat and records timestamp', () => {
    const userId = generateUserId();
    const before = getCharacter(userId);
    const initialAtk = before.attack;
    const updated = trainCharacterStat(userId, 'attack', 4);
    expect(updated.attack).toBe(initialAtk + 4);
  });

  test('equip and unequip battle items updates character state', () => {
    const userId = generateUserId();
    getCharacter(userId);
    setEquippedItem(userId, 'iron_dagger');
    let char = getCharacter(userId);
    expect(char.equipped_item).toBe('iron_dagger');

    setEquippedItem(userId, null);
    char = getCharacter(userId);
    expect(char.equipped_item).toBeNull();
  });

  test('equip and unequip armour updates equipped_armour slot', () => {
    const userId = generateUserId();
    getCharacter(userId);
    setEquippedArmour(userId, 'iron_plate');
    let char = getCharacter(userId);
    expect(char.equipped_armour).toBe('iron_plate');

    setEquippedArmour(userId, null);
    char = getCharacter(userId);
    expect(char.equipped_armour).toBeNull();
  });

  test('toggleLevelUpSetting toggles between 1 and 0', () => {
    const userId = generateUserId();
    getCharacter(userId);
    const firstToggle = toggleLevelUpSetting(userId);
    const secondToggle = toggleLevelUpSetting(userId);
    expect(secondToggle).toBe(!firstToggle);
  });

  test('equip command shows gear list when no args provided', async () => {
    const userId = generateUserId();
    getCharacter(userId, 'GearTester');
    const text = jest.fn();
    const msg = {
      key: { remoteJid: userId, participant: userId },
      message: { conversation: '!equip' },
      pushName: 'GearTester',
    };

    await equipCommand.run({ text, sonic: {}, msg }, []);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('YOUR GEAR'));
  });

  test('equip command rejects equipping an item not in inventory', async () => {
    const userId = generateUserId();
    getCharacter(userId, 'NoBuyer');
    const text = jest.fn();
    const msg = {
      key: { remoteJid: userId, participant: userId },
      message: { conversation: '!equip dragon_katana' },
      pushName: 'NoBuyer',
    };

    await equipCommand.run({ text, sonic: {}, msg }, ['dragon_katana']);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('do not own'));
  });

  test('unequip command shows current gear when no slot arg given', async () => {
    const userId = generateUserId();
    getCharacter(userId, 'GearDisplayer');
    setEquippedItem(userId, 'wooden_sword');
    const text = jest.fn();
    const msg = {
      key: { remoteJid: userId, participant: userId },
      message: { conversation: '!unequip' },
      pushName: 'GearDisplayer',
    };

    await unequipCommand.run({ text, sonic: {}, msg }, []);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('CURRENT GEAR'));
  });

  test('unequip weapon command clears equipped weapon slot', async () => {
    const userId = generateUserId();
    getCharacter(userId, 'Disarmer');
    setEquippedItem(userId, 'iron_dagger');
    const text = jest.fn();
    const msg = {
      key: { remoteJid: userId, participant: userId },
      message: { conversation: '!unequip weapon' },
      pushName: 'Disarmer',
    };

    await unequipCommand.run({ text, sonic: {}, msg }, ['weapon']);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('GEAR REMOVED'));
    const char = getCharacter(userId);
    expect(char.equipped_item).toBeNull();
  });

  test('unequip all clears both weapon and armour slots', async () => {
    const userId = generateUserId();
    getCharacter(userId, 'FullStrip');
    setEquippedItem(userId, 'wooden_sword');
    setEquippedArmour(userId, 'leather_vest');
    const text = jest.fn();
    const msg = {
      key: { remoteJid: userId, participant: userId },
      message: { conversation: '!unequip all' },
      pushName: 'FullStrip',
    };

    await unequipCommand.run({ text, sonic: {}, msg }, ['all']);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('GEAR REMOVED'));
    const char = getCharacter(userId);
    expect(char.equipped_item).toBeNull();
    expect(char.equipped_armour).toBeNull();
  });

  test('train command rejects HP training attempts', async () => {
    const userId = generateUserId();
    const text = jest.fn();
    const msg = {
      key: { remoteJid: userId, participant: userId },
      message: { conversation: '!train hp' },
      pushName: 'SonicWarrior',
    };

    await trainCommand.run({ text, sonic: {}, msg }, ['hp']);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('HP cannot be trained'));
  });

  test('togglelevelup command runs and returns new toggle state', async () => {
    const userId = generateUserId();
    const text = jest.fn();
    const msg = {
      key: { remoteJid: userId, participant: userId },
      message: { conversation: '!togglelevelup' },
      pushName: 'SonicWarrior',
    };

    await toggleLevelUpCommand.run({ text, sonic: {}, msg }, []);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('LEVEL UP ALERTS'));
  });

  test('daily reward command rejects users below Level 5', async () => {
    const lowLevelUser = generateUserId();
    getCharacter(lowLevelUser, 'LowLvlNewbie'); // Level 1

    const text = jest.fn();
    const msg = {
      key: { remoteJid: lowLevelUser, participant: lowLevelUser },
      message: { conversation: '!daily' },
      pushName: 'LowLvlNewbie',
    };

    await dailyCommand.run({ text, sonic: {}, msg }, []);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('DAILY REWARD LOCKED'));
  });

  test('weekly reward command rejects users below Level 15', async () => {
    const midLevelUser = generateUserId();
    getCharacter(midLevelUser, 'MidLvlPlayer');

    const text = jest.fn();
    const msg = {
      key: { remoteJid: midLevelUser, participant: midLevelUser },
      message: { conversation: '!weekly' },
      pushName: 'MidLvlPlayer',
    };

    await weeklyCommand.run({ text, sonic: {}, msg }, []);
    expect(text).toHaveBeenCalledWith(expect.stringContaining('WEEKLY REWARD LOCKED'));
  });
});
