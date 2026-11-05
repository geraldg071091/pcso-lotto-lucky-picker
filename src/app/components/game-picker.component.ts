import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { GAMES, GAME_KEYS, GameKey } from '../core/lottery.model';
import { LotteryActions } from '../store/lottery.actions';
import { selectGame } from '../store/lottery.selectors';

@Component({
  selector: 'app-game-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  template: `
    <aside class="card">
      <h2>1. Choose a game</h2>
      <div class="list">
        @for (k of keys; track k) {
          <button class="game" [class.on]="k === (game$ | async)" (click)="pick(k)">
            <b>{{ meta[k].name }}</b><span>{{ meta[k].blurb }}</span>
          </button>
        }
      </div>
    </aside>
  `,
  styles: [`
    .card{display:flex;flex-direction:column;min-height:0}
    .list{display:flex;flex-direction:column;gap:.45rem;overflow:auto;min-height:0}
    .game{display:flex;flex-direction:column;gap:.1rem;text-align:left;background:#fff;
          border:2px solid var(--line);border-radius:10px;padding:.55rem .7rem}
    .game b{font-size:.9rem}
    .game span{font-size:.72rem;color:var(--mut)}
    .game.on{border-color:var(--red);background:#fdeceb}
    @media(max-width:1100px){.list{flex-direction:row;overflow-x:auto}
      .game{min-width:11rem}}
  `],
})
export class GamePickerComponent {
  private store = inject(Store);
  readonly meta = GAMES;
  readonly keys: GameKey[] = GAME_KEYS;
  readonly game$ = this.store.select(selectGame);
  pick(game: GameKey): void {
    this.store.dispatch(LotteryActions.selectGame({ game }));
    this.store.dispatch(LotteryActions.loadDraws());
  }
}
