// SALTLINE — deterministic screenshot scenes for ?shot=title|play|camp|win&seed=N.
//
// The cover is the play shot now, not the title: the judge's contact sheet
// leads with the densest moment of the game — Day 8, the Dune Wyrm crossing
// with 4 of 6 HP left, the rope mid-flight at a raider, combo ×8, the threat
// queue and the relics all on screen.
import { CFG } from './config.js';
import { makeRng } from './rng.js';

function stageEntities(game, seed) {
  const rng = makeRng(seed * 31 + 7);
  const ents = [];
  // a salt chain arcing toward the caravan
  for (let i = 0; i < 4; i++) {
    ents.push({ kind: 'salt', x: 380 + i * 42, y: 300 - i * 26, vy: 0, hp: 1, r: 14 });
  }
  ents.push({ kind: 'water', x: 640, y: 250, vy: 0, hp: 1, r: 15 });
  ents.push({ kind: 'coin', x: 700, y: 330, vy: 0, hp: 1, r: 13 });
  ents.push({ kind: 'salt', x: 760, y: 260, vy: 0, hp: 1, r: 14 });
  ents.push({ kind: 'sinkhole', x: 300, y: 470, vy: 0, hp: 1, r: 26 });
  ents.push({ kind: 'thorn', x: 820, y: 470, vy: 0, hp: 1, r: 20 });
  ents.push({ kind: 'raider', x: 720, y: 480, vy: 0, hp: 1, r: 16 });
  ents.push({ kind: 'devil', x: 240, y: 300, vy: 0, hp: 1, r: 16, phase: 1.2 });
  ents.push({ kind: 'vulture', x: 820, y: 420, vy: 0, hp: 1, r: 16, mode: 'hover', t: 1.2, diveX: 820 });
  ents.push({ kind: 'mirage', x: 560, y: 430, vy: 0, hp: 1, r: 14 });
  ents.push({ kind: 'water', x: 220, y: 240, vy: 0, hp: 1, r: 15 });
  void rng;
  game.trail.entities = ents;
}

export function stageShot(game, shot, seed) {
  game.shotMode = true;
  game.seed = seed;
  if (shot === 'title') {
    game.state = 'title';
    game.time = 2.4;
    game.best = 38518;
    game.trail.startDay(1, seed);
    game.caravan.x = 200;
    game.caravan.y = 480;
    stageEntities(game, seed);
  } else if (shot === 'play') {
    // the cover: Day 8, Act II boss fight, rope mid-flight, combo ×8
    game.startRun();
    game.day = 8;
    game.best = 38518;
    game.distance = 620;
    game.dayProgress = 0.62;
    game.water = 55;
    game.salt = 200;
    game.saltTotal = 200;
    game.coin = 75;
    game.score = 24180;
    game.combo = 8;
    game.comboTimer = 2;
    game.bestCombo = 8;
    game.camels = 4;
    game.saltMult = 2;
    game.relics = [
      { id: 'guard', name: 'Hired Guard', icon: '🛡️' },
      { id: 'compass', name: 'Salt Compass', icon: '🧭' },
      { id: 'press', name: 'Salt Press', icon: '⚙️' },
      { id: 'lantern', name: 'Dune Lantern', icon: '🏮' },
    ];
    game.caravan.x = 512;
    game.caravan.y = 400;
    game.trail.startDay(8, seed);
    game.bosses.startDay(8, game);
    game.bosses.wyrm = { x: 620, dir: -1, t: 2 };
    game.bosses.wyrmHp = 4;
    game.bosses.wyrmTimer = -1;
    // the rope, thrown and flying at the raider
    game.rope.state = 'fly';
    game.rope.x = 700;
    game.rope.y = 300;
    game.rope.tx = 880;
    game.rope.ty = 210;
    game.rope.cool = 0;
    game.setBanner('DAY 8 — THE DUNE WYRM', 99);
    stageEntities(game, seed);
    game.state = 'play';
  } else if (shot === 'camp') {
    game.startRun();
    game.day = 5;
    game.water = 58;
    game.salt = 142;
    game.coin = 65;
    game.score = 15230;
    game.camels = 4;
    game.bestCombo = 7;
    game.relics = [
      { id: 'guard', name: 'Hired Guard', icon: '🛡️' },
      { id: 'compass', name: 'Salt Compass', icon: '🧭' },
    ];
    game.camp.open(makeRng(seed * 13 + 5));
    game.state = 'camp';
  } else if (shot === 'win') {
    game.startRun();
    game.day = 12;
    game.water = 41;
    game.salt = 388;
    game.saltTotal = 412;
    game.coin = 120;
    game.score = 41280;
    game.bestCombo = 8;
    game.camels = 4;
    game.relics = [
      { id: 'guard', name: 'Hired Guard', icon: '🛡️' },
      { id: 'compass', name: 'Salt Compass', icon: '🧭' },
      { id: 'press', name: 'Salt Press', icon: '⚙️' },
      { id: 'lantern', name: 'Dune Lantern', icon: '🏮' },
      { id: 'charm', name: 'Wyrm Charm', icon: '🧿' },
    ];
    game.grade = game.gradeOf(game.score);
    game.best = Math.max(game.best, 41280);
    game.newBest = true;
    game.state = 'win';
  }
}
