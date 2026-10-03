import { Admission, AdmissionProps } from './admission';
import { Exam } from './exam';
import { ageInYears } from './patient';

const reference = new Date('2026-10-03T12:00:00.000Z');

const props = (overrides: Partial<AdmissionProps>): AdmissionProps => ({
  id: 1,
  patient: { id: 1, name: 'Paciente', document: 'PAC-0001' },
  department: { id: 5, name: 'Cirurgia' },
  attendingStaff: null,
  bedNumber: 2,
  admissionDate: new Date('2026-10-01T12:00:00.000Z'),
  dischargeDate: null,
  status: 'internado',
  diagnosis: null,
  ...overrides,
});

describe('Admission', () => {
  it('conta a internação ativa até a data de referência', () => {
    expect(new Admission(props({})).lengthOfStayDays(reference)).toBe(2);
  });

  it('conta a internação encerrada até a alta', () => {
    const admission = new Admission(
      props({ status: 'alta', dischargeDate: new Date('2026-10-02T00:00:00.000Z') }),
    );
    expect(admission.lengthOfStayDays(reference)).toBe(0.5);
  });

  it('limita altas com data futura à data de referência', () => {
    const admission = new Admission(
      props({ status: 'alta', dischargeDate: new Date('2026-10-09T00:00:00.000Z') }),
    );
    expect(admission.effectiveEnd(reference)).toBe(reference);
    expect(admission.lengthOfStayDays(reference)).toBe(2);
  });

  it('nunca retorna duração negativa', () => {
    const admission = new Admission(props({ admissionDate: new Date('2026-10-05T00:00:00.000Z') }));
    expect(admission.lengthOfStayDays(reference)).toBe(0);
  });
});

describe('ageInYears', () => {
  it('considera se o aniversário já passou no ano', () => {
    expect(ageInYears(new Date('1980-10-03T00:00:00.000Z'), reference)).toBe(46);
    expect(ageInYears(new Date('1980-10-04T00:00:00.000Z'), reference)).toBe(45);
  });
});

describe('Exam', () => {
  const base = {
    id: 1,
    examType: 'Hemograma completo',
    requestedAt: new Date('2026-10-01T08:00:00.000Z'),
    status: 'concluido' as const,
    resultValue: 'Normal',
  };

  it('calcula o tempo até o resultado em horas', () => {
    const exam = new Exam({ ...base, resultAt: new Date('2026-10-01T14:30:00.000Z') });
    expect(exam.turnaroundHours).toBe(6.5);
  });

  it('retorna null sem resultado', () => {
    expect(new Exam({ ...base, resultAt: null, status: 'solicitado' }).turnaroundHours).toBeNull();
  });
});
