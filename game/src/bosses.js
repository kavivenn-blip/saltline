// SALTLINE — the bosses. Day 8 brings the Dune Wyrm back as a real boss
// with hit points: rope its head to wound it. Day 12 brings the Storm Roc,
// which circles, telegraphs a dive, and slams down where the caravan stood.
// Both are optional to defeat — but killing one pays in salt and score.
import { CFG } from './config.js';

export class Bosses {
  constructor() {
    this.reset();
  }
  reset() {
    // wyrm: the crossing worm. {x, dir, t} while on screen, else null.
    this.wyrm = null;
    this.wyrmTimer = -1; // seconds until the next crossing
    this.wyrmHp = CFG.WYRM_HP;
    this.wyrmMax = CFG.WYRM_HP;
    this.wyrmActive = false;
    this.wyrmDefeated = false;
    // roc: the storm bird. mode circle | telegraph | dive | recover.
    this.roc = null;
    this.rocHp = CFG.ROC_HP;
    this.rocMax = CFG.ROC_HP;
    this.rocActive = false;
    this.rocDefeated = false;
  }
  startDay(day, game) {
    this.wyrm = null;
    this.wyrmTimer = -1;
    this.wyrmHp = CFG.WYRM_HP;
    this.wyrmActive = false;
    this.wyrmDefeated = false;
    this.roc = null;
    this.rocHp = CFG.ROC_HP;
    this.rocActive = false;
    this.rocDefeated = false;
    if (day === 8) {
      this.wyrmActive = true;
      this.wyrmTimer = 6;
    }
    if (day === 12) {
      this.rocActive = true;
      this.roc = { x: 512, y: 110, mode: 'circle', t: 0, diveX: 512, nextDive: 4.5 };
    }
    void game;
  }
  damageWyrm(game) {
    if (!this.wyrmActive || this.wyrmDefeated) return;
    this.wyrmHp -= CFG.ROPE_BOSS_DAMAGE;
    game.score += CFG.ROPE_BOSS_SCORE;
    game.particles.burst(this.wyrm ? this.wyrm.x : 512, 330, 12, '#f5c542', 150);
    game.floatText(this.wyrm ? this.wyrm.x : 512, 300, `WYRM HIT +${CFG.ROPE_BOSS_SCORE}`, '#f5c542');
    game.audio.ropeCatch();
    if (this.wyrmHp <= 0) this.defeatWyrm(game);
  }
  defeatWyrm(game) {
    this.wyrmDefeated = true;
    this.wyrmActive = false;
    this.wyrm = null;
    game.score += CFG.WYRM_SCORE;
    game.setBanner(`DUNE WYRM DOWN  +${CFG.WYRM_SCORE}`, 3.5);
    game.particles.ring(512, 330, '#f5c542');
    // the wyrm bursts into salt
    for (let i = 0; i < 8; i++) {
      game.trail.entities.push({
        kind: 'salt', x: 200 + i * 90, y: 260 + (i % 2) * 60, vy: 60, hp: 1, r: 12,
      });
    }
    game.audio.win();
  }
  damageRoc(game) {
    if (!this.rocActive || this.rocDefeated || !this.roc) return;
    this.rocHp -= CFG.ROPE_BOSS_DAMAGE;
    game.score += CFG.ROPE_BOSS_SCORE;
    game.particles.burst(this.roc.x, this.roc.y, 12, '#b78ae8', 150);
    game.floatText(this.roc.x, this.roc.y - 24, `ROC HIT +${CFG.ROPE_BOSS_SCORE}`, '#b78ae8');
    game.audio.ropeCatch();
    if (this.rocHp <= 0) this.defeatRoc(game);
  }
  defeatRoc(game) {
    this.rocDefeated = true;
    this.rocActive = false;
    this.roc = null;
    game.score += CFG.ROC_SCORE;
    game.setBanner(`STORM ROC DOWN  +${CFG.ROC_SCORE}`, 3.5);
    game.particles.ring(512, 200, '#b78ae8');
    for (let i = 0; i < 10; i++) {
      game.trail.entities.push({
        kind: 'salt', x: 150 + i * 80, y: 240 + (i % 3) * 50, vy: 60, hp: 1, r: 12,
      });
    }
    game.audio.win();
  }
  update(dt, game) {
    // --- the wyrm: crossings every ~9s while it lives, day 8 only ---
    if (this.wyrmActive && !this.wyrmDefeated && game.day === 8) {
      if (this.wyrmTimer > 0) {
        this.wyrmTimer -= dt;
        if (this.wyrmTimer <= 0) {
          if (game.wyrmCharm) {
            game.floatText(512, 200, 'THE WYRM SLEEPS — CHARM HELD', '#3ec6b8');
            this.wyrmTimer = -1;
            this.wyrmActive = false;
          } else {
            const fromLeft = game.rng.chance(0.5);
            this.wyrm = { x: fromLeft ? -80 : 1104, dir: fromLeft ? 1 : -1, t: 0 };
            this.wyrmTimer = 9;
          }
        }
      }
      if (this.wyrm) {
        this.wyrm.x += this.wyrm.dir * 260 * dt;
        this.wyrm.t += dt;
        if (this.wyrm.x < -160 || this.wyrm.x > 1184) {
          this.wyrm = null;
          // it comes back while it still lives
          if (!this.wyrmDefeated) this.wyrmTimer = 4;
        }
      }
    }
    // --- the roc: circle, telegraph, dive, recover ---
    if (this.rocActive && !this.rocDefeated && this.roc && game.day === 12) {
      const r = this.roc;
      r.t += dt;
      if (r.mode === 'circle') {
        r.x = 512 + Math.sin(r.t * 0.5) * 300;
        r.y = 110 + Math.sin(r.t * 1.3) * 20;
        r.nextDive -= dt;
        if (r.nextDive <= 0) {
          r.mode = 'telegraph';
          r.t = 0;
          r.diveX = game.caravan.x;
          game.audio.gust();
        }
      } else if (r.mode === 'telegraph') {
        if (r.t >= 0.9) {
          r.mode = 'dive';
          r.t = 0;
        }
      } else if (r.mode === 'dive') {
        const k = Math.min(1, r.t / 0.35);
        r.x = r.diveX;
        r.y = 110 + k * 450;
        // the dive itself can hit the caravan
        if (game.caravan.invuln <= 0 && Math.abs(r.x - game.caravan.x) < 48 && Math.abs(r.y - game.caravan.y) < 48) {
          game.hitHazard({ kind: 'roc', hp: 1 });
          if (game.state !== 'play') return;
        }
        if (k >= 1) {
          r.mode = 'recover';
          r.t = 0;
          game.particles.burst(r.x, 540, 16, '#8a5a8a', 160);
        }
      } else if (r.mode === 'recover') {
        const k = Math.min(1, r.t / 1.2);
        r.y = 560 - k * 450;
        r.x = r.diveX + (512 - r.diveX) * k;
        if (k >= 1) {
          r.mode = 'circle';
          r.t = 0;
          r.nextDive = 4.5;
        }
      }
    }
  }
}
