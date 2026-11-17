// SALTLINE — the dusk camp: choose 1 of 3 cards, plus trade and repair.
//
// v3: the fire now sells relics. Coins used to buy nothing but camels; now
// 60 coin buys one random relic the caravan does not own yet (Salt Press,
// Swift Hooves or Dune Lantern), so the coin economy has a second use.
import { CFG, CARD_POOL, SHOP_RELICS } from './config.js';

export class Camp {
  constructor() {
    this.cards = [];
    this.picked = false;
  }
  open(rng) {
    const pool = [...CARD_POOL];
    this.cards = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(rng.next() * pool.length);
      this.cards.push(pool.splice(idx, 1)[0]);
    }
    this.picked = false;
  }
  // relics the fire can still sell (the shop pool minus what is owned)
  shopStock(game) {
    return SHOP_RELICS.filter((r) => !game.relics.some((o) => o.id === r.id));
  }
  // trade options, each with a live affordability check. The trade objects
  // are built once and reused: drawCamp writes each button's _x/_w onto
  // them, and the click handler reads the same objects, so a click on a
  // button actually lands. (Rebuilding them per call broke that in v2 —
  // the camp trades could never be clicked.)
  trades(game) {
    if (!this._trades) {
      this._trades = [
        {
          id: 'water',
          run: () => { game.salt -= CFG.TRADE_SALT_WATER.salt; game.water = Math.min(game.waterMax, game.water + CFG.TRADE_SALT_WATER.water); },
        },
        {
          id: 'coin',
          run: () => { game.salt -= CFG.TRADE_SALT_COIN.salt; game.coin += CFG.TRADE_SALT_COIN.coin; },
        },
        {
          id: 'camel',
          run: () => { game.coin -= CFG.CAMEL_PRICE; game.camels += 1; },
        },
        {
          id: 'relic',
          run: () => {
            const avail = this.shopStock(game);
            if (avail.length === 0) return;
            const pick = avail[Math.floor(game.rng.next() * avail.length)];
            game.coin -= CFG.RELIC_PRICE;
            game.applyShopRelic(pick.id);
            game.floatText(512, 200, `${pick.icon} BOUGHT: ${pick.name}`, '#f5c542');
          },
        },
      ];
    }
    const stock = this.shopStock(game);
    const t = this._trades;
    t[0].label = `Sell ${CFG.TRADE_SALT_WATER.salt} salt → +${CFG.TRADE_SALT_WATER.water} water`;
    t[0].ok = game.salt >= CFG.TRADE_SALT_WATER.salt;
    t[1].label = `Sell ${CFG.TRADE_SALT_COIN.salt} salt → +${CFG.TRADE_SALT_COIN.coin} coin`;
    t[1].ok = game.salt >= CFG.TRADE_SALT_COIN.salt;
    t[2].label = `Buy a camel — ${CFG.CAMEL_PRICE} coin`;
    t[2].ok = game.coin >= CFG.CAMEL_PRICE && game.camels < CFG.CAMEL_MAX;
    t[3].label = stock.length > 0 ? `Buy a relic (random) — ${CFG.RELIC_PRICE} coin` : 'Relics sold out';
    t[3].ok = game.coin >= CFG.RELIC_PRICE && stock.length > 0;
    return t;
  }
}
