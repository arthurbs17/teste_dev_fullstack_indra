import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dia UTC relativo a hoje (0 = hoje), no formato YYYY-MM-DD. */
export function utcDay(offset: number): string {
  return new Date(Date.now() + offset * DAY_MS).toISOString().slice(0, 10);
}

function at(dayOffset: number, hour: number): Date {
  return new Date(`${utcDay(dayOffset)}T${String(hour).padStart(2, '0')}:00:00.000Z`);
}

/**
 * Departamento isolado com 2 leitos e uma linha do tempo controlada (D = hoje):
 *
 *   A  leito 1  internado   desde D-3 10h
 *   B  leito 2  alta        D-3 22h → D-1 22h   (2 dias exatos)
 *   C  leito 1  alta futura D-1 10h → D+3 10h   (sobrepõe A no mesmo leito)
 *
 * Valores esperados não dependem da hora em que o teste roda.
 */
export interface CensusFixture {
  departmentId: number;
  admissionIds: { a: number; b: number; c: number };
  cleanup(): Promise<void>;
}

export async function createCensusFixture(prisma: PrismaService): Promise<CensusFixture> {
  const department = await prisma.department.create({
    data: { name: 'Departamento de Teste', totalBeds: 2 },
  });
  const patient = await prisma.patient.create({
    data: {
      name: 'Paciente Fixture',
      birthDate: new Date('1980-01-15T00:00:00.000Z'),
      gender: 'F',
      document: `TESTE-${department.id}`,
    },
  });

  const base = { patientId: patient.id, departmentId: department.id };
  const a = await prisma.admission.create({
    data: {
      ...base,
      bedNumber: 1,
      admissionDate: at(-3, 10),
      status: 'internado',
      diagnosis: 'Fixture 100% estável',
    },
  });
  const b = await prisma.admission.create({
    data: {
      ...base,
      bedNumber: 2,
      admissionDate: at(-3, 22),
      dischargeDate: at(-1, 22),
      status: 'alta',
      diagnosis: 'Fixture sepse',
    },
  });
  const c = await prisma.admission.create({
    data: {
      ...base,
      bedNumber: 1,
      admissionDate: at(-1, 10),
      dischargeDate: at(3, 10),
      status: 'alta',
      diagnosis: 'Fixture_alta_futura',
    },
  });

  await prisma.exam.createMany({
    data: [
      {
        admissionId: a.id,
        examType: 'Hemograma completo',
        requestedAt: at(-3, 12),
        resultAt: at(-3, 18),
        status: 'concluido',
        resultValue: 'Normal',
      },
      { admissionId: a.id, examType: 'Glicemia', requestedAt: at(-2, 8), status: 'solicitado' },
    ],
  });
  await prisma.vitalSign.createMany({
    data: [
      { admissionId: a.id, measuredAt: at(-2, 6), heartRate: 80, temperature: 36.5 },
      { admissionId: a.id, measuredAt: at(-3, 12), heartRate: 95, temperature: 38.1 },
    ],
  });

  return {
    departmentId: department.id,
    admissionIds: { a: a.id, b: b.id, c: c.id },
    async cleanup() {
      const admissionIds = [a.id, b.id, c.id];
      await prisma.exam.deleteMany({ where: { admissionId: { in: admissionIds } } });
      await prisma.vitalSign.deleteMany({ where: { admissionId: { in: admissionIds } } });
      await prisma.admission.deleteMany({ where: { id: { in: admissionIds } } });
      await prisma.patient.delete({ where: { id: patient.id } });
      await prisma.department.delete({ where: { id: department.id } });
    },
  };
}
