import { isOwner } from '../utils/utils.js';

/**
 * @typedef {Object} BattleItem
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {'battle'} type
 * @property {number} attack
 * @property {number} defense
 * @property {number} price
 * @property {number} minLevel
 * @property {string} desc
 */

/**
 * @typedef {Object} ArmourItem
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {'armour'} type
 * @property {number} defense    - Flat defense bonus
 * @property {number} hp         - Bonus max HP granted while equipped
 * @property {number} magicResist - % reduction of incoming magical damage (0-100)
 * @property {number} price
 * @property {number} minLevel
 * @property {string} desc
 */

/** @type {BattleItem[]} */
export const BATTLE_ITEMS = [
  {
    id: 'wooden_sword',
    name: 'Wooden Practice Sword',
    emoji: '🗡️',
    type: 'battle',
    attack: 15,
    defense: 2,
    price: 400,
    minLevel: 1,
    desc: '+15 ATK | Starter training blade',
  },
  {
    id: 'iron_dagger',
    name: "Assassin's Iron Dagger",
    emoji: '🗡️',
    type: 'battle',
    attack: 30,
    defense: 5,
    price: 1000,
    minLevel: 3,
    desc: '+30 ATK | Swift lethal strikes',
  },
  {
    id: 'battle_axe',
    name: 'Berserker Battle Axe',
    emoji: '🪓',
    type: 'battle',
    attack: 55,
    defense: 10,
    price: 2500,
    minLevel: 5,
    desc: '+55 ATK | Heavy crushing cleaves',
  },
  {
    id: 'shadow_blade',
    name: 'Shadow Ninjato',
    emoji: '⚔️',
    type: 'battle',
    attack: 85,
    defense: 15,
    price: 6000,
    minLevel: 10,
    desc: '+85 ATK | Strikes from the shadows',
  },
  {
    id: 'dragon_katana',
    name: 'Dragonfire Katana',
    emoji: '🐉',
    type: 'battle',
    attack: 130,
    defense: 25,
    price: 15000,
    minLevel: 15,
    desc: '+130 ATK | Scorches foes with dragon breath',
  },
  {
    id: 'mjolnir_hammer',
    name: 'Thunder Hammer Mjolnir',
    emoji: '⚡',
    type: 'battle',
    attack: 200,
    defense: 40,
    price: 35000,
    minLevel: 25,
    desc: '+200 ATK | Summons lightning shocks',
  },
  {
    id: 'excalibur',
    name: 'Holy Sword Excalibur',
    emoji: '✨',
    type: 'battle',
    attack: 300,
    defense: 60,
    price: 80000,
    minLevel: 35,
    desc: '+300 ATK | Legendary radiant blade of kings',
  },
  {
    id: 'chaos_scythe',
    name: "Reaper's Chaos Scythe",
    emoji: '💀',
    type: 'battle',
    attack: 450,
    defense: 80,
    price: 180000,
    minLevel: 50,
    desc: '+450 ATK | Slices through souls and reality',
  },
  {
    id: 'sonic_blades',
    name: 'Supersonic Dual Blades',
    emoji: '🦔',
    type: 'battle',
    attack: 650,
    defense: 120,
    price: 350000,
    minLevel: 75,
    desc: '+650 ATK | Unstoppable lightspeed devastation',
  },
];

