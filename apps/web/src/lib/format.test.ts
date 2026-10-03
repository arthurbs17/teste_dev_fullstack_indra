import { describe, expect, it } from 'vitest';
import { fmtDate, fmtDays, fmtNum, fmtPct, periodStart } from './format';

describe('format', () => {
  it('formata percentuais e números em pt-BR, com traço para valores ausentes', () => {
    expect(fmtPct(0.2174)).toBe('21,7%');
    expect(fmtPct(null)).toBe('—');
    expect(fmtNum(4.75)).toBe('4,8');
    expect(fmtDays(null)).toBe('—');
  });

  it('exibe datas em UTC para não deslocar o dia', () => {
    expect(fmtDate('2026-10-01T23:30:00.000Z')).toBe('01/10/2026');
  });

  it('calcula o início dos últimos N dias contando hoje', () => {
    const now = new Date('2026-10-03T15:00:00.000Z');
    expect(periodStart(30, now)).toBe('2026-09-04');
    expect(periodStart(1, now)).toBe('2026-10-03');
  });
});
