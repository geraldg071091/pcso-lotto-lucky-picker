import { createFeatureSelector, createSelector } from '@ngrx/store';
import { baseChance, formatCount, formatPeso, GAMES, patternBand } from '../core/lottery.model';
import { HISTORY_PAGE_SIZE, LOTTERY_FEATURE_KEY, LotteryState } from './lottery.reducer';

export const selectLottery = createFeatureSelector<LotteryState>(LOTTERY_FEATURE_KEY);
export const selectGame = createSelector(selectLottery, s => s.game);
export const selectMeta = createSelector(selectGame, g => GAMES[g]);
export const selectDraws = createSelector(selectLottery, s => s.draws);
export const selectLoading = createSelector(selectLottery, s => s.loading);
export const selectError = createSelector(selectLottery, s => s.error);
export const selectSource = createSelector(selectLottery, s => s.source);
export const selectCombos = createSelector(selectLottery, s => s.combos);

export const selectHistory = createSelector(selectLottery, s => s.draws.slice(0, s.historyPage * HISTORY_PAGE_SIZE));
export const selectHasMoreHistory = createSelector(selectLottery, s => s.draws.length > s.historyPage * HISTORY_PAGE_SIZE);

/** Latest draw, with the prize already formatted for display. */
export const selectLatest = createSelector(selectDraws, draws => {
  const d = draws[0];
  if (!d) return null;
  return {
    date: d.date,
    nums: d.nums,
    jackpot: formatPeso(d.jackpot),
    winners: formatCount(d.winners),
    hasPrize: !!formatPeso(d.jackpot),
  };
});

/** History rows carry formatted prize and winner counts. */
export const selectHistoryRows = createSelector(selectHistory, rows => rows.map(d => ({
  date: d.date,
  nums: d.nums,
  jackpot: formatPeso(d.jackpot),
  winners: formatCount(d.winners),
})));

/** Combos with a plain-language band for the score. */
export const selectComboRows = createSelector(selectCombos, combos => combos.map((c, i) => ({
  ...c,
  rank: i + 1,
  band: patternBand(c.pattern),
})));

export const selectBaseChance = createSelector(selectMeta, m => baseChance(m));
export const selectChanceText = createSelector(selectBaseChance, p => `1 in ${Math.round(1 / p).toLocaleString('en-PH')}`);

export const selectRankingNote = createSelector(selectMeta,
  () => 'Ranked by historical pattern score, which measures how closely a set matches the shape of real past draws. '
      + 'It is not a win probability: all five combinations have the same chance.');
