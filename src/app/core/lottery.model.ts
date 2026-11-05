export type GameKey = 'ultra' | 'grand' | 'super' | 'mega' | 'l642' | '6d';

export interface Draw {
  date: string;
  nums: number[];
  jackpot?: string;   // raw text exactly as PCSO published it
  winners?: string;
}

export interface GameMeta {
  key: GameKey; name: string; blurb: string; pool: number; pick: number;
  slug: RegExp; label: string; digits: boolean;
}

export const GAMES: Record<GameKey, GameMeta> = {
  ultra: { key:'ultra', name:'Ultra Lotto 6/58', blurb:'Pick 6 of 58', pool:58, pick:6, slug:/658/, label:'6/58', digits:false },
  grand: { key:'grand', name:'Grand Lotto 6/55', blurb:'Pick 6 of 55', pool:55, pick:6, slug:/655/, label:'6/55', digits:false },
  super: { key:'super', name:'Super Lotto 6/49', blurb:'Pick 6 of 49', pool:49, pick:6, slug:/649/, label:'6/49', digits:false },
  mega:  { key:'mega',  name:'Mega Lotto 6/45',  blurb:'Pick 6 of 45', pool:45, pick:6, slug:/645/, label:'6/45', digits:false },
  l642:  { key:'l642',  name:'Lotto 6/42',       blurb:'Pick 6 of 42', pool:42, pick:6, slug:/642/, label:'6/42', digits:false },
  '6d':  { key:'6d',    name:'6D Lotto',         blurb:'6 digits, 0-9', pool:10, pick:6, slug:/^6d/, label:'6D', digits:true },
};

export const GAME_KEYS = Object.keys(GAMES) as GameKey[];

/* ---------- honest-metrics helpers ---------- */

export function combinations(pool: number, pick: number): number {
  let n = 1;
  for (let i = 0; i < pick; i++) n = n * (pool - i) / (i + 1);
  return Math.round(n);
}

/** Exact probability of any single combination. All picks share this. */
export function baseChance(g: GameMeta): number {
  return g.digits ? 1 / 1e6 : 1 / combinations(g.pool, g.pick);
}

/* ---------- PESO DISPLAY ---------- */

/**
 * Only formats a value that is unambiguously a peso amount.
 * Anything else (blank, "-", a bare number with no currency marker that is
 * clearly a count) is returned untouched so the UI can show a dash instead
 * of inventing a jackpot.
 */
export function formatPeso(raw?: string | number | null): string {
  if (raw === undefined || raw === null) return '';
  if (typeof raw === 'number') {
    if (!isFinite(raw) || raw <= 0) return '';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency', currency: 'PHP', minimumFractionDigits: 2,
    }).format(raw);
  }
  const text = String(raw).trim();
  if (!text || /^[-–—]+$/.test(text) || /^(n\/?a|tbd|pending)$/i.test(text)) return '';

  // PCSO publishes amounts like "₱34,567,890.00", "PHP 34,567,890.00" or
  // plain "34,567,890.00". Trailing words such as " (est.)" are dropped.
  const amount = text.match(/(?:php|₱|p)\s*([\d,]+(?:\.\d{1,2})?)/i)
    ?? text.match(/([\d,]+(?:\.\d{1,2})?)/);
  if (!amount) return '';
  const value = Number(amount[1].replace(/,/g, ''));
  if (!isFinite(value) || value <= 0) return '';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency', currency: 'PHP', minimumFractionDigits: 2,
  }).format(value);
}

/** Winner counts are plain integers; never currency-formatted. */
export function formatCount(raw?: string | number | null): string {
  if (raw === undefined || raw === null) return '';
  const text = String(raw).trim();
  if (!text || /^[-–—]+$/.test(text) || /^(n\/?a)$/i.test(text)) return '';
  const n = Number(text.replace(/[^\d]/g, ''));
  if (!isFinite(n) || n <= 0) return '';
  return new Intl.NumberFormat('en-PH').format(n);
}

export interface Metric {
  key: string;
  label: string;
  /** 0..100 — how close this set sits to the historical average for this trait */
  value: number;
  /** The set's own value, e.g. "sum 168" */
  actual: string;
  /** The historical typical value, e.g. "avg 158" */
  typical: string;
  /** One plain sentence, no jargon. */
  plain: string;
}

export interface Scored {
  nums: number[];
  pattern: number;      // 0..100 typicality vs history
  metrics: Metric[];
  similarity: number;   // best historical match, 0..100
  nearestDate: string;
}

export function mean(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}

export function stdev(a: number[]): number {
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
}

export function round(v: number, d = 1): number {
  const p = 10 ** d;
  return Math.round(v * p) / p;
}

/** Plain-language band for a pattern score, so the number means something. */
export function patternBand(score: number): { label: string; tone: 'high' | 'mid' | 'low' } {
  if (score >= 75) return { label: 'Very typical of past draws', tone: 'high' };
  if (score >= 55) return { label: 'Typical of past draws', tone: 'mid' };
  if (score >= 35) return { label: 'Somewhat unusual', tone: 'mid' };
  return { label: 'Unusual shape', tone: 'low' };
}
