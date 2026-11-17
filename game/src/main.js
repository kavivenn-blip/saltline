// SALTLINE — boot, state machine, rules, scoring and the fixed-step loop.
//
// v3 of the caravan game (was SALTROAD). The crossing is the same — twelve
// days, water as the clock, salt as the score — but the caravan now carries
// a rope (click or F to throw it: snatch pickups from afar, hogtie raiders,
// wound the bosses), a salt burst on SPACE, three named acts, and two bosses
// with real hit points: the Dune Wyrm on Day 8 and the Storm Roc on Day 12.
import { CFG, actOf, CARD_POOL } from './config.js';
import { makeRng } from './rng.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { Caravan } from './caravan.js';
import { Trail } from './trail.js';
import { Camp } from './camp.js';
import { Particles } from './particles.js';
import { Rope } from './rope.js';
import { Bosses } from './bosses.js';
import { drawWorld, drawHUD, drawTitle, drawCamp, drawWin, drawLose, drawPause } from './render.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.audio = new AudioSys();
    this.caravan = new Caravan();
    this.trail = new Trail();
    this.camp = new Camp();
    this.particles = new Particles();
    this.rope = new Rope();
    this.bosses = new Bosses();
    this.state = 'title';
    this.shotMode = false;
    this.time = 0;
    this.seed = 1;
    this.rng = makeRng(1);
    this.best = 0;
    try { this.best = +(localStorage.getItem('saltline-best') || 0); } catch { /* no storage */ }
    this.resetRun();
    // attract mode behind the title
    this.trail.startDay(1, this.seed);
  }
  resetRun() {
    this.day = 1;
    this.dayTime = 0;
    this.dayProgress = 0;
    this.distance = 0;
    this.water = CFG.WATER_START;
    this.waterMax = CFG.WATER_MAX;
    this.salt = 0;
    this.saltTotal = 0;
    this.coin = 0;
    this.camels = CFG.CAMEL_START;
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.bestCombo = 0;
    this.speedMult = 1;
    this.saltMult = 1;
    this.comboWindow = CFG.COMBO_WINDOW_S;
    this.guard = false;
    this.compass = false;
    this.wyrmCharm = false;
    this.sandSails = false;
    this.relics = []; // {id, name, icon} — everything the caravan owns, shown in the HUD
    this.burstCool = 0;
    this.hitsToday = 0;
    this.banner = '';
    this.bannerT = 0;
    this.newBest = false;
    this.grade = 'C';
    this.loseReason = '';
    this.rope.reset();
    this.bosses.reset();
    this.caravan.reset();
  }
  setBanner(s, seconds = 3) {
    this.banner = s;
    this.bannerT = seconds;
  }
  floatText(x, y, text, color) {
    this.particles.float(x, y, text, color);
  }
  addRelic(card) {
    if (!this.relics.some((r) => r.id === card.id)) {
      this.relics.push({ id: card.id, name: card.name, icon: card.icon });
    }
  }
  applyShopRelic(id) {
    const card = CARD_POOL.find((c) => c.id === id);
    if (!card) return;
    card.apply(this);
    this.addRelic(card);
  }
  startRun() {
    this.resetRun();
    this.rng = makeRng(this.seed);
    this.trail.startDay(1, this.seed);
    this.bosses.startDay(1, this);
    this.state = 'play';
    this.setBanner('ACT I — THE SALT FLATS', 3.5);
    this.audio.ensure();
  }
  startDay(n) {
    this.day = n;
    this.dayTime = 0;
    this.dayProgress = 0;
    this.distance = 0;
    this.hitsToday = 0;
    this.trail.startDay(n, this.seed);
    this.bosses.startDay(n, this);
    this.state = 'play';
    const act = actOf(n);
    if (n === 1) this.setBanner('ACT I — THE SALT FLATS', 3.5);
    else if (n === 5) this.setBanner('ACT II — RAIDER COUNTRY', 3.5);
    else if (n === 9) this.setBanner('ACT III — THE LAST STORM', 3.5);
    else if (n === 4) this.setBanner('DAY 4 — RAIDER AMBUSH', 3.5);
    else if (n === 8) this.setBanner('DAY 8 — THE DUNE WYRM', 3.5);
    else if (n === 12) this.setBanner('DAY 12 — THE STORM ROC', 3.5);
    else this.setBanner(`DAY ${n} — ${act.name}`, 2.5);
  }
  endDay() {
    let bonus = 300 + 50 * this.camels;
    if (this.hitsToday === 0) {
      bonus += CFG.FLAWLESS_DAY_BONUS;
      this.floatText(512, 200, `FLAWLESS DAY  +${CFG.FLAWLESS_DAY_BONUS}`, '#3ec6b8');
    }
    this.score += bonus;
    this.floatText(512, 240, `DAY ${this.day} SURVIVED  +${bonus}`, '#f5c542');
    if (this.day >= CFG.DAYS) { this.winRun(); return; }
    this.camp.open(this.rng);
    this.state = 'camp';
  }
  gradeOf(score) {
    if (score >= CFG.GRADE_S) return 'S';
    if (score >= CFG.GRADE_A) return 'A';
    if (score >= CFG.GRADE_B) return 'B';
    return 'C';
  }
  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      this.newBest = true;
      try { localStorage.setItem('saltline-best', String(this.best)); } catch { /* no storage */ }
    }
  }
  winRun() {
    this.grade = this.gradeOf(this.score);
    this.saveBest();
    this.state = 'win';
    this.audio.win();
  }
  loseRun(reason) {
    this.loseReason = reason;
    this.grade = this.gradeOf(this.score);
    this.saveBest();
    this.state = 'lose';
    this.audio.lose();
  }
  collect(e) {
    if (e.kind === 'salt') {
      this.combo = this.comboTimer > 0 ? Math.min(this.combo + 1, CFG.COMBO_MAX) : 1;
      this.comboTimer = this.comboWindow;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      const pts = CFG.SALT_SCORE * this.combo * this.saltMult;
      this.score += pts;
      this.salt += 1;
      this.saltTotal += 1;
      this.particles.burst(e.x, e.y, 8, '#f5c542', 110);
      this.floatText(e.x, e.y - 18, `+${pts}`, '#f5c542');
      this.audio.pickup(this.combo);
    } else if (e.kind === 'water') {
      this.water = Math.min(this.waterMax, this.water + CFG.WATER_SKIN);
      this.particles.burst(e.x, e.y, 10, '#4fb3e8', 100);
      this.floatText(e.x, e.y - 18, `+${CFG.WATER_SKIN} 💧`, '#4fb3e8');
      this.audio.water();
    } else if (e.kind === 'coin') {
      this.coin += CFG.COIN_VALUE;
      this.score += 50;
      this.particles.burst(e.x, e.y, 6, '#f5c542', 90);
      this.floatText(e.x, e.y - 18, `+${CFG.COIN_VALUE} ¢`, '#f5c542');
      this.audio.coin();
    }
    e.hp = 0;
  }
  // A mirage is a trap, not a pickup: touching it pops the combo, nothing more.
  popMirage(e) {
    e.hp = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.particles.burst(e.x, e.y, 12, '#b78ae8', 130);
    this.floatText(e.x, e.y - 18, 'MIRAGE! combo lost', '#b78ae8');
    this.audio.hurt();
  }
  hitHazard(e) {
    if (this.caravan.invuln > 0) return;
    // thorns shatter when the caravan sprints through them
    if (e.kind === 'thorn' && this.caravan.sprinting) {
      e.hp = 0;
      this.score += CFG.BURST_SCORE;
      this.particles.burst(e.x, e.y, 12, '#c98a56', 140);
      this.floatText(e.x, e.y - 20, `THORN SHATTERED +${CFG.BURST_SCORE}`, '#c98a56');
      this.audio.ropeCatch();
      return;
    }
    this.caravan.invuln = CFG.HIT_INVULN_S;
    this.combo = 0;
    this.comboTimer = 0;
    this.camels -= 1;
    this.hitsToday += 1;
    this.particles.burst(this.caravan.x, this.caravan.y, 16, '#e84a4a', 170);
    this.particles.ring(this.caravan.x, this.caravan.y, '#e84a4a');
    this.audio.hurt();
    if (e.kind === 'raider') {
      const stolen = Math.min(this.salt, CFG.RAIDER_SALT_STEAL);
      this.salt -= stolen;
      this.floatText(this.caravan.x, this.caravan.y - 34, `RAIDER! -1 🐪 -${stolen} ◆`, '#e84a4a');
    } else if (e.kind === 'wyrm') {
      this.floatText(this.caravan.x, this.caravan.y - 34, 'WYRM! -1 🐪', '#e84a4a');
    } else if (e.kind === 'roc') {
      this.floatText(this.caravan.x, this.caravan.y - 34, 'ROC DIVE! -1 🐪', '#e84a4a');
    } else {
      this.floatText(this.caravan.x, this.caravan.y - 34, '-1 🐪', '#e84a4a');
    }
    e.hp = 0;
    if (this.camels <= 0) this.loseRun('The last camel fell on the salt. The wastes keep the rest.');
  }
  // Throw the rope at a point, clamped to the rope's range.
  throwRope(tx, ty) {
    const cx = this.caravan.x;
    const cy = this.caravan.y;
    const d = Math.hypot(tx - cx, ty - cy);
    if (d > CFG.ROPE_RANGE) {
      tx = cx + ((tx - cx) / d) * CFG.ROPE_RANGE;
      ty = cy + ((ty - cy) / d) * CFG.ROPE_RANGE;
    }
    this.rope.throwAt(tx, ty, this);
  }
  // Aim assist for keyboard players: the nearest thing worth roping.
  throwRopeAuto() {
    let best = null;
    let bestD = CFG.ROPE_RANGE;
    for (const e of this.trail.entities) {
      const d = Math.hypot(e.x - this.caravan.x, e.y - this.caravan.y);
      if (d < bestD) { best = e; bestD = d; }
    }
    if (best) this.throwRope(best.x, best.y);
    else this.throwRope(this.input.mouse.x, this.input.mouse.y);
  }
  // SPACE: salt burst — shatters every hazard near the caravan.
  saltBurst() {
    if (this.burstCool > 0) return;
    this.burstCool = CFG.BURST_COOLDOWN_S;
    const cx = this.caravan.x;
    const cy = this.caravan.y;
    let shattered = 0;
    for (const e of this.trail.entities) {
      if (e.hp <= 0) continue;
      if (['sinkhole', 'thorn', 'raider', 'devil', 'vulture', 'mirage'].includes(e.kind)
        && Math.hypot(e.x - cx, e.y - cy) < CFG.BURST_RADIUS) {
        e.hp = 0;
        shattered += 1;
        this.particles.burst(e.x, e.y, 10, '#f5c542', 130);
      }
    }
    this.particles.ring(cx, cy, '#f5c542');
    this.particles.burst(cx, cy, 18, '#f5c542', 190);
    this.audio.burst();
    if (shattered > 0) {
      const pts = shattered * CFG.BURST_SCORE;
      this.score += pts;
      this.floatText(cx, cy - 40, `SALT BURST! ${shattered} shattered +${pts}`, '#f5c542');
    } else {
      this.floatText(cx, cy - 40, 'SALT BURST!', '#f5c542');
    }
  }
  update(dt) {
    this.time += dt;
    if (this.bannerT > 0) {
      this.bannerT -= dt;
      if (this.bannerT <= 0) this.banner = '';
    }
    this.particles.update(dt);
    const input = this.input;
    if (this.state === 'title') {
      // attract mode: the caravan walks itself along the lower-left, clear of the text
      this.caravan.x = 200 + Math.sin(this.time * 0.5) * 50;
      this.caravan.y = 480;
      this.caravan.bob += dt * 7;
      this.trail.update(dt, this);
      if (input.mouse.clicked || input.hit('Enter', ' ')) this.startRun();
      return;
    }
    if (this.state === 'play') {
      if (input.hit('p', 'P', 'Escape')) { this.state = 'pause'; return; }
      if (input.hit('m', 'M')) this.audio.toggleMute();
      if (input.hit('r', 'R')) { this.startRun(); return; }
      if (input.mouse.clicked) this.throwRope(input.mouse.x, input.mouse.y);
      if (input.hit('f', 'F')) this.throwRopeAuto();
      if (input.hit(' ')) this.saltBurst();
      const scroll = this.trail.update(dt, this);
      this.bosses.update(dt, this);
      this.rope.update(dt, this);
      if (this.burstCool > 0) this.burstCool -= dt;
      this.distance += scroll;
      this.dayTime += dt;
      this.dayProgress = Math.min(1, this.distance / CFG.DAY_DISTANCE);
      this.caravan.update(dt, input, this.speedMult, this.rope.state === 'fly' || this.rope.state === 'reel');
      // sprinting kicks up dust
      if (this.caravan.sprinting && Math.random() < dt * 10) {
        this.particles.burst(this.caravan.x, this.caravan.y + 14, 1, '#c9b18a', 30);
      }
      // thirst never stops
      const drain = this.caravan.sprinting ? CFG.WATER_DRAIN_SPRINT : CFG.WATER_DRAIN;
      this.water -= drain * dt;
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 0;
      }
      // collisions with the lead camel
      const hx = this.caravan.x;
      const hy = this.caravan.y;
      for (const e of this.trail.entities) {
        const d = Math.hypot(e.x - hx, e.y - hy);
        if (d < e.r + 20) {
          if (e.kind === 'salt' || e.kind === 'water' || e.kind === 'coin') this.collect(e);
          else if (e.kind === 'mirage') this.popMirage(e);
          else this.hitHazard(e);
          if (this.state !== 'play') return;
        }
      }
      // the wyrm is a moving wall with a head worth roping
      if (this.bosses.wyrm) {
        const w = this.bosses.wyrm;
        if (Math.abs(w.x - hx) < 120 && Math.abs(330 - hy) < 70 && this.caravan.invuln <= 0) {
          this.hitHazard({ kind: 'wyrm', hp: 1 });
          if (this.state !== 'play') return;
        }
      }
      if (this.water <= 0) {
        this.water = 0;
        this.loseRun('The skins ran dry under a white sun. Thirst ends the road.');
        return;
      }
      if (this.distance >= CFG.DAY_DISTANCE) this.endDay();
      return;
    }
    if (this.state === 'camp') {
      if (input.hit('1')) this.pickCard(0);
      if (input.hit('2')) this.pickCard(1);
      if (input.hit('3')) this.pickCard(2);
      if (input.mouse.clicked) {
        const mx = input.mouse.x;
        const my = input.mouse.y;
        // cards
        const cw = 210;
        const gap = 24;
        const total = 3 * cw + 2 * gap;
        const x0 = (CFG.W - total) / 2;
        for (let i = 0; i < 3; i++) {
          const x = x0 + i * (cw + gap);
          if (mx >= x && mx <= x + cw && my >= 136 && my <= 326) this.pickCard(i);
        }
        // trades
        const trades = this.camp.trades(this);
        trades.forEach((t) => {
          if (t._x !== undefined && mx >= t._x && mx <= t._x + t._w && my >= 372 && my <= 412 && t.ok) {
            t.run();
            this.audio.coin();
          }
        });
      }
      if (this.camp.picked && input.hit(' ', 'Enter')) this.startDay(this.day + 1);
      return;
    }
    if (this.state === 'pause') {
      if (input.hit('p', 'P', 'Escape')) this.state = 'play';
      if (input.hit('r', 'R')) this.startRun();
      return;
    }
    if (this.state === 'win' || this.state === 'lose') {
      if (input.hit('r', 'R') || input.mouse.clicked || input.hit('Enter', ' ')) {
        this.state = 'title';
        this.resetRun();
        this.trail.startDay(1, this.seed);
      }
    }
  }
  pickCard(i) {
    if (this.camp.picked) return;
    const card = this.camp.cards[i];
    if (!card) return;
    card.apply(this);
    this.addRelic(card);
    this.camp.picked = card.id;
    this.audio.card();
    this.particles.burst(512, 220, 20, '#f5c542', 140);
  }
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CFG.W, CFG.H);
    if (this.state === 'title') drawTitle(ctx, this);
    else if (this.state === 'camp') drawCamp(ctx, this);
    else if (this.state === 'win') drawWin(ctx, this);
    else if (this.state === 'lose') drawLose(ctx, this);
    else {
      drawWorld(ctx, this);
      drawHUD(ctx, this);
      if (this.state === 'pause') drawPause(ctx);
    }
  }
  frame(dt) {
    if (!this.shotMode) this.update(Math.min(dt, 0.1));
    else this.time += dt;
    this.render();
    this.input.endFrame();
  }
}

export function boot(canvas) {
  const params = new URLSearchParams(location.search);
  const game = new Game(canvas);
  const seed = parseInt(params.get('seed') || '1', 10);
  game.seed = Number.isFinite(seed) ? seed : 1;
  window.__saltline = game;
  window.__saltroad = game; // alias for the playtest harness
  let last = performance.now();
  function loop(now) {
    game.frame((now - last) / 1000);
    last = now;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  return game;
}
