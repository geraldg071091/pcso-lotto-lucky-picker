import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, shareReplay, timeout } from 'rxjs/operators';
import { Draw, GAMES, GameKey, GameMeta } from '../core/lottery.model';

export type Source = 'PCSO' | 'LottoLens fallback';

export interface DrawSet { draws: Draw[]; source: Source; }

export interface ScheduleEntry {
  game_slug: string; game_name: string; normal_draw_days: string;
  normal_draw_times_pht: string; timezone: string;
}

const FALLBACK = 'https://remo65588-boop.github.io/lottolens-ph-public-data/api/v1/';
const PCSO = 'https://www.pcso.gov.ph/SearchLottoResult.aspx';

@Injectable({ providedIn: 'root' })
export class LotteryApiService {
  private cache = new Map<GameKey, Observable<DrawSet>>();
  private schedule$?: Observable<ScheduleEntry[]>;

  constructor(private http: HttpClient) {}

  /** PCSO first, LottoLens if the server proxy or PCSO fails. */
  draws(game: GameKey): Observable<DrawSet> {
    const hit = this.cache.get(game);
    if (hit) return hit;
    const req$ = this.proxy(game).pipe(
      catchError(() => this.fallback(game)),
      shareReplay(1),
    );
    this.cache.set(game, req$);
    return req$;
  }

  private proxy(game: GameKey): Observable<DrawSet> {
    const label = encodeURIComponent(GAMES[game].label);
    return this.http.get<{ draws: Draw[] }>(`/api/pcso?label=${label}`).pipe(
      timeout(180000),
      map(r => ({ draws: r.draws, source: 'PCSO' as Source })),
    );
  }

  private fallback(game: GameKey): Observable<DrawSet> {
    const g = GAMES[game];
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 9);
    return this.http.get<{ results: any[] }>(FALLBACK + 'results.json').pipe(
      timeout(180000),
      map(r => ({
        draws: r.results
          .filter(x => g.slug.test(x.lottery_slug) && new Date(x.draw_date) >= cutoff)
          .map(x => ({
            date: x.draw_date,
            nums: String(x.winning_numbers).match(/\d+/g)?.map(Number) ?? [],
            jackpot: x.jackpot_amount || '', winners: '',
          }))
          .sort((a, b) => b.date.localeCompare(a.date)),
        source: 'LottoLens fallback' as Source,
      })),
    );
  }

  schedule(): Observable<ScheduleEntry[]> {
    this.schedule$ ??= this.http.get<{ schedule: ScheduleEntry[] }>(FALLBACK + 'schedule.json')
      .pipe(timeout(30000), map(r => r.schedule), catchError(() => of([])), shareReplay(1));
    return this.schedule$;
  }

  /** Browser-only path: PCSO usually blocks this, kept as a last resort. */
  directPcso(game: GameKey): Observable<Draw[]> {
    const g: GameMeta = GAMES[game];
    return forkJoin([this.http.get(PCSO, { responseType: 'text' })]).pipe(
      map(([html]) => this.parsePcsoForm(html, g)),
    );
  }

  private parsePcsoForm(_html: string, _g: GameMeta): Draw[] {
    throw new Error('Direct PCSO access is blocked cross-origin; use the server proxy.');
  }
}
