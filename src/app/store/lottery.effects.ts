import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { LotteryActions } from './lottery.actions';
import { LotteryApiService } from '../services/lottery-api.service';
import { GeneratorService } from '../services/generator.service';
import { selectDraws, selectGame } from './lottery.selectors';

@Injectable()
export class LotteryEffects {
  private actions$ = inject(Actions);
  private api = inject(LotteryApiService);
  private generator = inject(GeneratorService);
  private store = inject(Store);

  loadDraws$ = createEffect(() => this.actions$.pipe(
    ofType(LotteryActions.loadDraws),
    withLatestFrom(this.store.select(selectGame)),
    switchMap(([, game]) => this.api.draws(game).pipe(
      map(r => LotteryActions.loadDrawsSuccess({ game, draws: r.draws, source: r.source })),
      catchError(e => of(LotteryActions.loadDrawsFailure({ game, error: e?.message ?? 'Request failed' }))),
    )),
  ));

  generate$ = createEffect(() => this.actions$.pipe(
    ofType(LotteryActions.loadDrawsSuccess, LotteryActions.generate),
    withLatestFrom(this.store.select(selectGame), this.store.select(selectDraws)),
    map(([, game, draws]) => LotteryActions.generateComplete({
      game, combos: draws.length >= 30 ? this.generator.generate(game, draws) : [],
    })),
  ));
}
