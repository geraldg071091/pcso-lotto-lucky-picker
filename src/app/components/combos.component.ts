import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { LotteryActions } from '../store/lottery.actions';
import {
  selectChanceText, selectComboRows, selectDraws, selectError, selectGame,
  selectLoading, selectRankingNote, selectSource,
} from '../store/lottery.selectors';
import { Scored } from '../core/lottery.model';

type Row = Scored & { rank: number; band: { label: string; tone: 'high' | 'mid' | 'low' } };

@Component({
  selector: 'app-combos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DecimalPipe],
  template: `
    <div class="card">
      <div class="head">
        <h2>2. Suggested combinations</h2>
        <button class="act" (click)="regenerate()" [disabled]="loading$ | async">New set</button>
      </div>

      @if (error$ | async; as err) { <p class="meta err">Error: {{ err }}</p> }

      @if (comboRows$ | async; as combos) {
        @if (combos.length) {
          <p class="meta lead">
            {{ (draws$ | async)?.length }} draws analysed &middot; {{ source$ | async }}
            &middot; win chance per combination <b>{{ chanceText$ | async }}</b> for every row
          </p>

          <div class="list">
            @for (c of combos; track c.nums.join('-')) {
              <div class="combo">
                <div class="top">
                  <span class="rank">#{{ c.rank }}</span>
                  <div class="balls">
                    @for (n of c.nums; track $index) {
                      <div class="ball">{{ (game$ | async) === '6d' ? n : pad(n) }}</div>
                    }
                  </div>
                  <div class="score">
                    <div class="bar" [class]="c.band.tone"><i [style.width.%]="c.pattern"></i></div>
                    <div class="label">
                      <b>{{ c.pattern | number:'1.0-0' }}%</b> &middot; {{ c.band.label }}
                    </div>
                  </div>
                  <div class="acts">
                    <button class="ghost" (click)="toggle(c.nums.join('-'))">
                      {{ open().has(c.nums.join('-')) ? 'Hide why' : 'Why' }}
                    </button>
                    <button class="ghost" (click)="copy(c)">{{ copied() === c.nums.join('-') ? 'Copied' : 'Copy' }}</button>
                  </div>
                </div>

                @if (open().has(c.nums.join('-'))) {
                  <div class="why">
                    <p class="meta">
                      How closely this set matches the shape of real past draws.
                      Closest past draw matched {{ c.similarity | number:'1.0-0' }}%
                      {{ c.nearestDate ? '(' + c.nearestDate + ')' : '' }}.
                    </p>
                    @for (m of c.metrics; track m.key) {
                      <div class="metric">
                        <div class="mrow">
                          <span class="mlabel">{{ m.label }}</span>
                          <span class="mval">{{ m.actual }} <em>vs</em> {{ m.typical }}</span>
                        </div>
                        <div class="mbar"><i [style.width.%]="m.value"></i></div>
                        <div class="meta">{{ m.plain }}</div>
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
          <p class="meta note">{{ rankingNote$ | async }}</p>
        } @else {
          <p class="meta">{{ (loading$ | async) ? 'Loading draw history...' : 'Not enough draw history for this game.' }}</p>
        }
      }
    </div>
  `,
  styles: [`
    .card{display:flex;flex-direction:column;min-height:0;flex:1}
    .head{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex:0 0 auto}
    .lead{flex:0 0 auto}
    .err{color:#b91c1c}
    .list{flex:1 1 auto;min-height:0;overflow:auto;padding-right:.2rem}
    .combo{border:1px solid var(--line);border-radius:10px;padding:.5rem .6rem;margin-bottom:.5rem;background:#fff}
    .top{display:grid;grid-template-columns:1.8rem 1fr minmax(9rem,13rem) auto;gap:.6rem;align-items:center}
    .rank{color:var(--mut);font-size:.8rem}
    .balls{display:flex;gap:.3rem;flex-wrap:wrap}
    .ball{width:2.15rem;height:2.15rem;border-radius:50%;color:#fff;display:grid;place-items:center;
          font-weight:700;font-size:.82rem;background:radial-gradient(circle at 30% 30%,#ef6a5b,var(--red))}
    .score{min-width:0}
    .bar{height:6px;border-radius:99px;background:#eceff3;overflow:hidden}
    .bar i{display:block;height:100%}
    .bar.high i{background:#16a34a}
    .bar.mid i{background:#eab308}
    .bar.low i{background:#ef4444}
    .label{font-size:.72rem;color:var(--mut);margin-top:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .acts{display:flex;gap:.3rem}
    .why{margin-top:.5rem;border-top:1px dashed var(--line);padding-top:.5rem}
    .metric{margin-bottom:.45rem}
    .mrow{display:flex;justify-content:space-between;gap:.5rem;font-size:.78rem}
    .mlabel{color:var(--dark)}
    .mval em{color:var(--mut);font-style:normal}
    .mbar{height:4px;border-radius:99px;background:#eceff3;overflow:hidden;margin:.15rem 0}
    .mbar i{display:block;height:100%;background:var(--red)}
    .note{flex:0 0 auto;background:#fff6e0;border-radius:8px;padding:.5rem .7rem;margin:.5rem 0 0}
    @media(max-width:760px){.top{grid-template-columns:1.5rem 1fr;row-gap:.4rem}
      .score,.acts{grid-column:2}}
  `],
})
export class CombosComponent {
  private store = inject(Store);
  readonly game$ = this.store.select(selectGame);
  readonly comboRows$ = this.store.select(selectComboRows);
  readonly draws$ = this.store.select(selectDraws);
  readonly loading$ = this.store.select(selectLoading);
  readonly source$ = this.store.select(selectSource);
  readonly error$ = this.store.select(selectError);
  readonly chanceText$ = this.store.select(selectChanceText);
  readonly rankingNote$ = this.store.select(selectRankingNote);

  readonly copied = signal('');
  readonly open = signal<Set<string>>(new Set());

  pad = (n: number) => String(n).padStart(2, '0');

  regenerate(): void { this.store.dispatch(LotteryActions.generate()); }

  toggle(key: string): void {
    const s = new Set(this.open());
    s.has(key) ? s.delete(key) : s.add(key);
    this.open.set(s);
  }

  copy(c: Row): void {
    const game = this.store.selectSignal(selectGame)();
    const text = c.nums.map(n => (game === '6d' ? String(n) : this.pad(n))).join(game === '6d' ? ' ' : '-');
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(c.nums.join('-'));
      setTimeout(() => this.copied.set(''), 1200);
    });
  }
}
