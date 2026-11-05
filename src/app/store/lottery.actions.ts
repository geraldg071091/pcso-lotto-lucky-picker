import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Draw, GameKey, Scored } from '../core/lottery.model';
import { Source } from '../services/lottery-api.service';

export const LotteryActions = createActionGroup({
  source: 'Lottery',
  events: {
    'Select Game': props<{ game: GameKey }>(),
    'Load Draws': emptyProps(),
    'Load Draws Success': props<{ game: GameKey; draws: Draw[]; source: Source }>(),
    'Load Draws Failure': props<{ game: GameKey; error: string }>(),
    'Generate': emptyProps(),
    'Generate Complete': props<{ game: GameKey; combos: Scored[] }>(),
    'Show More History': emptyProps(),
  },
});
