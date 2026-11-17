// SALTLINE — the trail: seeded per-day spawns of pickups, hazards and events.
//
// v3: spawns are no longer a surprise. The trail pre-rolls a threat queue —
// the next few things coming down the road, with an ETA for each — so the
// player can plan the rope and the burst instead of reacting blind. Spawns
// also run in waves now: each day teaches, presses, then pays out water
// before dusk. Three new enemies join the road: the zigzagging Sand Devil,
// the circling-then-diving Vulture, and the Mirage, a fake salt crystal.
import { CFG, ENEMIES, SPAWN_TABLE, enemyAllowed } from './config.js';
import { makeRng } from './rng.js';

export class Trail {
  constructor() {
    this.entities = [];
    this.queue = []; // pre-rolled {kind, eta} — what is coming, and when
    this.gust = 0; // current sideways wind force (-1..1)
    this.gustTimer = 0;
    this.day = 1;
    this.rng = makeRng(1);
  }
  startDay(day, seed) {
    this.day = day;
    this.rng = makeRng(seed * 1000 + day * 77);
    this.entities = [];
    this.gust = 0;
    this.gustTimer = 2;
    // pre-roll the first five arrivals; the queue refills as it is eaten
    this.queue = [];
    let eta = 0.4;
    for (let i = 0; i < 5; i++) {
      this.queue.push({ kind: this.rollKind(), eta });
      eta += this.rollInterval();
    }
  }
  difficulty() {
    return 1 + (this.day - 1) * 0.09;
  }
  rollInterval() {
    return Math.max(0.32, 0.95 - this.day * 0.045) * this.rng.range(0.8, 1.25);
  }
  // Pick a spawn kind from the wave table of the current phase of the day.
  rollKind(game) {
    const prog = game ? game.dayProgress : 0;
    const phase = prog < 0.33 ? 0 : prog < 0.66 ? 1 : 2;
    const table = SPAWN_TABLE[phase];
    let total = 0;
    for (const [kind, w] of table) if (enemyAllowed(kind, this.day)) total += w;
    let roll = this.rng.next() * total;
    for (const [kind, w] of table) {
      if (!enemyAllowed(kind, this.day)) continue;
      roll -= w;
      if (roll <= 0) return kind;
    }
    return 'salt';
  }
  // What the threat panel shows: the next arrivals, soonest first, plus the
  // boss timers when a boss day is running.
  threats(game) {
    const list = this.queue.slice(0, 4)
      .filter((q) => ENEMIES[q.kind])
      .map((q) => ({
      icon: ENEMIES[q.kind].icon,
      name: ENEMIES[q.kind].name,
      blurb: ENEMIES[q.kind].blurb,
      eta: Math.max(0, q.eta),
    }));
    const b = game.bosses;
    if (b) {
      if (b.wyrmActive && !b.wyrmDefeated && b.wyrmTimer > 0) {
        list.push({ icon: ENEMIES.wyrm.icon, name: ENEMIES.wyrm.name, blurb: ENEMIES.wyrm.blurb, eta: b.wyrmTimer });
      }
      if (b.rocActive && !b.rocDefeated && b.roc && b.roc.mode === 'circle') {
        list.push({ icon: ENEMIES.roc.icon, name: ENEMIES.roc.name, blurb: ENEMIES.roc.blurb, eta: b.roc.nextDive });
      }
    }
    list.sort((a, b) => a.eta - b.eta);
    return list.slice(0, 4);
  }
  update(dt, game) {
    const d = this.difficulty();
    // eat the queue: when the head's ETA hits zero, it arrives
    if (this.queue.length > 0) {
      this.queue[0].eta -= dt;
      if (this.queue[0].eta <= 0) {
        const next = this.queue.shift();
        this.spawnKind(next.kind, game);
        const lastEta = this.queue.length > 0 ? this.queue[this.queue.length - 1].eta : 0;
        this.queue.push({ kind: this.rollKind(game), eta: Math.max(0.3, lastEta) + this.rollInterval() });
      }
    }
    const scroll = CFG.BASE_SPEED * game.speedMult * (game.caravan.sprinting ? CFG.SPRINT_MULT : 1) * dt;
    // gusts: day 12 storm, or occasional desert wind from day 3
    this.gustTimer -= dt;
    if (this.gustTimer <= 0) {
      const stormDay = this.day >= 12;
      if (stormDay || this.day >= 3) {
        this.gust = this.rng.range(-1, 1) * (stormDay ? 1 : 0.6);
        this.gustTimer = this.rng.range(stormDay ? 1.2 : 2.5, stormDay ? 2.2 : 5);
        if (Math.abs(this.gust) > 0.35) game.audio.gust();
      } else {
        this.gust = 0;
        this.gustTimer = 2;
      }
    }
    if (this.gust !== 0) {
      const push = game.sandSails ? -this.gust * 26 * dt : this.gust * 46 * dt;
      game.caravan.x = Math.max(46, Math.min(978, game.caravan.x + push));
    }
    // move entities down the screen; each kind walks its own way
    for (const e of this.entities) {
      e.y += (e.vy || 60) * d * dt * (game.caravan.sprinting ? 1.15 : 1);
      if (e.kind === 'raider') {
        const tail = game.caravan.followerPos(Math.max(1, game.camels - 1));
        e.x += Math.max(-1, Math.min(1, (tail.x - e.x) / 40)) * 95 * dt;
      } else if (e.kind === 'devil') {
        e.x += Math.sin(game.time * 3 + e.phase) * 70 * dt;
        e.x = Math.max(46, Math.min(978, e.x));
      } else if (e.kind === 'vulture') {
        e.t += dt;
        if (e.mode === 'hover') {
          e.x += Math.max(-1, Math.min(1, (game.caravan.x - e.x) / 60)) * 34 * dt;
          if (e.t > 2.2) {
            e.mode = 'dive';
            e.diveX = game.caravan.x;
            e.t = 0;
          }
        } else {
          e.x += Math.max(-1, Math.min(1, (e.diveX - e.x) / 30)) * 160 * dt;
          e.y += 300 * dt;
        }
      } else if (e.kind === 'water' && game.compass) {
        e.x += Math.max(-1, Math.min(1, (game.caravan.x - e.x) / 50)) * 26 * dt;
      }
    }
    this.entities = this.entities.filter((e) => e.y < 640 && e.hp > 0);
    return scroll;
  }
  spawnKind(kind, game) {
    const r = this.rng;
    const x = r.range(60, 964);
    // Day 4: raider ambush — raiders arrive in packs
    if (kind === 'raider' && this.day === 4 && !game.guard && r.chance(0.3)) {
      for (let i = 0; i < 3; i++) {
        this.entities.push({ kind: 'raider', x: r.range(80, 944), y: -30 - i * 46, vy: 88, hp: 1, r: 16 });
      }
      return;
    }
    if (kind === 'salt') {
      // salt crystals come in little chains of 2-4
      const n = r.int(2, 4);
      const cx = x;
      for (let i = 0; i < n; i++) {
        this.entities.push({ kind: 'salt', x: Math.max(50, Math.min(974, cx + (i - (n - 1) / 2) * 34)), y: -20 - i * 30, vy: 62, hp: 1, r: 14 });
      }
    } else if (kind === 'water') {
      this.entities.push({ kind: 'water', x, y: -20, vy: 58, hp: 1, r: 15 });
    } else if (kind === 'coin') {
      this.entities.push({ kind: 'coin', x, y: -20, vy: 64, hp: 1, r: 13 });
    } else if (kind === 'sinkhole') {
      this.entities.push({ kind: 'sinkhole', x, y: -30, vy: 60, hp: 1, r: 26 });
    } else if (kind === 'thorn') {
      this.entities.push({ kind: 'thorn', x, y: -30, vy: 60, hp: 1, r: 20 });
    } else if (kind === 'raider') {
      this.entities.push({ kind: 'raider', x, y: -30, vy: 82, hp: 1, r: 16 });
    } else if (kind === 'devil') {
      this.entities.push({ kind: 'devil', x, y: -30, vy: 118, hp: 1, r: 16, phase: r.range(0, 6.28) });
    } else if (kind === 'vulture') {
      this.entities.push({ kind: 'vulture', x, y: -30, vy: 40, hp: 1, r: 16, mode: 'hover', t: 0, diveX: x });
    } else if (kind === 'mirage') {
      this.entities.push({ kind: 'mirage', x, y: -20, vy: 60, hp: 1, r: 14 });
    }
  }
}
