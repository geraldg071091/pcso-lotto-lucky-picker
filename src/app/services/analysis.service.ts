import { Injectable } from '@angular/core';
import { Draw, GameMeta, Metric, Scored, mean, stdev, round } from '../core/lottery.model';

interface Shape { sum: number[]; odd: number[]; span: number[]; dec: number[]; }

const LOW = [1, 2, 3, 4, 5, 6, 7, 8];
const HIGH_TAIL = 0.15;   // top 15% of each distribution counts as "outlier"

@Injectable({ providedIn: 'root' })
export class AnalysisService {

  /** Frequency, recency and gap weights per number, oldest -> newest draws. */
  weights(draws: Draw[], max: number): number[] {
    const w = new Array(max + 1).fill(0);
    const last = new Array(max + 1).fill(draws.length);
    const freq = new Array(max + 1).fill(0);
    const rec = new Array(max + 1).fill(0);
    draws.forEach((d, i) => d.nums.forEach(n => {
      if (n < 1 || n > max) return;
      freq[n]++;
      rec[n] += Math.exp(-i / 80);
      if (last[n] === draws.length) last[n] = i;
    }));
    const norm = (a: number[]) => { const m = Math.max(...a) || 1; return a.map(v => v / m); };
    const f = norm(freq), r = norm(rec), o = norm(last.map(v => Math.min(v / (max / 3), 1.5)));
    for (let n = 1; n <= max; n++) w[n] = 0.4 * f[n] + 0.35 * r[n] + 0.25 * o[n] + 0.05;
    return w;
  }

  histogram(draws: Draw[], max: number): number[] {
    const h = new Array(max + 1).fill(0);
    draws.forEach(d => d.nums.forEach(n => { if (n >= 1 && n <= max) h[n]++; }));
    return h;
  }

  shape(draws: Draw[]): Shape {
    return {
      sum: draws.map(d => d.nums.reduce((a, b) => a + b, 0)),
      odd: draws.map(d => d.nums.filter(n => n % 2).length),
      span: draws.map(d => Math.max(...d.nums) - Math.min(...d.nums)),
      dec: draws.map(d => d.nums.filter(n => n <= 9).length),
    };
  }

  /** 1.0 at the historical average, falling to 0 at roughly three sigma. */
  private closeness(value: number, pool: number[]): number {
    const m = mean(pool);
    const sd = stdev(pool) || 1;
    const z = Math.abs(value - m) / sd;
    return Math.max(0, 1 - z / 3);
  }

  /**
   * Scores how *typical* a set is against real past draws.
   * This is a shape measure only: it says nothing about the chance of winning.
   */
  score(nums: number[], s: Shape, g: GameMeta): { pattern: number; metrics: Metric[] } {
    const sum = nums.reduce((a, b) => a + b, 0);
    const odd = nums.filter(n => n % 2).length;
    const span = Math.max(...nums) - Math.min(...nums);
    const low = nums.filter(n => LOW.includes(n)).length;
    const avgSum = Math.round(mean(s.sum));
    const avgOdd = round(mean(s.odd), 1);
    const avgSpan = Math.round(mean(s.span));
    const avgLow = round(mean(s.dec), 1);

    const sumC = this.closeness(sum, s.sum);
    const oddC = this.closeness(odd, s.odd);
    const spanC = this.closeness(span, s.span);
    const lowC = this.closeness(low, s.dec);

    const pattern = 100 * (0.3 * sumC + 0.25 * oddC + 0.25 * spanC + 0.2 * lowC);

    const band = (c: number) =>
      c >= 0.8 ? 'spot on' : c >= 0.6 ? 'close' : c >= 0.4 ? 'a little off' : 'far off';
    const dir = (v: number, a: number) => (v === a ? 'exactly average' : v > a ? 'above average' : 'below average');

    const metrics: Metric[] = [
      { key:'sum', label:'Total of the 6 numbers', actual:`${sum}`, typical:`${avgSum}`,
        value: round(sumC * 100),
        plain:`Adding the six numbers gives ${sum}. Past winners averaged ${avgSum}, so this is ${band(sumC)}.` },
      { key:'odd', label:'Odd vs even', actual:`${odd} odd / ${6 - odd} even`, typical:`${avgOdd} odd`,
        value: round(oddC * 100),
        plain:`${odd} of the six are odd numbers. Past winners averaged ${avgOdd} odd, so this is ${band(oddC)}.` },
      { key:'span', label:'Spread (lowest to highest)', actual:`${span} apart`, typical:`${avgSpan} apart`,
        value: round(spanC * 100),
        plain:`The lowest and highest numbers sit ${span} apart. Past winners spanned about ${avgSpan}, so this is ${band(spanC)}.` },
      { key:'dec', label:'Numbers 1-8 included', actual:`${low} of them`, typical:`${avgLow} on average`,
        value: round(lowC * 100),
        plain:`${low} of the six are in 1-8, ${dir(low, Math.round(avgLow))}. Low numbers cluster on many play slips, which is why it matters.` },
    ];

    return { pattern, metrics };
  }

  /** How many numbers this set shares with its closest historical draw. */
  similarity(nums: number[], draws: Draw[]): { similarity: number; nearestDate: string } {
    let best = 0, date = '';
    for (const d of draws) {
      const shared = nums.filter(n => d.nums.includes(n)).length;
      if (shared > best) { best = shared; date = d.date; }
    }
    return { similarity: best / nums.length * 100, nearestDate: date };
  }

  /** How many times each number appears, used to keep picks off crowded shapes. */
  popularity(draws: Draw[]): Map<number, number> {
    const pop = new Map<number, number>();
    draws.forEach(d => d.nums.forEach(n => pop.set(n, (pop.get(n) ?? 0) + 1)));
    return pop;
  }
}
