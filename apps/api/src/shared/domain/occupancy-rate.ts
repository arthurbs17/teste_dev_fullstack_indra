/**
 * Taxa de ocupação (leitos ocupados / leitos totais), entre 0 e 1.
 * Não é limitada a 1: um valor acima disso indica inconsistência nos dados
 * (mais internações ativas que leitos) e deve ficar visível, não escondido.
 */
export class OccupancyRate {
  private constructor(readonly value: number) {}

  static of(occupiedBeds: number, totalBeds: number): OccupancyRate {
    if (occupiedBeds < 0 || totalBeds < 0) {
      throw new RangeError('Leitos não podem ser negativos');
    }
    if (totalBeds === 0) return new OccupancyRate(0);
    return new OccupancyRate(round(occupiedBeds / totalBeds, 4));
  }
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
