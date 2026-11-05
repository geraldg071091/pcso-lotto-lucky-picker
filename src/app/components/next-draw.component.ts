import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { interval, map, startWith, switchMap } from 'rxjs';
import { Store } from '@ngrx/store';
import { LotteryApiService } from '../services/lottery-api.service';
import { GAMES, GameKey } from '../core/lottery.model';
import { selectGame } from '../store/lottery.selectors';

const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const phNow = () => new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));

@Component({
  selector: 'app-next-draw',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, DatePipe],
  template: `
    <div class="card row">
      <div class="who">
        <h2>{{ (meta$ | async)?.name }}</h2>
        <div class="meta">
          @if (next$ | async; as nd) {
            Next draw {{ nd.drawAt | date:'EEE, MMM d, h:mm a' }} PHT
          } @else { Schedule unavailable }
        </div>
      </div>
      <div class="cd">
        @for (u of countdown$ | async; track u.label) {
          <div><b>{{ u.value }}</b><span>{{ u.label }}</span></div>
        }
      </div>
    </div>
  `,
  styles: [`
    .row{display:flex;justify-content:space-between;align-items:center;gap:.8rem;flex-wrap:wrap;flex:0 0 auto}
    .who{min-width:0}
    .cd{display:flex;gap:.35rem}
    .cd div{background:var(--dark);color:#fff;border-radius:7px;padding:.3rem .5rem;text-align:center;min-width:2.9rem}
    .cd b{display:block;font-size:1.1rem}
    .cd span{font-size:.6rem;opacity:.7}
  `],
})
export class NextDrawComponent {
  private api = inject(LotteryApiService);
  private store = inject(Store);
  private game$ = this.store.select(selectGame);
  readonly meta$ = this.game$.pipe(map((g: GameKey) => GAMES[g]));

  readonly next$ = this.game$.pipe(
    switchMap(game => this.api.schedule().pipe(map(entries => {
      const g = GAMES[game];
      const e = entries.find(x => g.slug.test(x.game_slug));
      if (!e) return null;
      const days = e.normal_draw_days.toLowerCase().split(/[;,]/).map(d => d.trim());
      const tm = e.normal_draw_times_pht.split(';')[0].match(/(\d+):(\d+)\s*(AM|PM)/i);
      const h = tm ? (+tm[1] % 12) + (/pm/i.test(tm[3]) ? 12 : 0) : 21;
      const m = tm ? +tm[2] : 0;
      const now = phNow();
      for (let i = 0; i < 8; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        d.setHours(h, m, 0, 0);
        if (d > now && (days.includes('daily') || days.includes(DAYS[d.getDay()]))) {
          return { drawAt: d };
        }
      }
      return null;
    }))),
  );

  readonly countdown$ = interval(1000).pipe(
    startWith(0),
    switchMap(() => this.next$),
    map(nd => {
      if (!nd) return [];
      const s = Math.max(0, Math.floor((nd.drawAt.getTime() - phNow().getTime()) / 1000));
      return [
        { value: String(Math.floor(s / 86400)).padStart(2, '0'), label: 'days' },
        { value: String(Math.floor((s % 86400) / 3600)).padStart(2, '0'), label: 'hrs' },
        { value: String(Math.floor((s % 3600) / 60)).padStart(2, '0'), label: 'min' },
        { value: String(s % 60).padStart(2, '0'), label: 'sec' },
      ];
    }),
  );
}
