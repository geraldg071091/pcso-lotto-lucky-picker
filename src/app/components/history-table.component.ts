import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Store } from '@ngrx/store';
import { LotteryActions } from '../store/lottery.actions';
import { selectGame, selectHasMoreHistory, selectHistoryRows, selectSource } from '../store/lottery.selectors';

@Component({
  selector: 'app-history-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe],
  template: `
    <div class="card">
      <div class="head">
        <h2>3. Past results</h2>
        <span class="meta">{{ (source$ | async) === 'PCSO' ? 'PCSO data' : 'Backup data' }}</span>
      </div>
      <div class="wrap">
        <table>
          <thead>
            <tr><th>Date</th><th>Numbers</th><th>Jackpot / prize</th><th>Winners</th></tr>
          </thead>
          <tbody>
            @for (d of rows$ | async; track d.date + d.nums.join()) {
              <tr>
                <td class="date">{{ d.date }}</td>
                <td class="nums">{{ line(d.nums) }}</td>
                <td class="money">{{ d.jackpot || '-' }}</td>
                <td>{{ d.winners || '-' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (hasMore$ | async) {
        <p class="more"><button class="ghost" (click)="more()">Show 30 more</button></p>
      }
    </div>
  `,
  styles: [`
    .card{display:flex;flex-direction:column;min-height:0;flex:1}
    .head{display:flex;justify-content:space-between;align-items:center;gap:.6rem;flex:0 0 auto}
    .wrap{flex:1 1 auto;min-height:0;overflow:auto}
    table{width:100%;border-collapse:collapse;font-size:.8rem}
    th{position:sticky;top:0;background:#f3f4f6;text-align:left;padding:.4rem;z-index:1;font-size:.75rem}
    td{border-bottom:1px solid var(--line);padding:.35rem .4rem}
    .nums{font-weight:700;white-space:nowrap}
    .money{white-space:nowrap;color:var(--good)}
    .date{white-space:nowrap}
    .more{flex:0 0 auto;text-align:center;margin:.5rem 0 0}
  `],
})
export class HistoryTableComponent {
  private store = inject(Store);
  readonly rows$ = this.store.select(selectHistoryRows);
  readonly hasMore$ = this.store.select(selectHasMoreHistory);
  readonly source$ = this.store.select(selectSource);
  readonly game$ = this.store.select(selectGame);
  more(): void { this.store.dispatch(LotteryActions.showMoreHistory()); }
  line = (nums: number[]) => nums.map(n => String(n).padStart(2, '0')).join(' ');
}