/** @type {ArmourItem[]} */
export const ARMOUR_ITEMS = [
  {
    id: 'leather_vest',
    name: 'Leather Vest',
    emoji: '🥋',
    type: 'armour',
    defense: 10,
    hp: 15,
    magicResist: 0,
    price: 350,
    minLevel: 1,
    desc: '+10 DEF | +15 HP | Starter adventurer armour',
  },
  {
    id: 'chain_mail',
    name: 'Chain Mail',
    emoji: '⛓️',
    type: 'armour',
    defense: 25,
    hp: 30,
    magicResist: 0,
    price: 900,
    minLevel: 3,
    desc: '+25 DEF | +30 HP | Sturdy interlocked rings',
  },
  {
    id: 'iron_plate',
    name: 'Iron Plate Armour',
    emoji: '🛡️',
    type: 'armour',
    defense: 45,
    hp: 50,
    magicResist: 5,
    price: 2200,
    minLevel: 5,
    desc: '+45 DEF | +50 HP | 5% magic resist | Heavy iron protection',
  },
  {
    id: 'shadow_cloak',
    name: 'Shadow Cloak',
    emoji: '🌑',
    type: 'armour',
    defense: 70,
    hp: 60,
    magicResist: 10,
    price: 5500,
    minLevel: 10,
    desc: '+70 DEF | +60 HP | 10% magic resist | Absorbs shadows',
  },
  {
    id: 'dragon_scale',
    name: 'Dragon Scale Armour',
    emoji: '🐉',
    type: 'armour',
    defense: 110,
    hp: 100,
    magicResist: 15,
    price: 13000,
    minLevel: 15,
    desc: '+110 DEF | +100 HP | 15% magic resist | Forged from dragon hide',
  },
  {
    id: 'celestial_plate',
    name: 'Celestial Plate',
    emoji: '✨',
    type: 'armour',
    defense: 175,
    hp: 160,
    magicResist: 20,
    price: 32000,
    minLevel: 25,
    desc: '+175 DEF | +160 HP | 20% magic resist | Blessed by heavens',
  },
  {
    id: 'aegis_shield',
    name: 'Aegis War Shield',
    emoji: '🔱',
    type: 'armour',
    defense: 260,
    hp: 230,
    magicResist: 28,
    price: 75000,
    minLevel: 35,
    desc: '+260 DEF | +230 HP | 28% magic resist | Legendary divine aegis',
  },
  {
    id: 'void_armour',
    name: "Reaper's Void Armour",
    emoji: '💀',
    type: 'armour',
    defense: 380,
    hp: 320,
    magicResist: 35,
    price: 160000,
    minLevel: 50,
    desc: '+380 DEF | +320 HP | 35% magic resist | Forged in the abyss',
  },
  {
    id: 'sonic_shield',
    name: 'Supersonic Force Barrier',
    emoji: '🦔',
    type: 'armour',
    defense: 550,
    hp: 450,
    magicResist: 45,
    price: 320000,
    minLevel: 75,
    desc: '+550 DEF | +450 HP | 45% magic resist | Vibrates at lightspeed',
  },
];

export const MAGICAL_POWERS = [
  'Chaos Emerald Surge',
  'Void Singularity',
  'Shadow Rift Blast',
  'Phoenix Solar Flare',
  'Abyssal Nether Strike',
  'Cosmic Oblivion Pulse',
  'Thunder God Wrath',
  'Inferno Tempest Nova',
  'Frostbite Gale Blizzard',
  'Astral Supernova Beam',
  'Chronos Distortion Surge',
  'Solar Eclipse Beam',
  'Phantom Spirit Strike',
  'Sonic Soundwave Rupture',
];

/**
 * Calculate XP required to advance to the next level.
 * @param {number} level
 * @returns {number}
 */
export const getXpRequiredForNextLevel = (level) => {
  if (level <= 0) return 100;
  return Math.max(100, Math.floor(100 * Math.pow(level, 1.5)));
};

/**
 * Get a battle item by ID or name
 * @param {string} query
 * @returns {BattleItem | undefined}
 */
export const getBattleItem = (query) => {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return BATTLE_ITEMS.find((item) => item.id.toLowerCase() === q || item.name.toLowerCase() === q);
};

/**
 * Get an armour item by ID or name
 * @param {string} query
 * @returns {ArmourItem | undefined}
 */
export const getArmourItem = (query) => {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return ARMOUR_ITEMS.find(
    (item) => item.id.toLowerCase() === q || item.name.toLowerCase().includes(q),
  );
};

export const generateRandomStartingStats = () => {
  const attack = Math.floor(Math.random() * 31) + 40;
  const defense = Math.floor(Math.random() * 31) + 35;
  const magical_power = Math.floor(Math.random() * 31) + 45;
  const powerIndex = Math.floor(Math.random() * MAGICAL_POWERS.length);
  const magical_power_name = MAGICAL_POWERS[powerIndex] || 'Chaos Surge';

  return {
    attack,
    defense,
    magical_power,
    magical_power_name,
  };
};

/**
 * Resolves character stats with godmode if user is in OWNER_NUMBER.
 * Preserves the underlying DB object but wraps/overrides values.
 * @param {any} character
 * @param {string} userId
 * @returns {any}
 */
export const resolveCharacterWithGodmode = (character, userId) => {
  if (!character) return null;

  const userOwner = isOwner(userId) || isOwner(character.user_id);
  if (!userOwner) {
    return {
      ...character,
      isOwner: false,
      isGod: false,
      displayLevel: character.level,
      displayXp: character.xp,
      displayHp: character.hp,
      displayMaxHp: character.max_hp,
      displayAttack: character.attack,
      displayDefense: character.defense,
      displayMagicalPower: character.magical_power,
    };
  }

  return {
    ...character,
    isOwner: true,
    isGod: true,
    level: 999999,
    xp: 999999999,
    hp: 999999,
    max_hp: 999999,
    attack: 999999,
    defense: 999999,
    magical_power: 999999,
    magical_power_name: 'Omnipotent Reality Warp',
    displayLevel: '∞',
    displayXp: '∞',
    displayHp: '∞',
    displayMaxHp: '∞',
    displayAttack: '∞',
    displayDefense: '∞',
    displayMagicalPower: '∞',
  };
};

