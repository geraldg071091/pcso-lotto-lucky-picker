import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy } from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { Store } from '@ngrx/store';
import { GamePickerComponent } from './components/game-picker.component';
import { NextDrawComponent } from './components/next-draw.component';
import { CombosComponent } from './components/combos.component';
import { LatestResultComponent } from './components/latest-result.component';
import { HistoryTableComponent } from './components/history-table.component';
import { LotteryActions } from './store/lottery.actions';

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GamePickerComponent, NextDrawComponent, CombosComponent, LatestResultComponent, HistoryTableComponent],
  template: `
    <div class="app">
      <header class="top">
        <h1>PCSO Lotto Lucky Pick Generator</h1>
        <span class="tag">Data Source: PCSO</span>
      </header>
      <div class="layout">
        <app-game-picker />
        <section class="col wide">
          <app-next-draw />
          <app-combos />
        </section>
        <section class="col">
          <app-latest-result />
          <app-history-table />
        </section>
      </div>
    </div>
  `,
  styles: [`
    :host{display:block;height:100dvh;overflow:hidden}
    .app{display:flex;flex-direction:column;height:100dvh}
    .top{flex:0 0 auto;background:linear-gradient(90deg,#8e1b10,var(--red));color:#fff;
         padding:.6rem 1rem;display:flex;justify-content:space-between;align-items:center;gap:1rem}
    .top h1{font-size:1.1rem;margin:0}
    .tag{font-size:.75rem;color:#ffd9d4}
    .layout{flex:1 1 auto;min-height:0;display:grid;gap:.8rem;padding:.8rem;
            grid-template-columns:15rem minmax(0,1.05fr) minmax(0,1fr)}
    .col{display:flex;flex-direction:column;gap:.8rem;min-height:0;min-width:0}
    @media(max-width:1100px){
      .layout{grid-template-columns:1fr;overflow:auto}
      :host{height:auto;overflow:visible}
      .app{height:auto}
      .col{min-height:auto}
    }
  `],
})
export class AppComponent implements OnInit, OnDestroy {
  private store = inject(Store);
  private sub = new Subscription();

  ngOnInit(): void {
    this.store.dispatch(LotteryActions.loadDraws());
    this.sub.add(fromEvent(document, 'visibilitychange').subscribe(() => {
      if (document.visibilityState === 'visible') this.store.dispatch(LotteryActions.generate());
    }));
  }

  ngOnDestroy(): void { this.sub.unsubscribe(); }
}
