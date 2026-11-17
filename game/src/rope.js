// SALTLINE — the rope. One physical verb: click (or F) to throw a lasso
// at the pointer. It snatches pickups from afar, hogties raiders, and
// wounds the bosses. The rope is a state machine: idle -> fly -> reel -> cool.
import { CFG } from './config.js';

export class Rope {
  constructor() {
    this.state = 'idle'; // idle | fly | reel | cool
    this.tx = 0; // target point
    this.ty = 0;
    this.x = 0; // tip position
    this.y = 0;
    this.cool = 0; // seconds left on cooldown
    this.caught = null; // {kind, x, y} drawn sliding along the rope
    this.flash = 0; // brief ring flash when a catch lands
  }
  reset() {
    this.state = 'idle';
    this.cool = 0;
    this.caught = null;
    this.flash = 0;
  }
  ready() {
    return this.state === 'idle' && this.cool <= 0;
  }
  cooldownFrac() {
    return this.cool > 0 ? this.cool / CFG.ROPE_COOLDOWN_S : 0;
  }
  // Throw at a point (already clamped to range by the caller).
  throwAt(tx, ty, game) {
    if (!this.ready()) return false;
    this.tx = tx;
    this.ty = ty;
    this.x = game.caravan.x;
    this.y = game.caravan.y;
    this.caught = null;
    this.state = 'fly';
    game.audio.ropeThrow();
    return true;
  }
  // The catch check, run once when the tip arrives.
  catchAt(game) {
    const tip = { x: this.x, y: this.y };
    // bosses first — they are the biggest targets
    const bosses = game.bosses;
    if (bosses && bosses.wyrm) {
      const hx = bosses.wyrm.x;
      const hy = 330;
      if (Math.hypot(hx - tip.x, hy - tip.y) < 70) {
        bosses.damageWyrm(game);
        this.caught = { kind: 'wyrm', x: hx, y: hy };
        this.flash = 0.3;
        return;
      }
    }
    if (bosses && bosses.roc) {
      const rx = bosses.roc.x;
      const ry = bosses.roc.y;
      if (Math.hypot(rx - tip.x, ry - tip.y) < 70) {
        bosses.damageRoc(game);
        this.caught = { kind: 'roc', x: rx, y: ry };
        this.flash = 0.3;
        return;
      }
    }
    // then the nearest entity inside the catch radius
    let best = null;
    let bestD = CFG.ROPE_CATCH_R;
    for (const e of game.trail.entities) {
      const d = Math.hypot(e.x - tip.x, e.y - tip.y);
      if (d < bestD) { best = e; bestD = d; }
    }
    if (!best) return;
    if (best.kind === 'mirage') {
      best.hp = 0;
      game.combo = 0;
      game.comboTimer = 0;
      game.score += 25;
      game.particles.burst(best.x, best.y, 10, '#b78ae8', 120);
      game.floatText(best.x, best.y - 18, 'MIRAGE POPPED +25', '#b78ae8');
      game.audio.ropeCatch();
      this.caught = { kind: 'mirage', x: best.x, y: best.y };
      this.flash = 0.25;
      return;
    }
    if (best.kind === 'salt' || best.kind === 'water' || best.kind === 'coin') {
      const ex = best.x;
      const ey = best.y;
      game.collect(best);
      this.caught = { kind: best.kind, x: ex, y: ey };
      this.flash = 0.2;
      return;
    }
    // raider / devil / vulture: hogtied — removed, scored, drops salt
    best.hp = 0;
    game.score += CFG.ROPE_HOGTIE_SCORE;
    game.particles.burst(best.x, best.y, 14, '#d8c49a', 150);
    game.particles.ring(best.x, best.y, '#d8c49a');
    game.floatText(best.x, best.y - 20, `HOGTIED +${CFG.ROPE_HOGTIE_SCORE}`, '#d8c49a');
    game.audio.ropeCatch();
    for (let i = 0; i < CFG.ROPE_HOGTIE_SALT; i++) {
      game.trail.entities.push({
        kind: 'salt',
        x: Math.max(50, Math.min(974, best.x + (i - 2) * 30)),
        y: best.y - 10 - i * 8,
        vy: 60, hp: 1, r: 12,
      });
    }
    this.caught = { kind: 'hogtie', x: best.x, y: best.y };
    this.flash = 0.3;
  }
  update(dt, game) {
    if (this.flash > 0) this.flash -= dt;
    if (this.state === 'fly') {
      const dx = this.tx - this.x;
      const dy = this.ty - this.y;
      const d = Math.hypot(dx, dy);
      const step = CFG.ROPE_FLY_SPEED * dt;
      if (d <= step) {
        this.x = this.tx;
        this.y = this.ty;
        this.catchAt(game);
        this.state = 'reel';
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
      return;
    }
    if (this.state === 'reel') {
      const hx = game.caravan.x;
      const hy = game.caravan.y;
      const dx = hx - this.x;
      const dy = hy - this.y;
      const d = Math.hypot(dx, dy);
      const step = CFG.ROPE_FLY_SPEED * 1.3 * dt;
      if (d <= step) {
        this.x = hx;
        this.y = hy;
        this.caught = null;
        this.state = 'cool';
        this.cool = CFG.ROPE_COOLDOWN_S;
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
      }
      return;
    }
    if (this.state === 'cool') {
      this.cool -= dt;
      if (this.cool <= 0) {
        this.cool = 0;
        this.state = 'idle';
      }
    }
  }
  draw(ctx, game) {
    const cx = game.caravan.x;
    const cy = game.caravan.y;
    if (this.state === 'idle') {
      // faint aim line to the pointer while the rope is ready
      const mx = game.input.mouse.x;
      const my = game.input.mouse.y;
      const d = Math.hypot(mx - cx, my - cy);
      if (d < CFG.ROPE_RANGE && d > 40 && my > 80 && my < 540) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = '#d8c49a';
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 10);
        ctx.lineTo(mx, my);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
    // the rope itself: a line with a little sag, caravan -> tip
    const mx = (cx + this.x) / 2;
    const my = (cy + this.y) / 2 + 14;
    ctx.save();
    ctx.strokeStyle = '#d8c49a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.quadraticCurveTo(mx, my, this.x, this.y);
    ctx.stroke();
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 12);
    ctx.quadraticCurveTo(mx, my, this.x, this.y);
    ctx.stroke();
    // the loop at the tip
    ctx.strokeStyle = '#f5c542';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.state === 'fly' ? 12 : 9, 0, Math.PI * 2);
    ctx.stroke();
    // what the rope caught, sliding home along it
    if (this.caught) {
      const c = this.caught;
      if (c.kind === 'hogtie') {
        ctx.fillStyle = '#8c1f28';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d8c49a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 10, this.y - 4); ctx.lineTo(this.x + 10, this.y - 4);
        ctx.moveTo(this.x - 10, this.y + 2); ctx.lineTo(this.x + 10, this.y + 2);
        ctx.stroke();
      } else if (c.kind === 'salt') {
        ctx.fillStyle = '#fff8e0';
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      } else if (c.kind === 'water') {
        ctx.fillStyle = '#4fb3e8';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.kind === 'coin') {
        ctx.fillStyle = '#f5c542';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (c.kind === 'mirage') {
        ctx.fillStyle = '#b78ae8';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash / 0.3;
      ctx.strokeStyle = '#f5c542';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x, this.y, 18 + (0.3 - this.flash) * 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
