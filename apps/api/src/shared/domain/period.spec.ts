import { BusinessRuleViolationError } from './domain-error';
import { Period } from './period';

const reference = new Date('2026-10-03T15:30:00.000Z');

describe('Period', () => {
  it('usa os últimos 30 dias até a data de referência por padrão', () => {
    const period = Period.resolve({}, reference);
    expect([period.from, period.to, period.days]).toEqual(['2026-09-04', '2026-10-03', 30]);
  });

  it('usa os 30 dias anteriores a "to" quando só ele é informado', () => {
    const period = Period.resolve({ to: '2026-06-30' }, reference);
    expect([period.from, period.to]).toEqual(['2026-06-01', '2026-06-30']);
  });

  it('expõe início e fim exclusivo em UTC', () => {
    const period = Period.resolve({ from: '2026-05-01', to: '2026-05-31' }, reference);
    expect(period.start.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(period.endExclusive.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('aceita período de um único dia', () => {
    expect(Period.resolve({ from: '2026-05-01', to: '2026-05-01' }, reference).days).toBe(1);
  });

  it('rejeita período invertido', () => {
    expect(() => Period.resolve({ from: '2026-05-10', to: '2026-05-01' }, reference)).toThrow(
      BusinessRuleViolationError,
    );
  });

  it('rejeita período maior que 366 dias', () => {
    expect(() => Period.resolve({ from: '2024-01-01', to: '2026-01-01' }, reference)).toThrow(
      BusinessRuleViolationError,
    );
  });

  it('recorta dias futuros', () => {
    const period = Period.resolve({ from: '2026-09-25', to: '2026-10-10' }, reference);
    expect(period.clampTo(reference).to).toBe('2026-10-03');
    expect(
      Period.resolve({ from: '2026-10-05', to: '2026-10-10' }, reference).clampTo(reference).to,
    ).toBe('2026-10-05');
  });
});
