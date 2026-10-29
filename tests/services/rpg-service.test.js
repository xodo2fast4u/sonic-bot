import {
  getXpRequiredForNextLevel,
  generateRandomStartingStats,
  resolveCharacterWithGodmode,
  simulateCombat,
  calculateTraining,
  BATTLE_ITEMS,
  getBattleItem,
  ARMOUR_ITEMS,
  getArmourItem,
  ACCESSORY_ITEMS,
  getAccessoryItem,
  CHARACTER_CLASSES,
  applyClassGrowth,
  MONSTERS,
  BOSSES,
  pickMonsterForLevel,
  pickBossForLevel,
  simulateMonsterCombat,
  getLevelGapPenalty,
} from '../../src/services/rpg-service.js';

describe('RPG Service', () => {
  describe('XP and Leveling Curve', () => {
    test('calculates progressive XP requirements', () => {
      const lvl1 = getXpRequiredForNextLevel(1);
      const lvl2 = getXpRequiredForNextLevel(2);
      const lvl5 = getXpRequiredForNextLevel(5);
      const lvl10 = getXpRequiredForNextLevel(10);

      expect(lvl1).toBe(100);
      expect(lvl2).toBeGreaterThan(lvl1);
      expect(lvl5).toBeGreaterThan(lvl2);
      expect(lvl10).toBeGreaterThan(lvl5);
      expect(lvl10).toBe(3162);
    });

    test('handles 0 or negative levels gracefully', () => {
      expect(getXpRequiredForNextLevel(0)).toBe(100);
      expect(getXpRequiredForNextLevel(-5)).toBe(100);
    });
  });

  describe('Character Defaults and Generation', () => {
    test('generates randomized stats <= 100', () => {
      for (let i = 0; i < 20; i++) {
        const stats = generateRandomStartingStats();
        expect(stats.attack).toBeGreaterThanOrEqual(35);
        expect(stats.attack).toBeLessThanOrEqual(100);
        expect(stats.defense).toBeGreaterThanOrEqual(30);
        expect(stats.defense).toBeLessThanOrEqual(100);
        expect(stats.magical_power).toBeGreaterThanOrEqual(40);
        expect(stats.magical_power).toBeLessThanOrEqual(100);
        expect(typeof stats.magical_power_name).toBe('string');
        expect(stats.magical_power_name.length).toBeGreaterThan(3);
      }
    });
  });

  describe('Battle Items', () => {
    test('all battle items have positive attack and level requirements', () => {
      expect(BATTLE_ITEMS.length).toBeGreaterThanOrEqual(8);
      for (const item of BATTLE_ITEMS) {
        expect(item.attack).toBeGreaterThan(0);
        expect(item.minLevel).toBeGreaterThanOrEqual(1);
        expect(item.price).toBeGreaterThan(0);
        expect(item.type).toBe('battle');
      }
    });

    test('finds battle item by id or name', () => {
      const katana = getBattleItem('dragon_katana');
      expect(katana).toBeDefined();
      expect(katana?.name).toBe('Dragonfire Katana');

      const byName = getBattleItem('Holy Sword Excalibur');
      expect(byName).toBeDefined();
      expect(byName?.id).toBe('excalibur');
    });

    test('finds armour items and verifies stats', () => {
      expect(ARMOUR_ITEMS.length).toBeGreaterThanOrEqual(8);
      const ironPlate = getArmourItem('iron_plate');
      expect(ironPlate).toBeDefined();
      expect(ironPlate?.defense).toBe(45);
      expect(ironPlate?.hp).toBe(50);
    });
  });

  describe('Accessory Items', () => {
    test('all accessories have positive bonuses and pricing', () => {
      expect(ACCESSORY_ITEMS.length).toBeGreaterThanOrEqual(5);
      for (const acc of ACCESSORY_ITEMS) {
        expect(acc.type).toBe('accessory');
        expect(acc.minLevel).toBeGreaterThanOrEqual(1);
        expect(acc.price).toBeGreaterThan(0);
        expect(acc.critChance).toBeGreaterThanOrEqual(0);
      }
    });

    test('finds accessory item by id or name', () => {
      const ring = getAccessoryItem('iron_ring');
      expect(ring).toBeDefined();
      expect(ring?.critChance).toBe(3);
    });
  });

  describe('Classes and Growth', () => {
    test('all character classes are defined with stat multipliers', () => {
      const classes = ['warrior', 'mage', 'rogue'];
      for (const name of classes) {
        const cls = CHARACTER_CLASSES[name];
        expect(cls).toBeDefined();
        expect(cls.atkMult).toBeGreaterThan(0);
        expect(cls.defMult).toBeGreaterThan(0);
        expect(cls.magMult).toBeGreaterThan(0);
      }
    });

    test('applies class growth multipliers properly', () => {
      const base = { atkGain: 3, defGain: 3, magGain: 3 };
      const warriorGains = applyClassGrowth('warrior', base);
      expect(warriorGains.atkGain).toBeGreaterThan(base.atkGain);
      expect(warriorGains.hpBonus).toBe(10);

      const mageGains = applyClassGrowth('mage', base);
      expect(mageGains.magGain).toBeGreaterThan(base.magGain);

      const noviceGains = applyClassGrowth(null, base);
      expect(noviceGains.atkGain).toBe(3);
      expect(noviceGains.hpBonus).toBe(0);
    });
  });

  describe('PvE Monsters and Hunting', () => {
    test('all monsters and bosses have valid configurations', () => {
      expect(MONSTERS.length).toBeGreaterThanOrEqual(5);
      expect(BOSSES.length).toBeGreaterThanOrEqual(3);

      for (const monster of MONSTERS) {
        expect(monster.hp).toBeGreaterThan(0);
        expect(monster.attack).toBeGreaterThan(0);
        expect(monster.defense).toBeGreaterThan(0);
        expect(monster.xpReward).toBeGreaterThan(0);
      }
    });

    test('picks appropriate monster for level', () => {
      const monsterLvl1 = pickMonsterForLevel(1);
      expect(monsterLvl1).toBeDefined();
      expect(monsterLvl1.minLevel).toBeLessThanOrEqual(1);

      const bossLvl10 = pickBossForLevel(10);
      expect(bossLvl10).toBeDefined();
      expect(bossLvl10.isBoss).toBe(true);
    });

    test('simulates PvE combat against a monster', () => {
      const char = {
        user_id: 'hero',
        level: 10,
        hp: 300,
        max_hp: 300,
        attack: 100,
        defense: 80,
        magical_power: 90,
        magical_power_name: 'Chaos Blast',
        equipped_item: 'wooden_sword',
        equipped_armour: 'leather_vest',
        equipped_accessory: 'iron_ring',
      };

      const monster = MONSTERS[0];
      const result = simulateMonsterCombat(char, monster);

      expect(result).toBeDefined();
      expect(typeof result.playerWon).toBe('boolean');
      expect(Array.isArray(result.narrative)).toBe(true);
      expect(result.narrative.length).toBeGreaterThan(0);
    });
  });

  describe('Anti-farming Level Gap Protection', () => {
    test('blocks rewards when gap is 25 levels or greater', () => {
      const check = getLevelGapPenalty(30, 2);
      expect(check.blocked).toBe(true);
      expect(check.factor).toBe(0);
    });

    test('penalizes rewards when gap is 15-24 levels', () => {
      const check = getLevelGapPenalty(20, 3);
      expect(check.blocked).toBe(false);
      expect(check.factor).toBe(0.25);
    });

    test('allows full rewards when gap is small', () => {
      const check = getLevelGapPenalty(10, 8);
      expect(check.blocked).toBe(false);
      expect(check.factor).toBe(1.0);
    });
  });

  describe('Owner Godmode Resolution', () => {
    test('mortal character retains normal stats', () => {
      const char = {
        user_id: '999888777',
        level: 3,
        xp: 150,
        hp: 140,
        max_hp: 140,
        attack: 55,
        defense: 48,
        magical_power: 60,
        magical_power_name: 'Shadow Rift Blast',
        level_up_messages: 1,
      };

      const resolved = resolveCharacterWithGodmode(char, '999888777@s.whatsapp.net');
      expect(resolved.isGod).toBe(false);
      expect(resolved.displayLevel).toBe(3);
      expect(resolved.displayAttack).toBe(55);
    });

    test('owner character resolves to infinite godmode stats', () => {
      process.env['OWNER_NUMBER'] = '111222333';

      const char = {
        user_id: '111222333',
        level: 1,
        xp: 0,
        hp: 100,
        max_hp: 100,
        attack: 50,
        defense: 50,
        magical_power: 50,
        magical_power_name: 'Fire Blast',
      };

      const resolved = resolveCharacterWithGodmode(char, '111222333@s.whatsapp.net');
      expect(resolved.isGod).toBe(true);
      expect(resolved.displayLevel).toBe('∞');
      expect(resolved.displayHp).toBe('∞');
      expect(resolved.displayAttack).toBe('∞');
      expect(resolved.displayDefense).toBe('∞');
      expect(resolved.displayMagicalPower).toBe('∞');
      expect(resolved.magical_power_name).toBe('Omnipotent Reality Warp');
    });
  });

  describe('Combat Simulation', () => {
    test('simulates combat between two mortals', () => {
      const fighterA = {
        user_id: 'user_a',
        level: 5,
        hp: 180,
        max_hp: 180,
        attack: 60,
        defense: 45,
        magical_power: 65,
        magical_power_name: 'Thunder Wrath',
        equipped_item: 'iron_dagger',
        isGod: false,
      };

      const fighterB = {
        user_id: 'user_b',
        level: 4,
        hp: 160,
        max_hp: 160,
        attack: 50,
        defense: 40,
        magical_power: 55,
        magical_power_name: 'Void Pulse',
        equipped_item: null,
        isGod: false,
      };

      const result = simulateCombat(fighterA, fighterB);
      expect(result.isDraw).toBe(false);
      expect(result.winner).toBeDefined();
      expect(result.loser).toBeDefined();
      expect(result.narrative.length).toBeGreaterThanOrEqual(3);
      expect(result.attackerDmgTotal).toBeGreaterThan(0);
      expect(result.defenderDmgTotal).toBeGreaterThan(0);
    });

    test('owner (god) always defeats mortal with 0 damage taken', () => {
      const god = {
        user_id: 'owner_god',
        level: 999999,
        hp: 999999,
        max_hp: 999999,
        attack: 999999,
        defense: 999999,
        magical_power: 999999,
        magical_power_name: 'Omnipotent Reality Warp',
        isGod: true,
      };

      const mortal = {
        user_id: 'mortal_player',
        level: 20,
        hp: 500,
        max_hp: 500,
        attack: 200,
        defense: 150,
        magical_power: 180,
        magical_power_name: 'Inferno Nova',
        isGod: false,
      };

      const res1 = simulateCombat(god, mortal);
      expect(res1.winner.user_id).toBe('owner_god');
      expect(res1.defenderDmgTotal).toBe(0);
      const res2 = simulateCombat(mortal, god);
      expect(res2.winner.user_id).toBe('owner_god');
      expect(res2.attackerDmgTotal).toBe(0);
    });

    test('two gods clashing ends in cosmic draw', () => {
      const god1 = { user_id: 'god1', isGod: true };
      const god2 = { user_id: 'god2', isGod: true };

      const result = simulateCombat(god1, god2);
      expect(result.isDraw).toBe(true);
      expect(result.winner).toBeNull();
    });

    test('magical power breaks ties when other stats are identical', () => {
      const fighterA = {
        user_id: 'twin_a',
        level: 5,
        hp: 200,
        max_hp: 200,
        attack: 50,
        defense: 50,
        magical_power: 80,
        magical_power_name: 'Cosmic Singularity',
        equipped_item: null,
        isGod: false,
      };

      const fighterB = {
        user_id: 'twin_b',
        level: 5,
        hp: 200,
        max_hp: 200,
        attack: 50,
        defense: 50,
        magical_power: 50,
        magical_power_name: 'Spark',
        equipped_item: null,
        isGod: false,
      };

      const result = simulateCombat(fighterA, fighterB);
      expect(result.winner.user_id).toBe('twin_a');
    });
  });

  describe('Training Calculations', () => {
    test('calculates training cost and gains based on stat', () => {
      const trainAtk = calculateTraining(50, false);
      expect(trainAtk.cost).toBe(250 + 50 * 3);
      expect(trainAtk.gain).toBeGreaterThanOrEqual(2);
      expect(trainAtk.gain).toBeLessThanOrEqual(5);

      const trainOwner = calculateTraining(50, true);
      expect(trainOwner.cost).toBe(0);
      expect(trainOwner.gain).toBe(5);
    });
  });
});
