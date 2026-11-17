// SALTLINE — every tuning number, colour, act and card in one place.
//
// v3 of the caravan game (was SALTROAD): the same twelve-day crossing of the
// White Wastes, but the caravan now carries a rope — throw it to snatch salt
// from afar, hogtie raiders, and wound the bosses. Water is still the clock.
export const CFG = {
  W: 1024,
  H: 576,
  DAYS: 12,
  DAY_LENGTH_S: 30,
  DAY_DISTANCE: 1000,
  // caravan
  CAMEL_START: 3,
  CAMEL_MAX: 6,
  BASE_SPEED: 34, // world units per second scrolled
  SPRINT_MULT: 1.6,
  STEER_SPEED: 430, // px per second, keyboard
  MOUSE_FOLLOW: 9.0, // lerp rate toward the pointer
  // water: the survival clock
  WATER_START: 100,
  WATER_MAX: 100,
  WATER_DRAIN: 1.05, // per second
  WATER_DRAIN_SPRINT: 2.3,
  WATER_SKIN: 18,
  WATER_LOW_WARN: 25,
  // pickups
  SALT_SCORE: 25,
  COMBO_MAX: 8,
  COMBO_WINDOW_S: 2.5,
  COIN_VALUE: 5,
  // the rope: the one physical verb. Click (or F) to throw it at the pointer;
  // it snatches pickups from afar, hogties raiders, and wounds bosses.
  ROPE_RANGE: 280,
  ROPE_FLY_SPEED: 950, // px per second, tip out and back
  ROPE_CATCH_R: 34, // catch radius at the tip
  ROPE_COOLDOWN_S: 1.0,
  ROPE_HOGTIE_SCORE: 150,
  ROPE_HOGTIE_SALT: 5, // salt a hogtied raider drops
  ROPE_BOSS_DAMAGE: 1,
  ROPE_BOSS_SCORE: 100,
  // salt burst: the one active ability. SPACE detonates salt around the
  // caravan and shatters nearby hazards.
  BURST_RADIUS: 150,
  BURST_COOLDOWN_S: 12,
  BURST_SCORE: 25,
  // hazards
  HIT_INVULN_S: 1.6,
  RAIDER_SALT_STEAL: 10,
  // camp trade
  TRADE_SALT_WATER: { salt: 10, water: 15 },
  TRADE_SALT_COIN: { salt: 20, coin: 25 },
  CAMEL_PRICE: 40,
  RELIC_PRICE: 60,
  // bosses
  WYRM_HP: 6,
  WYRM_SCORE: 500,
  ROC_HP: 5,
  ROC_SCORE: 750,
  FLAWLESS_DAY_BONUS: 500,
  // grades (final score); a normal win lands near 41.000, so S is reachable
  GRADE_S: 38000,
  GRADE_A: 26000,
  GRADE_B: 16000,
};

// Three named acts; each has its own sky so the run visibly changes.
export const ACTS = [
  { n: 1, name: 'THE SALT FLATS', firstDay: 1, lastDay: 4, skyTop: '#2b1d3a', skyMid: '#7a3b4f', skyLow: '#e08a4e', accent: '#f5c542' },
  { n: 2, name: 'RAIDER COUNTRY', firstDay: 5, lastDay: 8, skyTop: '#33141f', skyMid: '#8a2f2a', skyLow: '#e0683a', accent: '#ff8a4a' },
  { n: 3, name: 'THE LAST STORM', firstDay: 9, lastDay: 12, skyTop: '#1c1430', skyMid: '#4a2a5e', skyLow: '#8a5a8a', accent: '#b78ae8' },
];

export function actOf(day) {
  return ACTS.find((a) => day >= a.firstDay && day <= a.lastDay) || ACTS[0];
}

export const PAL = {
  skyTop: '#2b1d3a',
  skyMid: '#7a3b4f',
  skyLow: '#e08a4e',
  horizon: '#f2b06a',
  salt: '#f7efdd',
  saltShadow: '#e3d3b3',
  saltCrack: '#b89a6d',
  duneFar: '#c98a56',
  duneNear: '#a86a42',
  trail: '#e9dcc0',
  ink: '#241a12',
  panel: 'rgba(24,14,8,0.82)',
  panelEdge: '#e8b25c',
  gold: '#f5c542',
  teal: '#3ec6b8',
  water: '#4fb3e8',
  danger: '#e84a4a',
  cream: '#fff6e0',
  muted: '#c9b18a',
  rope: '#d8c49a',
};

// Every thing the trail can send down the road, with the threat panel's
// name and icon for each. New in v3: devil, vulture, mirage.
export const ENEMIES = {
  salt: { name: 'Salt chain', icon: '◆', blurb: 'combo food' },
  water: { name: 'Water skin', icon: '💧', blurb: 'drink or die' },
  coin: { name: 'Coin', icon: '¢', blurb: 'spend at camp' },
  sinkhole: { name: 'Sinkhole', icon: '🕳️', blurb: 'swallows a camel' },
  thorn: { name: 'Thornbrush', icon: '🌵', blurb: 'sprint through it to shatter' },
  raider: { name: 'Raider', icon: '⚔️', blurb: 'chases the tail, steals salt' },
  devil: { name: 'Sand Devil', icon: '🌪️', blurb: 'fast, zigzags across the trail' },
  vulture: { name: 'Vulture', icon: '🦅', blurb: 'circles, then dives at you' },
  mirage: { name: 'Mirage', icon: '✨', blurb: 'fake salt — pops the combo' },
  wyrm: { name: 'DUNE WYRM', icon: '🐉', blurb: 'Act II boss — rope its head' },
  roc: { name: 'STORM ROC', icon: '🦅', blurb: 'Act III boss — rope it mid-dive' },
};

