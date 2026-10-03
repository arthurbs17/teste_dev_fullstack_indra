import { OccupancyRate } from './occupancy-rate';

describe('OccupancyRate', () => {
  it('calcula a fração de leitos ocupados com 4 casas', () => {
    expect(OccupancyRate.of(3, 15).value).toBe(0.2);
    expect(OccupancyRate.of(1, 3).value).toBe(0.3333);
  });

  it('retorna 0 quando não há leitos', () => {
    expect(OccupancyRate.of(0, 0).value).toBe(0);
  });

  it('não limita a 1 para que inconsistências fiquem visíveis', () => {
    expect(OccupancyRate.of(12, 10).value).toBe(1.2);
  });

  it('rejeita valores negativos', () => {
    expect(() => OccupancyRate.of(-1, 10)).toThrow(RangeError);
  });
});
