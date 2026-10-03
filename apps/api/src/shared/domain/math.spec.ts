import { ratio, round } from './math';

describe('math', () => {
  it('arredonda para as casas pedidas', () => {
    expect(round(2.345678, 2)).toBe(2.35);
  });

  it('retorna null em razão com denominador zero', () => {
    expect(ratio(1, 0)).toBeNull();
    expect(ratio(1, 4)).toBe(0.25);
  });
});
