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
 * @property {string} [statusEffect] Optional status effect this weapon can inflict
 */

/**
 * @typedef {Object} ArmourItem
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {'armour'} type
 * @property {number} defense
 * @property {number} hp
 * @property {number} magicResist
 * @property {number} dodgeChance
 * @property {number} price
 * @property {number} minLevel
 * @property {string} desc
 */

/**
 * @typedef {Object} AccessoryItem
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {'accessory'} type
 * @property {number} critChance
 * @property {number} critDamage
 * @property {number} xpBoost
 * @property {number} coinBoost
 * @property {number} price
 * @property {number} minLevel
 * @property {string} desc
 */

/**
 * @typedef {Object} Monster
 * @property {string} id
 * @property {string} name
 * @property {string} emoji
 * @property {number} minLevel
 * @property {number} maxLevel
 * @property {number} hp
 * @property {number} attack
 * @property {number} defense
 * @property {number} magical_power
 * @property {string} magical_power_name
 * @property {number} xpReward
 * @property {number} coinMin
 * @property {number} coinMax
 * @property {string[]} lootIds
 * @property {number} lootChance
 * @property {boolean} isBoss
 * @property {string[]} deathLines
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
    statusEffect: 'bleed',
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
    statusEffect: 'stun',
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
    statusEffect: 'bleed',
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
    statusEffect: 'burn',
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
    statusEffect: 'stun',
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
    statusEffect: 'burn',
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
    statusEffect: 'poison',
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
    statusEffect: 'bleed',
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
    dodgeChance: 0,
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
    dodgeChance: 0,
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
    dodgeChance: 0,
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
    dodgeChance: 8,
    price: 5500,
    minLevel: 10,
    desc: '+70 DEF | +60 HP | 10% magic resist | 8% dodge | Absorbs shadows',
  },
  {
    id: 'dragon_scale',
    name: 'Dragon Scale Armour',
    emoji: '🐉',
    type: 'armour',
    defense: 110,
    hp: 100,
    magicResist: 15,
    dodgeChance: 5,
    price: 13000,
    minLevel: 15,
    desc: '+110 DEF | +100 HP | 15% magic resist | 5% dodge | Forged from dragon hide',
  },
  {
    id: 'celestial_plate',
    name: 'Celestial Plate',
    emoji: '✨',
    type: 'armour',
    defense: 175,
    hp: 160,
    magicResist: 20,
    dodgeChance: 5,
    price: 32000,
    minLevel: 25,
    desc: '+175 DEF | +160 HP | 20% magic resist | 5% dodge | Blessed by heavens',
  },
  {
    id: 'aegis_shield',
    name: 'Aegis War Shield',
    emoji: '🔱',
    type: 'armour',
    defense: 260,
    hp: 230,
    magicResist: 28,
    dodgeChance: 3,
    price: 75000,
    minLevel: 35,
    desc: '+260 DEF | +230 HP | 28% magic resist | 3% dodge | Legendary divine aegis',
  },
  {
    id: 'void_armour',
    name: "Reaper's Void Armour",
    emoji: '💀',
    type: 'armour',
    defense: 380,
    hp: 320,
    magicResist: 35,
    dodgeChance: 5,
    price: 160000,
    minLevel: 50,
    desc: '+380 DEF | +320 HP | 35% magic resist | 5% dodge | Forged in the abyss',
  },
  {
    id: 'sonic_shield',
    name: 'Supersonic Force Barrier',
    emoji: '🦔',
    type: 'armour',
    defense: 550,
    hp: 450,
    magicResist: 45,
    dodgeChance: 12,
    price: 320000,
    minLevel: 75,
    desc: '+550 DEF | +450 HP | 45% magic resist | 12% dodge | Vibrates at lightspeed',
  },
];

/** @type {AccessoryItem[]} */
export const ACCESSORY_ITEMS = [
  {
    id: 'iron_ring',
    name: 'Iron Ring',
    emoji: '💍',
    type: 'accessory',
    critChance: 3,
    critDamage: 15,
    xpBoost: 0,
    coinBoost: 0,
    price: 600,
    minLevel: 1,
    desc: '+3% Crit | +15% Crit Dmg | A solid ring carved from iron',
  },
  {
    id: 'swift_pendant',
    name: 'Swift Pendant',
    emoji: '🔮',
    type: 'accessory',
    critChance: 5,
    critDamage: 10,
    xpBoost: 5,
    coinBoost: 0,
    price: 1800,
    minLevel: 3,
    desc: '+5% Crit | +5% XP | Pendant of a nimble hero',
  },
  {
    id: 'battle_amulet',
    name: 'Battle Amulet',
    emoji: '📿',
    type: 'accessory',
    critChance: 8,
    critDamage: 20,
    xpBoost: 0,
    coinBoost: 5,
    price: 4500,
    minLevel: 5,
    desc: '+8% Crit | +20% Crit Dmg | +5% Coins | Forged in battle fury',
  },
  {
    id: 'shadow_ring',
    name: 'Shadow Assassin Ring',
    emoji: '🖤',
    type: 'accessory',
    critChance: 12,
    critDamage: 30,
    xpBoost: 0,
    coinBoost: 0,
    price: 10000,
    minLevel: 10,
    desc: '+12% Crit | +30% Crit Dmg | Ring of a silent killer',
  },
  {
    id: 'dragon_talisman',
    name: 'Dragon Talisman',
    emoji: '🐉',
    type: 'accessory',
    critChance: 10,
    critDamage: 25,
    xpBoost: 10,
    coinBoost: 10,
    price: 25000,
    minLevel: 15,
    desc: '+10% Crit | +10% XP | +10% Coins | Imbued with dragon essence',
  },
  {
    id: 'thunder_charm',
    name: 'Thunder God Charm',
    emoji: '⚡',
    type: 'accessory',
    critChance: 15,
    critDamage: 35,
    xpBoost: 5,
    coinBoost: 5,
    price: 60000,
    minLevel: 25,
    desc: '+15% Crit | +35% Crit Dmg | Channelled from Thor himself',
  },
  {
    id: 'holy_relic',
    name: 'Holy Divine Relic',
    emoji: '✨',
    type: 'accessory',
    critChance: 18,
    critDamage: 40,
    xpBoost: 15,
    coinBoost: 0,
    price: 130000,
    minLevel: 35,
    desc: '+18% Crit | +40% Crit Dmg | +15% XP | Blessed by ancient gods',
  },
  {
    id: 'void_gem',
    name: "Reaper's Void Gem",
    emoji: '💀',
    type: 'accessory',
    critChance: 22,
    critDamage: 50,
    xpBoost: 10,
    coinBoost: 15,
    price: 280000,
    minLevel: 50,
    desc: '+22% Crit | +50% Crit Dmg | +15% Coins | Crystallised from the void',
  },
  {
    id: 'sonic_emerald',
    name: 'Chaos Emerald',
    emoji: '🦔',
    type: 'accessory',
    critChance: 30,
    critDamage: 75,
    xpBoost: 20,
    coinBoost: 20,
    price: 600000,
    minLevel: 75,
    desc: '+30% Crit | +75% Crit Dmg | +20% XP & Coins | One of the 7 Chaos Emeralds',
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
 * @typedef {Object} CharacterClass
 * @property {string} name
 * @property {string} emoji
 * @property {string} desc
 * @property {number} atkMult
 * @property {number} defMult
 * @property {number} magMult
 * @property {number} hpBonus
 * @property {number} startingCritChance
 */

/**
 * Character classes with stat growth multipliers per level-up.
 * @type {Record<string, CharacterClass>}
 */
export const CHARACTER_CLASSES = {
  warrior: {
    name: 'Warrior',
    emoji: '⚔️',
    desc: 'Masters of physical combat highest ATK/DEF growth, bonus HP per level',
    atkMult: 1.4,
    defMult: 1.3,
    magMult: 0.8,
    hpBonus: 10,
    startingCritChance: 5,
  },
  mage: {
    name: 'Mage',
    emoji: '🔮',
    desc: 'Arcane spell-weavers highest magical power, bonus XP from all sources',
    atkMult: 0.8,
    defMult: 0.9,
    magMult: 1.6,
    hpBonus: 0,
    startingCritChance: 8,
  },
  rogue: {
    name: 'Rogue',
    emoji: '🗡️',
    desc: 'Swift assassins highest crit chance, bonus coin drops from all battles',
    atkMult: 1.2,
    defMult: 1.0,
    magMult: 1.0,
    hpBonus: 5,
    startingCritChance: 12,
  },
};

/** @type {Monster[]} */
export const MONSTERS = [
  {
    id: 'slime',
    name: 'Giant Slime',
    emoji: '🟩',
    minLevel: 1,
    maxLevel: 5,
    hp: 120,
    attack: 25,
    defense: 10,
    magical_power: 15,
    magical_power_name: 'Acid Splash',
    xpReward: 40,
    coinMin: 80,
    coinMax: 150,
    lootIds: [],
    lootChance: 0,
    isBoss: false,
    deathLines: ['The slime dissolves into a puddle!', 'With a wet splat, the slime is defeated!'],
  },
  {
    id: 'goblin',
    name: 'Goblin Raider',
    emoji: '👺',
    minLevel: 3,
    maxLevel: 10,
    hp: 200,
    attack: 45,
    defense: 20,
    magical_power: 25,
    magical_power_name: 'Poison Dart',
    xpReward: 70,
    coinMin: 150,
    coinMax: 280,
    lootIds: ['wooden_sword', 'iron_dagger'],
    lootChance: 8,
    isBoss: false,
    deathLines: [
      'The goblin shrieks and crumbles to dust!',
      'Victory! The goblin drops its stolen goods!',
    ],
  },
  {
    id: 'skeleton',
    name: 'Undead Skeleton',
    emoji: '💀',
    minLevel: 5,
    maxLevel: 15,
    hp: 320,
    attack: 70,
    defense: 35,
    magical_power: 50,
    magical_power_name: 'Soul Drain',
    xpReward: 110,
    coinMin: 250,
    coinMax: 450,
    lootIds: ['iron_plate', 'chain_mail'],
    lootChance: 10,
    isBoss: false,
    deathLines: [
      'The skeleton collapses into a pile of bones!',
      'Bones shatter everywhere as the skeleton falls!',
    ],
  },
  {
    id: 'orc',
    name: 'Orc Warchief',
    emoji: '👹',
    minLevel: 10,
    maxLevel: 20,
    hp: 500,
    attack: 110,
    defense: 55,
    magical_power: 60,
    magical_power_name: 'Warcry Slam',
    xpReward: 160,
    coinMin: 400,
    coinMax: 700,
    lootIds: ['battle_axe', 'shadow_cloak'],
    lootChance: 12,
    isBoss: false,
    deathLines: [
      'The orc lets out a final battle cry and falls!',
      'Defeated! The warchief was no match for you.',
    ],
  },
  {
    id: 'troll',
    name: 'Mountain Troll',
    emoji: '🧌',
    minLevel: 15,
    maxLevel: 30,
    hp: 800,
    attack: 170,
    defense: 85,
    magical_power: 70,
    magical_power_name: 'Boulder Throw',
    xpReward: 230,
    coinMin: 650,
    coinMax: 1100,
    lootIds: ['shadow_blade', 'dragon_scale'],
    lootChance: 12,
    isBoss: false,
    deathLines: [
      'The troll stumbles and crashes to the ground!',
      'Mountain shakes as the troll finally collapses!',
    ],
  },
  {
    id: 'vampire',
    name: 'Ancient Vampire',
    emoji: '🧛',
    minLevel: 25,
    maxLevel: 45,
    hp: 1200,
    attack: 260,
    defense: 130,
    magical_power: 200,
    magical_power_name: 'Blood Drain',
    xpReward: 340,
    coinMin: 1000,
    coinMax: 1800,
    lootIds: ['mjolnir_hammer', 'celestial_plate'],
    lootChance: 10,
    isBoss: false,
    deathLines: [
      'The vampire turns to ash as sunlight breaks through!',
      'Hissing its last, the vampire dissolves!',
    ],
  },
  {
    id: 'demon',
    name: 'Chaos Demon',
    emoji: '😈',
    minLevel: 40,
    maxLevel: 65,
    hp: 2000,
    attack: 400,
    defense: 200,
    magical_power: 350,
    magical_power_name: 'Hellfire Burst',
    xpReward: 520,
    coinMin: 1800,
    coinMax: 3000,
    lootIds: ['excalibur', 'aegis_shield'],
    lootChance: 10,
    isBoss: false,
    deathLines: [
      'The demon lets out a blood-curdling scream and vanishes!',
      'Chaos retreats as the demon is banished!',
    ],
  },
  {
    id: 'dark_knight',
    name: 'Dark Knight',
    emoji: '🦹',
    minLevel: 55,
    maxLevel: 80,
    hp: 3200,
    attack: 620,
    defense: 310,
    magical_power: 480,
    magical_power_name: 'Shadow Obliteration',
    xpReward: 750,
    coinMin: 3000,
    coinMax: 5000,
    lootIds: ['chaos_scythe', 'void_armour'],
    lootChance: 12,
    isBoss: false,
    deathLines: [
      'The dark knight crumbles as darkness lifts!',
      'Your light pierces the darkness the knight falls!',
    ],
  },
];

/** @type {Monster[]} */
export const BOSSES = [
  {
    id: 'dr_eggman',
    name: 'Dr. Eggman',
    emoji: '🥚',
    minLevel: 5,
    maxLevel: 999,
    hp: 600,
    attack: 90,
    defense: 50,
    magical_power: 80,
    magical_power_name: 'Eggbot Barrage',
    xpReward: 250,
    coinMin: 500,
    coinMax: 900,
    lootIds: ['iron_dagger', 'chain_mail', 'swift_pendant'],
    lootChance: 20,
    isBoss: true,
    deathLines: [
      '🥚 "I\'ll get you next time, Sonic!" Dr. Eggman retreats in his Egg Mobile!',
      '🥚 The Eggbot explodes in a shower of gears Eggman flees!',
    ],
  },
  {
    id: 'shadow_phoenix',
    name: 'Shadow Phoenix',
    emoji: '🔥',
    minLevel: 15,
    maxLevel: 999,
    hp: 1800,
    attack: 280,
    defense: 140,
    magical_power: 300,
    magical_power_name: 'Inferno Rebirth',
    xpReward: 650,
    coinMin: 1500,
    coinMax: 2500,
    lootIds: ['dragon_katana', 'dragon_scale', 'dragon_talisman'],
    lootChance: 18,
    isBoss: true,
    deathLines: [
      '🔥 The phoenix shrieks as its flames extinguish forever!',
      '🔥 A final blazing explosion the phoenix has been vanquished!',
    ],
  },
  {
    id: 'chaos_overlord',
    name: 'Chaos Overlord',
    emoji: '🌀',
    minLevel: 30,
    maxLevel: 999,
    hp: 4500,
    attack: 550,
    defense: 280,
    magical_power: 600,
    magical_power_name: 'Chaos Control',
    xpReward: 1400,
    coinMin: 4000,
    coinMax: 7000,
    lootIds: ['excalibur', 'aegis_shield', 'holy_relic'],
    lootChance: 15,
    isBoss: true,
    deathLines: [
      '🌀 Reality stabilises as the Chaos Overlord is destroyed!',
      "🌀 The overlord's power fractures chaos recoils into the void!",
    ],
  },
  {
    id: 'void_reaper',
    name: 'Void Reaper',
    emoji: '☠️',
    minLevel: 50,
    maxLevel: 999,
    hp: 9000,
    attack: 900,
    defense: 450,
    magical_power: 1000,
    magical_power_name: 'Soul Annihilation',
    xpReward: 3000,
    coinMin: 10000,
    coinMax: 18000,
    lootIds: ['chaos_scythe', 'void_armour', 'void_gem'],
    lootChance: 12,
    isBoss: true,
    deathLines: [
      '☠️ The Void Reaper dissolves into nothingness the void is silent!',
      'Death itself trembles as the Reaper is vanquished!',
    ],
  },
  {
    id: 'super_sonic',
    name: 'Super Sonic (Dark Form)',
    emoji: '🦔',
    minLevel: 75,
    maxLevel: 999,
    hp: 20000,
    attack: 1500,
    defense: 800,
    magical_power: 1800,
    magical_power_name: 'Super Sonic Annihilation',
    xpReward: 7500,
    coinMin: 25000,
    coinMax: 50000,
    lootIds: ['sonic_blades', 'sonic_shield', 'sonic_emerald'],
    lootChance: 10,
    isBoss: true,
    deathLines: [
      '🦔 Super Sonic reverts the Chaos Emeralds shatter and scatter!',
      'Gotta go fast... to the afterlife! Super Sonic is defeated!',
    ],
  },
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

/** @param {string} query @returns {BattleItem | undefined} */
export const getBattleItem = (query) => {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return BATTLE_ITEMS.find((item) => item.id.toLowerCase() === q || item.name.toLowerCase() === q);
};

/** @param {string} query @returns {ArmourItem | undefined} */
export const getArmourItem = (query) => {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return ARMOUR_ITEMS.find(
    (item) => item.id.toLowerCase() === q || item.name.toLowerCase().includes(q),
  );
};

/** @param {string} query @returns {AccessoryItem | undefined} */
export const getAccessoryItem = (query) => {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return ACCESSORY_ITEMS.find(
    (item) => item.id.toLowerCase() === q || item.name.toLowerCase().includes(q),
  );
};

/** @param {string} id @returns {Monster | undefined} */
export const getMonster = (id) => MONSTERS.find((m) => m.id === id);

/** @param {string} id @returns {Monster | undefined} */
export const getBoss = (id) => BOSSES.find((b) => b.id === id);

/**
 * @param {number} playerLevel
 * @returns {Monster}
 */
export const pickMonsterForLevel = (playerLevel) => {
  const eligible = MONSTERS.filter(
    (m) => playerLevel >= m.minLevel && playerLevel <= m.maxLevel + 5,
  );
  const fallback = /** @type {Monster} */ (MONSTERS[0]);
  if (!eligible.length) {
    return /** @type {Monster} */ (MONSTERS[MONSTERS.length - 1] || fallback);
  }
  const picked = eligible[Math.floor(Math.random() * eligible.length)];
  return /** @type {Monster} */ (picked || fallback);
};

/**
 * @param {number} playerLevel
 * @returns {Monster}
 */
export const pickBossForLevel = (playerLevel) => {
  const eligible = BOSSES.filter((b) => playerLevel >= b.minLevel);
  const fallback = /** @type {Monster} */ (BOSSES[0]);
  if (!eligible.length) return fallback;
  const picked = eligible[Math.floor(Math.random() * eligible.length)];
  return /** @type {Monster} */ (picked || fallback);
};

export const generateRandomStartingStats = () => {
  const attack = Math.floor(Math.random() * 31) + 40;
  const defense = Math.floor(Math.random() * 31) + 35;
  const magical_power = Math.floor(Math.random() * 31) + 45;
  const powerIndex = Math.floor(Math.random() * MAGICAL_POWERS.length);
  const magical_power_name = MAGICAL_POWERS[powerIndex] || 'Chaos Surge';
  return { attack, defense, magical_power, magical_power_name };
};

/**
 * Resolves character stats with godmode if user is in OWNER_NUMBER.
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

/** @param {any} character @param {AccessoryItem|undefined} accessory @returns {number} */
const getEffectiveCritChance = (character, accessory) => {
  const classData = character.character_class ? CHARACTER_CLASSES[character.character_class] : null;
  const baseCrit = classData?.startingCritChance ?? 5;
  return Math.min(60, baseCrit + (accessory?.critChance ?? 0));
};

/** @param {any} character @param {AccessoryItem|undefined} accessory @returns {number} */
const getEffectiveCritMult = (character, accessory) => {
  void character;
  return 1.5 + (accessory?.critDamage ?? 0) / 100;
};

/** @param {number} critChance @returns {boolean} */
const rollCrit = (critChance) => Math.random() * 100 < critChance;

/** @param {number} dodgeChance @returns {boolean} */
const rollDodge = (dodgeChance) => Math.random() * 100 < dodgeChance;

/** @param {string|undefined} statusEffect @returns {boolean} */
const rollStatusProc = (statusEffect) => !!statusEffect && Math.random() < 0.25;

/** @param {string} [effect] @returns {string} */
const statusEmoji = (effect) => {
  if (!effect) return '⚠️';
  /** @type {Record<string, string>} */
  const emojis = { bleed: '🩸', burn: '🔥', poison: '☠️', stun: '⚡' };
  return emojis[effect] || '⚠️';
};

/** @param {string} effect @param {number} baseDamage @returns {number} */
const statusDotDamage = (effect, baseDamage) => {
  /** @type {Record<string, number>} */
  const rates = { bleed: 0.15, burn: 0.12, poison: 0.1, stun: 0 };
  return Math.max(5, Math.round(baseDamage * (rates[effect] || 0.1)));
};

/**
 * Simulates an enhanced clash between two characters.
 * Features: crits, dodge, status effects, dynamic multi-round combat.
 * @param {any} attacker
 * @param {any} defender
 * @returns {any}
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
  const accessoryA = getAccessoryItem(attacker.equipped_accessory);
  const accessoryB = getAccessoryItem(defender.equipped_accessory);

  const totalAtkA = attacker.attack + (weaponA?.attack || 0);
  const totalDefA = attacker.defense + (weaponA?.defense || 0) + (armourA?.defense || 0);
  const magicResistA = (armourA?.magicResist || 0) / 100;
  const dodgeA = armourA?.dodgeChance || 0;

  const totalAtkB = defender.attack + (weaponB?.attack || 0);
  const totalDefB = defender.defense + (weaponB?.defense || 0) + (armourB?.defense || 0);
  const magicResistB = (armourB?.magicResist || 0) / 100;
  const dodgeB = armourB?.dodgeChance || 0;

  const critChanceA = getEffectiveCritChance(attacker, accessoryA);
  const critMultA = getEffectiveCritMult(attacker, accessoryA);
  const critChanceB = getEffectiveCritChance(defender, accessoryB);
  const critMultB = getEffectiveCritMult(defender, accessoryB);

  let hpA = attacker.max_hp + (armourA?.hp || 0);
  let hpB = defender.max_hp + (armourB?.hp || 0);

  const narrative = [];
  const weaponTextA = weaponA ? `with ${weaponA.emoji} *${weaponA.name}*` : 'with bare hands 👊';
  const weaponTextB = weaponB ? `with ${weaponB.emoji} *${weaponB.name}*` : 'with bare hands 👊';
  const armourTextA = armourA ? ` (🛡️ ${armourA.name})` : '';
  const armourTextB = armourB ? ` (🛡️ ${armourB.name})` : '';

  let totalDmgAtoB = 0;
  let totalDmgBtoA = 0;
  let statusOnA = null;
  let statusOnB = null;
  let stunA = false;
  let stunB = false;

  const MAX_ROUNDS = 5;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    if (hpA <= 0 || hpB <= 0) break;

    if (statusOnB && statusOnB !== 'stun') {
      const dot = statusDotDamage(statusOnB, Math.round(totalAtkA * 0.3));
      hpB = Math.max(0, hpB - dot);
      narrative.push(
        `${statusEmoji(statusOnB)} *${statusOnB.toUpperCase()}* deals *${dot}* damage to @${defender.user_id}!`,
      );
    }
    if (statusOnA && statusOnA !== 'stun') {
      const dot = statusDotDamage(statusOnA, Math.round(totalAtkB * 0.3));
      hpA = Math.max(0, hpA - dot);
      narrative.push(
        `${statusEmoji(statusOnA)} *${statusOnA.toUpperCase()}* deals *${dot}* damage to @${attacker.user_id}!`,
      );
    }
    if (hpA <= 0 || hpB <= 0) break;

    if (round === 3) {
      const rawMagicAtoB = Math.max(
        12,
        Math.round(attacker.magical_power * (0.85 + Math.random() * 0.35)),
      );
      const rawMagicBtoA = Math.max(
        12,
        Math.round(defender.magical_power * (0.85 + Math.random() * 0.35)),
      );
      const isCritMagA = rollCrit(critChanceA);
      const isCritMagB = rollCrit(critChanceB);
      let magicAtoB = Math.max(5, Math.round(rawMagicAtoB * (1 - magicResistB)));
      let magicBtoA = Math.max(5, Math.round(rawMagicBtoA * (1 - magicResistA)));
      if (isCritMagA) magicAtoB = Math.round(magicAtoB * critMultA);
      if (isCritMagB) magicBtoA = Math.round(magicBtoA * critMultB);
      const magResTextB =
        magicResistB > 0 ? ` (${armourB?.name} blocked ${Math.round(magicResistB * 100)}%!)` : '';
      const magResTextA =
        magicResistA > 0 ? ` (${armourA?.name} blocked ${Math.round(magicResistA * 100)}%!)` : '';
      hpB = Math.max(0, hpB - magicAtoB);
      hpA = Math.max(0, hpA - magicBtoA);
      totalDmgAtoB += magicAtoB;
      totalDmgBtoA += magicBtoA;
      narrative.push(
        `✨ *Round ${round}: Special Magic Unleashed!*`,
        `• @${attacker.user_id} casts *[${attacker.magical_power_name}]* dealing *${magicAtoB}* magical damage!${magResTextB}${isCritMagA ? ' ⚡ *CRITICAL SPELL!*' : ''}`,
        `• @${defender.user_id} casts *[${defender.magical_power_name}]* dealing *${magicBtoA}* magical damage!${magResTextA}${isCritMagB ? ' ⚡ *CRITICAL SPELL!*' : ''}`,
      );
    } else {
      const label =
        round <= 2
          ? `Round ${round}: Physical ${round === 1 ? 'Clash' : 'Exchange'}`
          : `Round ${round}: Continued Combat`;
      narrative.push(`🥊 *${label}!*`);

      if (!stunA) {
        if (rollDodge(dodgeB)) {
          narrative.push(`• @${defender.user_id} *DODGED* ${weaponTextA}! *(0 damage)*`);
        } else {
          let rawDmg = Math.max(
            10,
            Math.round((totalAtkA * (0.85 + Math.random() * 0.3) - totalDefB * 0.4) * 0.8),
          );
          const isCrit = rollCrit(critChanceA);
          if (isCrit) rawDmg = Math.round(rawDmg * critMultA);
          hpB = Math.max(0, hpB - rawDmg);
          totalDmgAtoB += rawDmg;
          narrative.push(
            `• @${attacker.user_id} attacks ${weaponTextA}${armourTextA} dealing *${rawDmg}* damage!${isCrit ? ' ⚡ *CRITICAL HIT!*' : ''}`,
          );
          if (!statusOnB && weaponA?.statusEffect && rollStatusProc(weaponA.statusEffect)) {
            statusOnB = weaponA.statusEffect;
            if (statusOnB === 'stun') {
              stunB = true;
              narrative.push(`${statusEmoji('stun')} @${defender.user_id} is *STUNNED*!`);
            } else {
              narrative.push(
                `${statusEmoji(statusOnB)} @${defender.user_id} is inflicted with *${statusOnB.toUpperCase()}*!`,
              );
            }
          }
        }
      } else {
        stunA = false;
        narrative.push(`• @${attacker.user_id} is *STUNNED* and cannot attack this round!`);
      }
      if (hpB <= 0) break;

      if (!stunB) {
        if (rollDodge(dodgeA)) {
          narrative.push(`• @${attacker.user_id} *DODGED* ${weaponTextB}! *(0 damage)*`);
        } else {
          let rawDmg = Math.max(
            10,
            Math.round((totalAtkB * (0.85 + Math.random() * 0.3) - totalDefA * 0.4) * 0.8),
          );
          const isCrit = rollCrit(critChanceB);
          if (isCrit) rawDmg = Math.round(rawDmg * critMultB);
          hpA = Math.max(0, hpA - rawDmg);
          totalDmgBtoA += rawDmg;
          narrative.push(
            `• @${defender.user_id} retaliates ${weaponTextB}${armourTextB} dealing *${rawDmg}* damage!${isCrit ? ' ⚡ *CRITICAL HIT!*' : ''}`,
          );
          if (!statusOnA && weaponB?.statusEffect && rollStatusProc(weaponB.statusEffect)) {
            statusOnA = weaponB.statusEffect;
            if (statusOnA === 'stun') {
              stunA = true;
              narrative.push(`${statusEmoji('stun')} @${attacker.user_id} is *STUNNED*!`);
            } else {
              narrative.push(
                `${statusEmoji(statusOnA)} @${attacker.user_id} is inflicted with *${statusOnA.toUpperCase()}*!`,
              );
            }
          }
        }
      } else {
        stunB = false;
        narrative.push(`• @${defender.user_id} is *STUNNED* and cannot retaliate!`);
      }
    }
  }

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
    attackerDmgTotal: totalDmgAtoB,
    defenderDmgTotal: totalDmgBtoA,
    remainingHpA: hpA,
    remainingHpB: hpB,
    itemWon,
    itemDestroyed,
  };
};

/**
 * Simulates PvE combat between a character and a monster/boss.
 * @param {any} character
 * @param {Monster} monster
 * @returns {any}
 */
export const simulateMonsterCombat = (character, monster) => {
  const weapon = getBattleItem(character.equipped_item);
  const armour = getArmourItem(character.equipped_armour);
  const accessory = getAccessoryItem(character.equipped_accessory);

  const totalAtk = character.attack + (weapon?.attack || 0);
  const totalDef = character.defense + (weapon?.defense || 0) + (armour?.defense || 0);
  const magicResist = (armour?.magicResist || 0) / 100;
  const dodgeChance = armour?.dodgeChance || 0;
  const critChance = getEffectiveCritChance(character, accessory);
  const critMult = getEffectiveCritMult(character, accessory);

  let playerHp = character.max_hp + (armour?.hp || 0);
  let monsterHp = monster.hp;

  const narrative = [];
  const weaponText = weapon ? `${weapon.emoji} *${weapon.name}*` : 'bare hands 👊';
  const armourText = armour ? ` (🛡️ ${armour.name})` : '';

  narrative.push(
    `${monster.emoji} *A wild ${monster.name} appears!*`,
    `❤️ Monster HP: *${monster.hp}* | ATK: *${monster.attack}* | Magic: *${monster.magical_power}*`,
    `---`,
  );

  let totalPlayerDmg = 0;
  let totalMonsterDmg = 0;
  let statusOnPlayer = null;

  for (let round = 1; round <= 6; round++) {
    if (playerHp <= 0 || monsterHp <= 0) break;

    if (statusOnPlayer && statusOnPlayer !== 'stun') {
      const dot = statusDotDamage(statusOnPlayer, Math.round(monster.attack * 0.3));
      playerHp = Math.max(0, playerHp - dot);
      narrative.push(
        `${statusEmoji(statusOnPlayer)} *${statusOnPlayer.toUpperCase()}* deals *${dot}* damage to you!`,
      );
      if (playerHp <= 0) break;
    }

    narrative.push(`⚔️ *Round ${round}*`);

    let rawPlayerDmg = Math.max(
      10,
      Math.round((totalAtk * (0.85 + Math.random() * 0.35) - monster.defense * 0.4) * 0.85),
    );
    const isCrit = rollCrit(critChance);
    if (isCrit) rawPlayerDmg = Math.round(rawPlayerDmg * critMult);
    monsterHp = Math.max(0, monsterHp - rawPlayerDmg);
    totalPlayerDmg += rawPlayerDmg;
    narrative.push(
      `• You attack with ${weaponText}${armourText} for *${rawPlayerDmg}* damage!${isCrit ? ' ⚡ *CRITICAL!*' : ''}`,
    );
    if (weapon?.statusEffect && rollStatusProc(weapon.statusEffect)) {
      narrative.push(
        `${statusEmoji(weapon.statusEffect)} *${weapon.statusEffect.toUpperCase()}* strikes the ${monster.name}!`,
      );
    }
    if (monsterHp <= 0) break;

    if (Math.random() * 100 < dodgeChance / 2) {
      narrative.push(`• ${monster.emoji} ${monster.name} attacks   you *DODGE* it! (0 damage)`);
    } else {
      const rawMonsterPhys = Math.max(
        8,
        Math.round((monster.attack * (0.85 + Math.random() * 0.3) - totalDef * 0.4) * 0.8),
      );
      playerHp = Math.max(0, playerHp - rawMonsterPhys);
      totalMonsterDmg += rawMonsterPhys;
      narrative.push(
        `• ${monster.emoji} ${monster.name} strikes you for *${rawMonsterPhys}* damage!`,
      );

      if (round % 2 === 0) {
        const rawMonsterMagic = Math.max(
          8,
          Math.round(monster.magical_power * (0.8 + Math.random() * 0.4) * (1 - magicResist)),
        );
        const magResText = magicResist > 0 ? ` (${Math.round(magicResist * 100)}% resisted)` : '';
        playerHp = Math.max(0, playerHp - rawMonsterMagic);
        totalMonsterDmg += rawMonsterMagic;
        narrative.push(
          `• ${monster.emoji} *[${monster.magical_power_name}]* hits for *${rawMonsterMagic}* magic damage!${magResText}`,
        );
      }

      if (!statusOnPlayer && Math.random() < 0.15) {
        const effects = ['bleed', 'burn', 'poison'];
        const chosen = effects[Math.floor(Math.random() * effects.length)] || 'bleed';
        statusOnPlayer = chosen;
        narrative.push(
          `${statusEmoji(chosen)} ${monster.name} inflicts *${chosen.toUpperCase()}*!`,
        );
      }
    }
  }

  const playerWon = playerHp > 0 && monsterHp <= 0;
  const monsterWon = monsterHp > 0 && playerHp <= 0;

  if (playerWon) {
    const deathLine = monster.deathLines[Math.floor(Math.random() * monster.deathLines.length)];
    narrative.push(`\n🏆 *VICTORY!*\n${deathLine}`);
  } else if (monsterWon) {
    narrative.push(
      `\n💀 *DEFEATED!*\nThe ${monster.name} overwhelms you! You flee with your life...`,
    );
  } else {
    narrative.push(`\n⚖️ *ESCAPED!* Both sides took heavy losses. The ${monster.name} retreats!`);
  }

  let lootItem = null;
  if (playerWon && monster.lootIds.length > 0) {
    for (const lootId of monster.lootIds) {
      if (Math.random() * 100 < monster.lootChance) {
        const found = getBattleItem(lootId) || getArmourItem(lootId) || getAccessoryItem(lootId);
        if (found) {
          lootItem = found;
          narrative.push(`🎁 *LOOT DROP!* You found a ${lootItem.emoji} *${lootItem.name}*!`);
          break;
        }
      }
    }
  }

  return {
    playerWon,
    monsterWon,
    isDraw: !playerWon && !monsterWon,
    narrative,
    totalPlayerDmg,
    totalMonsterDmg,
    remainingPlayerHp: playerHp,
    remainingMonsterHp: monsterHp,
    lootItem,
    monster,
  };
};

/**
 * Returns the level gap penalty factor for fight rewards.
 * @param {number} attackerLevel
 * @param {number} defenderLevel
 * @returns {{ factor: number, blocked: boolean, reason: string }}
 */
export const getLevelGapPenalty = (attackerLevel, defenderLevel) => {
  const gap = attackerLevel - defenderLevel;
  if (gap >= 25)
    return {
      factor: 0,
      blocked: true,
      reason: `🚫 Level gap too large! You are *${gap} levels* above your target. Challenge someone closer to your level for rewards.`,
    };
  if (gap >= 15)
    return {
      factor: 0.25,
      blocked: false,
      reason: `⚠️ Farming penalty applied *75% reduced rewards* (level gap: ${gap}).`,
    };
  if (gap >= 10)
    return {
      factor: 0.5,
      blocked: false,
      reason: `⚠️ Reduced rewards *50% penalty* for fighting a much lower-level opponent (gap: ${gap}).`,
    };
  return { factor: 1.0, blocked: false, reason: '' };
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

/**
 * Applies class-based growth multipliers to level-up stat gains.
 * @param {string|null} characterClass
 * @param {{ atkGain: number, defGain: number, magGain: number }} baseGains
 * @returns {{ atkGain: number, defGain: number, magGain: number, hpBonus: number }}
 */
export const applyClassGrowth = (characterClass, baseGains) => {
  const cls = characterClass ? CHARACTER_CLASSES[characterClass] : null;
  if (!cls) return { ...baseGains, hpBonus: 0 };
  return {
    atkGain: Math.round(baseGains.atkGain * cls.atkMult),
    defGain: Math.round(baseGains.defGain * cls.defMult),
    magGain: Math.round(baseGains.magGain * cls.magMult),
    hpBonus: cls.hpBonus,
  };
};
