import { createReducer, on } from '@ngrx/store';
import { Draw, GameKey, Scored } from '../core/lottery.model';
import { Source } from '../services/lottery-api.service';
import { LotteryActions } from './lottery.actions';

export const LOTTERY_FEATURE_KEY = 'lottery';

export interface LotteryState {
  game: GameKey;
  loading: boolean;
  error: string | null;
  draws: Draw[];
  source: Source | null;
  combos: Scored[];
  historyPage: number;
  schedule: { drawDays: string; drawTime: string } | null;
}

export const initialLotteryState: LotteryState = {
  game: 'ultra', loading: false, error: null, draws: [], source: null,
  combos: [], historyPage: 1, schedule: null,
};

export const lotteryReducer = createReducer(
  initialLotteryState,
  on(LotteryActions.selectGame, (s, { game }): LotteryState =>
    ({ ...s, game, draws: [], combos: [], error: null, source: null, historyPage: 1 })),

  on(LotteryActions.loadDraws, (s): LotteryState => ({ ...s, loading: true, error: null })),
  on(LotteryActions.loadDrawsSuccess, (s, { game, draws, source }): LotteryState =>
    game === s.game ? { ...s, loading: false, draws, source, error: null } : s),
  on(LotteryActions.loadDrawsFailure, (s, { game, error }): LotteryState =>
    game === s.game ? { ...s, loading: false, error, draws: [] } : s),

  on(LotteryActions.generateComplete, (s, { game, combos }): LotteryState =>
    game === s.game ? { ...s, combos } : s),
  on(LotteryActions.showMoreHistory, (s): LotteryState => ({ ...s, historyPage: s.historyPage + 1 })),
);

export const HISTORY_PAGE_SIZE = 30;