/**
 * Simulates a clash between two characters.
 * @param {any} attacker - Attacker character (resolved with godmode)
 * @param {any} defender - Defender character (resolved with godmode)
 * @returns {any} Battle results
 */
export const simulateCombat = (attacker, defender) => {
  if (attacker.isGod && defender.isGod) {
    return {
      isDraw: true,
      winner: null,
      loser: null,
      narrative: [
        '🌌 Two omnipotent beings clashed, shaking the foundations of reality!',
        '⚡ Reality cracked under infinite power, resulting in a universe-shattering cosmic draw!',
      ],
      attackerDmgTotal: 999999,
      defenderDmgTotal: 999999,
      itemWon: null,
      itemDestroyed: null,
    };
  }

  if (attacker.isGod) {
    return {
      isDraw: false,
      winner: attacker,
      loser: defender,
      narrative: [
        `⚔️ @${attacker.user_id} channels Divine Omnipotence!`,
        `✨ [Omnipotent Reality Warp] obliterates all resistance, striking for ∞ damage!`,
        `👑 @${defender.user_id} was instantly struck down by Divine Authority!`,
      ],
      attackerDmgTotal: 999999,
      defenderDmgTotal: 0,
      itemWon: null,
      itemDestroyed: null,
    };
  }

  if (defender.isGod) {
    return {
      isDraw: false,
      winner: defender,
      loser: attacker,
      narrative: [
        `⚔️ @${attacker.user_id} attempts to attack the Bot Owner!`,
        `🛡️ @${defender.user_id} deflects all attacks with absolute invulnerability (0 damage taken)!`,
        `⚡ [Omnipotent Reality Warp] reflects infinite damage, striking down @${attacker.user_id}!`,
      ],
      attackerDmgTotal: 0,
      defenderDmgTotal: 999999,
      itemWon: null,
      itemDestroyed: null,
    };
  }

  const weaponA = getBattleItem(attacker.equipped_item);
  const weaponB = getBattleItem(defender.equipped_item);
  const armourA = getArmourItem(attacker.equipped_armour);
  const armourB = getArmourItem(defender.equipped_armour);

  const totalAtkA = attacker.attack + (weaponA?.attack || 0);
  const totalDefA = attacker.defense + (weaponA?.defense || 0) + (armourA?.defense || 0);
  const magicResistA = (armourA?.magicResist || 0) / 100;

  const totalAtkB = defender.attack + (weaponB?.attack || 0);
  const totalDefB = defender.defense + (weaponB?.defense || 0) + (armourB?.defense || 0);
  const magicResistB = (armourB?.magicResist || 0) / 100;

  let hpA = attacker.max_hp + (armourA?.hp || 0);
  let hpB = defender.max_hp + (armourB?.hp || 0);

  const narrative = [];
  const weaponTextA = weaponA ? `with ${weaponA.emoji} *${weaponA.name}*` : 'with bare hands 👊';
  const weaponTextB = weaponB ? `with ${weaponB.emoji} *${weaponB.name}*` : 'with bare hands 👊';
  const armourTextA = armourA ? ` (🛡️ ${armourA.name})` : '';
  const armourTextB = armourB ? ` (🛡️ ${armourB.name})` : '';

  const dmgAtoB_R1 = Math.max(
    10,
    Math.round((totalAtkA * (0.85 + Math.random() * 0.3) - totalDefB * 0.4) * 0.8),
  );
  const dmgBtoA_R1 = Math.max(
    10,
    Math.round((totalAtkB * (0.85 + Math.random() * 0.3) - totalDefA * 0.4) * 0.8),
  );

  hpB = Math.max(0, hpB - dmgAtoB_R1);
  hpA = Math.max(0, hpA - dmgBtoA_R1);

  narrative.push(
    `🥊 *Round 1: Physical Clash!*`,
    `• @${attacker.user_id} attacks ${weaponTextA}${armourTextA} dealing *${dmgAtoB_R1}* damage!`,
    `• @${defender.user_id} retaliates ${weaponTextB}${armourTextB} dealing *${dmgBtoA_R1}* damage!`,
  );

  const rawMagicAtoB = Math.max(
    12,
    Math.round(attacker.magical_power * (0.85 + Math.random() * 0.35)),
  );
  const rawMagicBtoA = Math.max(
    12,
    Math.round(defender.magical_power * (0.85 + Math.random() * 0.35)),
  );
  const magicAtoB = Math.max(5, Math.round(rawMagicAtoB * (1 - magicResistB)));
  const magicBtoA = Math.max(5, Math.round(rawMagicBtoA * (1 - magicResistA)));
  const magicResistTextB =
    magicResistB > 0 ? ` (${armourB?.name} blocked ${Math.round(magicResistB * 100)}%!)` : '';
  const magicResistTextA =
    magicResistA > 0 ? ` (${armourA?.name} blocked ${Math.round(magicResistA * 100)}%!)` : '';

  hpB = Math.max(0, hpB - magicAtoB);
  hpA = Math.max(0, hpA - magicBtoA);

  narrative.push(
    `✨ *Round 2: Special Magic Unleashed!*`,
    `• @${attacker.user_id} casts *[${attacker.magical_power_name}]* dealing *${magicAtoB}* magical damage!${magicResistTextB}`,
    `• @${defender.user_id} casts *[${defender.magical_power_name}]* dealing *${magicBtoA}* magical damage!${magicResistTextA}`,
  );

  let winner;
  let loser;

  if (hpA > 0 && hpB <= 0) {
    winner = attacker;
    loser = defender;
    narrative.push(
      `💥 @${attacker.user_id} lands a decisive blow, knocking out @${defender.user_id}!`,
    );
  } else if (hpB > 0 && hpA <= 0) {
    winner = defender;
    loser = attacker;
    narrative.push(
      `💥 @${defender.user_id} lands a decisive blow, knocking out @${attacker.user_id}!`,
    );
  } else if (hpA > hpB) {
    winner = attacker;
    loser = defender;
    narrative.push(
      `🏆 The dust settles! @${attacker.user_id} stands tall with more remaining health (*${hpA}* HP vs *${hpB}* HP)!`,
    );
  } else if (hpB > hpA) {
    winner = defender;
    loser = attacker;
    narrative.push(
      `🏆 The dust settles! @${defender.user_id} stands tall with more remaining health (*${hpB}* HP vs *${hpA}* HP)!`,
    );
  } else {
    narrative.push(
      `⚖️ Both fighters are locked at identical health! Magical supremacy decides the battle!`,
    );
    if (attacker.magical_power >= defender.magical_power) {
      winner = attacker;
      loser = defender;
      narrative.push(
        `🔮 @${attacker.user_id}'s superior magical power (*${attacker.magical_power}* vs *${defender.magical_power}*) breaks the deadlock!`,
      );
    } else {
      winner = defender;
      loser = attacker;
      narrative.push(
        `🔮 @${defender.user_id}'s superior magical power (*${defender.magical_power}* vs *${attacker.magical_power}*) breaks the deadlock!`,
      );
    }
  }

  let itemWon = null;
  let itemDestroyed = null;

  if (loser && loser.equipped_item) {
    const loserWeapon = getBattleItem(loser.equipped_item);
    if (loserWeapon) {
      const roll = Math.random() * 100;
      if (roll < 15) {
        itemWon = loserWeapon;
        narrative.push(
          `🎁 *SPOILS OF WAR!* @${winner.user_id} disarmed @${loser.user_id} and claimed their ${loserWeapon.emoji} *${loserWeapon.name}*!`,
        );
      } else if (roll < 30) {
        itemDestroyed = loserWeapon;
        narrative.push(
          `💥 *WEAPON SHATTERED!* The impact was so destructive that @${loser.user_id}'s ${loserWeapon.emoji} *${loserWeapon.name}* was destroyed!`,
        );
      }
    }
  }

  return {
    isDraw: false,
    winner,
    loser,
    narrative,
    attackerDmgTotal: dmgAtoB_R1 + magicAtoB,
    defenderDmgTotal: dmgBtoA_R1 + magicBtoA,
    remainingHpA: hpA,
    remainingHpB: hpB,
    itemWon,
    itemDestroyed,
  };
};

export const MIN_TRAINING_COST = 250;

/**
 * Calculates stat gain from a user's training spend.
 * @param {number} currentStat
 * @param {number|boolean} trainingAmount
 */
export const calculateTraining = (currentStat, trainingAmount = MIN_TRAINING_COST) => {
  if (typeof trainingAmount === 'boolean') {
    if (trainingAmount) return { cost: 0, gain: 5, currentStat };

    return {
      cost: Math.round(MIN_TRAINING_COST + currentStat * 3),
      gain: Math.floor(Math.random() * 4) + 2,
      currentStat,
    };
  }

  const cost = Math.max(MIN_TRAINING_COST, Math.floor(trainingAmount));
  const gain = Math.max(1, Math.floor(cost / MIN_TRAINING_COST));

  return { cost, gain, currentStat };
};
