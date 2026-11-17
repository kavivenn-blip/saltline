# SALTLINE

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node 22](https://img.shields.io/badge/Node-22-green.svg)](https://nodejs.org)
[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kavivenn-blip/saltline/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kavivenn-blip/saltline/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**SALTLINE** is a caravan survival game for the [make.fun](https://make.fun) best-game-01 bounty: steer a camel caravan across the White Wastes, rope the salt, hogtie the raiders, and reach the White Oasis on Day 12 — before thirst, the Dune Wyrm or the Storm Roc end the road.

## Play

Serve the game and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests: `game/` is plain static files (HTML + ES modules).

| Input | Action |
| --- | --- |
| Mouse / WASD / arrows | Steer the lead camel (the caravan follows) |
| Click / F | Throw the rope — snatch salt, hogtie raiders, wound bosses |
| Space | Salt burst — shatters hazards around the caravan |
| Shift | Sprint — faster, but much thirstier |
| 1 / 2 / 3 or click | Pick a supply card at the dusk camp |
| Click | Trade at the camp fire, start, restart |
| Space / Enter | Break camp, begin, restart |
| P / Esc | Pause |
| M | Mute |
| R | Restart the run |

## The game

- **Goal:** survive 12 days and reach the White Oasis. **Lose** if your water runs out or the last camel falls. The win and lose conditions are written on the screen, every run.
- **The rope is the game:** click anywhere to throw a lasso. It reels in salt, water and coin from afar, hogties raiders (who drop their salt), pops mirages, and wounds the bosses. A miss costs a second of cooldown, so aim.
- **Thirst is the clock:** water drains every second and faster while sprinting. Water skins are the only refill on the trail — and at camp you can trade salt for water.
- **Salt chains:** collect salt crystals in quick succession to build a combo up to ×8. A hit resets it, so greed is a choice.
- **Hazards:** sinkholes swallow camels; thornbrush shatters if you sprint through it; raiders chase the tail camel and steal salt; sand devils zigzag; vultures circle then dive; mirages look like salt and pop your combo; desert gusts shove the whole caravan sideways.
- **Bosses:** on Day 8 the Dune Wyrm crosses the trail again and again until you rope its head six times; on Day 12 the Storm Roc circles, telegraphs a dive, and slams down where you stood. Killing one pays in salt and score.
- **Three acts:** The Salt Flats (Days 1–4), Raider Country (Days 5–8), The Last Storm (Days 9–12) — each with its own sky. Every day runs in waves: it teaches, presses, then pays out water before dusk.
- **Threat queue:** the right panel always shows what is coming next and when, so the rope and the burst can be planned instead of reacted to.
- **Dusk camp:** every night ends at the fire. Pick 1 of 3 supply cards (Deep Well, Salt Press, Hired Guard, Wyrm Charm, Sand Sails and more), trade salt for water or coin, buy a camel, or buy a relic for 60 coin — then break camp for the next day. Everything you own is shown in the HUD.
- **Feel:** a scrolling salt flat of cracked polygons under a dusk sky that deepens act by act, a bobbing camel line with a teal flag, birds, ruins, footprints and dust, particles, floating score popups, and a fully synthesised WebAudio soundtrack of wind, plucks and drums — no audio files.
- **Screens:** title (with a living attract mode), play with HUD, dusk camp, pause, a win screen with stats grid and grade, and a lose screen — each with restart. Best score persists in the browser.

## Structure

The source is split into files with one clear job each, under `game/src/`:

| File | Job |
| --- | --- |
| `config.js` | Every tuning number, colour, act, enemy and the camp card pool |
| `rng.js` | Seeded RNG (mulberry32) — same seed, same run |
| `input.js` | Keyboard and mouse, one-shot action flags |
| `audio.js` | Synthesised sound effects (WebAudio, no files) |
| `caravan.js` | Lead camel steering and the follower line |
| `trail.js` | Per-day spawns in waves, the threat queue, gusts |
| `rope.js` | The lasso: aim, throw, catch, reel, cooldown |
| `bosses.js` | The Dune Wyrm and the Storm Roc, with hit points |
| `camp.js` | Dusk camp: card draft, trade, relic shop |
| `particles.js` | Pooled particles, rings, floating score text |
| `render.js` | Drawing only: world, caravan, HUD and all screens |
| `shots.js` | Screenshot scenes staged deterministically |
| `main.js` | Boot, state machine, rules, scoring, game loop |

`main.ts` (root) hands the game in: it copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `vendor/makefun-game.ts`. Screenshots are real renders of the game's own code, staged deterministically with `?shot=title|play|camp|win&seed=N` (see `shots.json`) — the cover is the Day 8 boss fight, not the title.

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?ref=hp1z0q8b&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
