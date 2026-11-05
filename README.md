# PCSO Lotto Lucky Pick Generator — Angular 20 + NgRx

## Run it

```bash
npm install
node ../pcso-lotto/server.js   # or copy server.js here: node server.js
npm start                      # http://localhost:4200
```

`proxy.conf.json` forwards `/api/pcso` to the Node proxy on port 3000, which is the
only thing that can reach PCSO (it needs a server-side POST).

## State (NgRx)

- `store/lottery.actions.ts`   — selectGame, loadDraws, loadDrawsSuccess/Failure, generate, generateComplete, showMoreHistory
- `store/lottery.reducer.ts`   — feature slice `lottery` (game, draws, source, combos, historyPage)
- `store/lottery.effects.ts`   — PCSO-with-fallback fetch, and combo generation
- `store/lottery.selectors.ts` — view models incl. `selectChanceText`, `selectRankingNote`

## Ranking: what the percentage means

`Pattern score` measures how closely a set matches the shape of real past draws
(sum, odd/even split, spread, low-digit count). It is **not** a win probability.

Every combination has exactly one chance: 1 in 40,475,358 for Ultra Lotto 6/58.
The UI states that per combination and ranks only by pattern score.

Tie-breaking prefers sets that a crowd is less likely to also pick, which can
reduce jackpot splitting. That is an expected-value point, not an odds point.