// Spawn weights per phase of a day (0 = first third, 1 = middle, 2 = last
// third): early days teach, mid days press, late days pay out water before
// dusk. Weights of 0 mean the kind cannot appear yet (day-gated).
export const SPAWN_TABLE = [
  // phase 0: learn
  [
    ['salt', 0.42], ['water', 0.20], ['coin', 0.10], ['sinkhole', 0.10],
    ['thorn', 0.08], ['raider', 0.06], ['devil', 0.02], ['vulture', 0.01], ['mirage', 0.01],
  ],
  // phase 1: press
  [
    ['salt', 0.30], ['water', 0.16], ['coin', 0.10], ['sinkhole', 0.16],
    ['thorn', 0.10], ['raider', 0.08], ['devil', 0.05], ['vulture', 0.03], ['mirage', 0.02],
  ],
  // phase 2: pay out
  [
    ['salt', 0.28], ['water', 0.28], ['coin', 0.10], ['sinkhole', 0.12],
    ['thorn', 0.08], ['raider', 0.06], ['devil', 0.04], ['vulture', 0.02], ['mirage', 0.02],
  ],
];

// Day-gating for the new enemies: devil from day 3, vulture from day 5,
// mirage from day 2.
export function enemyAllowed(kind, day) {
  if (kind === 'devil') return day >= 3;
  if (kind === 'vulture') return day >= 5;
  if (kind === 'mirage') return day >= 2;
  return true;
}

export const CARD_POOL = [
  { id: 'well', name: 'Deep Well', icon: '💧', rarity: 'common', desc: '+35 water, right now.', apply: (g) => { g.water = Math.min(g.waterMax, g.water + 35); } },
  { id: 'cask', name: 'Water Cask', icon: '🛢️', rarity: 'common', desc: '+25 max water. Stacks to 3.', apply: (g) => { g.waterMax += 25; g.water = Math.min(g.waterMax, g.water + 25); } },
  { id: 'camel', name: 'Stray Camel', icon: '🐪', rarity: 'common', desc: '+1 camel joins the caravan.', apply: (g) => { g.camels = Math.min(CFG.CAMEL_MAX, g.camels + 1); } },
  { id: 'press', name: 'Salt Press', icon: '⚙️', rarity: 'rare', desc: 'Salt scores double from now on.', apply: (g) => { g.saltMult *= 2; } },
  { id: 'hooves', name: 'Swift Hooves', icon: '💨', rarity: 'common', desc: '+12% travel speed. Days end sooner.', apply: (g) => { g.speedMult *= 1.12; } },
  { id: 'guard', name: 'Hired Guard', icon: '🛡️', rarity: 'rare', desc: 'Raiders flee. No more ambushes.', apply: (g) => { g.guard = true; } },
  { id: 'compass', name: 'Salt Compass', icon: '🧭', rarity: 'common', desc: 'Water skins glow and drift toward you.', apply: (g) => { g.compass = true; } },
  { id: 'lantern', name: 'Dune Lantern', icon: '🏮', rarity: 'common', desc: '+1s combo window. Chains last longer.', apply: (g) => { g.comboWindow += 1; } },
  { id: 'pouch', name: 'Coin Pouch', icon: '👛', rarity: 'common', desc: '+30 coin, right now.', apply: (g) => { g.coin += 30; } },
  { id: 'bandage', name: 'Camel Salve', icon: '🩹', rarity: 'common', desc: 'Heal the caravan: +1 camel, +15 water.', apply: (g) => { g.camels = Math.min(CFG.CAMEL_MAX, g.camels + 1); g.water = Math.min(g.waterMax, g.water + 15); } },
  { id: 'charm', name: 'Wyrm Charm', icon: '🧿', rarity: 'rare', desc: 'The Dune Wyrm passes once, then sleeps.', apply: (g) => { g.wyrmCharm = true; } },
  { id: 'sails', name: 'Sand Sails', icon: '⛵', rarity: 'rare', desc: 'Storm gusts push you forward instead of sideways.', apply: (g) => { g.sandSails = true; } },
];

// Relics the camp fire sells for coin (one random unowned, 60 coin). Coins
// finally have a second use besides camels.
export const SHOP_RELICS = [
  { id: 'press', name: 'Salt Press', icon: '⚙️', desc: 'Salt scores double' },
  { id: 'hooves', name: 'Swift Hooves', icon: '💨', desc: '+12% travel speed' },
  { id: 'lantern', name: 'Dune Lantern', icon: '🏮', desc: '+1s combo window' },
];
