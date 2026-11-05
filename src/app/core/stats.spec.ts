import { combinations, baseChance, stdev, GAMES } from './lottery.model';

describe('lottery maths', () => {
  it('counts 6/58 combinations', () => expect(combinations(58, 6)).toBe(40475358));
  it('counts 6/42 combinations', () => expect(combinations(42, 6)).toBe(5245786));
  it('exposes identical odds for every combination', () => {
    expect(baseChance(GAMES.ultra)).toBeCloseTo(1 / 40475358, 15);
  });
  it('computes standard deviation', () => expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 5));
});
