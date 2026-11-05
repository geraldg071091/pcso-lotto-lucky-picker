import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectGame, selectLatest } from '../store/lottery.selectors';

@Component({
  selector: 'app-latest-result',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  template: `
    <div class="card">
      <h2>Latest result</h2>
      @if (latest$ | async; as d) {
        <div class="balls">
          @for (n of d.nums; track $index) {
            <div class="ball">{{ (game$ | async) === '6d' ? n : pad(n) }}</div>
          }
        </div>
        <div class="meta">Drawn {{ d.date }}{{ d.winners ? ' \u00b7 ' + d.winners + ' winner(s)' : '' }}</div>
        <div class="prize">
          <span class="meta">Jackpot / top prize</span>
          <b>{{ d.jackpot || 'Not published' }}</b>
        </div>
      } @else { <p class="meta">Loading...</p> }
    </div>
  `,
  styles: [`
    .balls{display:flex;gap:.3rem;flex-wrap:wrap;margin-bottom:.3rem}
    .ball{width:2.1rem;height:2.1rem;border-radius:50%;color:#fff;display:grid;place-items:center;
          font-weight:700;font-size:.82rem;background:radial-gradient(circle at 30% 30%,#ef6a5b,var(--red))}
    .prize{display:flex;justify-content:space-between;align-items:baseline;gap:.6rem;margin-top:.45rem;
           border-top:1px solid var(--line);padding-top:.45rem}
    .prize b{color:var(--good);font-size:1.05rem}
  `],
})
export class LatestResultComponent {
  private store = inject(Store);
  readonly latest$ = this.store.select(selectLatest);
  readonly game$ = this.store.select(selectGame);
  pad = (n: number) => String(n).padStart(2, '0');
}
