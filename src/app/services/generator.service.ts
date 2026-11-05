import { Injectable, inject } from '@angular/core';
import { AnalysisService } from './analysis.service';
import { Draw, GAMES, GameKey, Scored, round } from '../core/lottery.model';

@Injectable({ providedIn: 'root' })
export class GeneratorService {
  private analysis = inject(AnalysisService);

  generate(game: GameKey, draws: Draw[], count = 5): Scored[] {
    return game === '6d' ? this.digits(draws, count) : this.sets(game, draws, count);
  }

  private weightedPick(w: number[], max: number, k: number): number[] {
    const pool = w.slice(), out: number[] = [];
    while (out.length < k) {
      const total = pool.reduce((a, b) => a + b, 0);
      let t = Math.random() * total, n = 1;
      for (; n < max; n++) { t -= pool[n]; if (t <= 0) break; }
      out.push(n);
      pool[n] = 0;
    }
    return out.sort((a, b) => a - b);
  }

  private sets(game: GameKey, draws: Draw[], count: number): Scored[] {
    const g = GAMES[game];
    const w = this.analysis.weights(draws, g.pool);
    const shape = this.analysis.shape(draws);
    const lo = Math.min(...shape.sum), hi = Math.max(...shape.sum);
    const pop = this.analysis.popularity(draws);
    const maxPop = Math.max(1, ...pop.values());
    const crowdOf = (nums: number[]) =>
      nums.reduce((acc, n) => acc * (0.5 + (pop.get(n) ?? 0) / maxPop), 1) ** (1 / nums.length);

    const seen = new Set<string>();
    const pool: { s: Scored; crowd: number }[] = [];

    for (let i = 0; i < 60000 && pool.length < count * 12; i++) {
      const nums = this.weightedPick(w, g.pool, g.pick);
      const key = nums.join();
      if (seen.has(key)) continue;
      const sum = nums.reduce((a, b) => a + b, 0);
      if (sum < lo || sum > hi) continue;
      let run = 1, maxRun = 1;
      for (let j = 1; j < nums.length; j++) {
        run = nums[j] === nums[j - 1] + 1 ? run + 1 : 1;
        maxRun = Math.max(maxRun, run);
      }
      if (maxRun > 3) continue;
      seen.add(key);
      const { pattern, metrics } = this.analysis.score(nums, shape, g);
      const { similarity, nearestDate } = this.analysis.similarity(nums, draws);
      pool.push({ s: { nums, pattern, metrics, similarity, nearestDate }, crowd: crowdOf(nums) });
    }

    return pool
      .sort((a, b) => (b.s.pattern - a.s.pattern) || (a.crowd - b.crowd))
      .slice(0, count)
      .map(x => x.s);
  }

  private digits(draws: Draw[], count: number): Scored[] {
    const pos = Array.from({ length: 6 }, () => new Array(10).fill(0.05));
    draws.forEach((d, i) => {
      const ds = d.nums.length === 6 ? d.nums : String(d.nums[0]).padStart(6, '0').split('').map(Number);
      ds.forEach((ch, p) => { if (p < 6) pos[p][ch] += Math.exp(-i / 120) + 0.02; });
    });

    const out: Scored[] = [];
    for (let i = 0; i < count; i++) {
      const digits = pos.map(col => {
        const total = col.reduce((a, b) => a + b, 0);
        let t = Math.random() * total, d = 0;
        for (; d < 9; d++) { t -= col[d]; if (t <= 0) break; }
        return d;
      });
      const fit = round(100 * (digits.reduce((a, d, p) => a + d * 0 + (pos[p][d] / Math.max(...pos[p])), 0) / 6));
      const metrics = digits.map((d, p) => ({
        key: `p${p}`,
        label: `Digit ${p + 1}`,
        actual: `${d}`,
        typical: `${pos[p].indexOf(Math.max(...pos[p]))}`,
        value: round(fit),
        plain: `Position ${p + 1} shows ${d}. This slot's most frequent digit in past draws is ${pos[p].indexOf(Math.max(...pos[p]))}.`,
      }));
      out.push({ nums: digits, pattern: fit, metrics, similarity: 0, nearestDate: '' });
    }
    return out.sort((a, b) => b.pattern - a.pattern);
  }
}
