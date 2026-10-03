// biome-ignore-all lint/style/noNonNullAssertion: camada de dados mockados, será substituída pela integração com a API
// Dados mockados que imitam as respostas da API NestJS (/api/v1).
// Gerados de forma determinística e preguiçosa (sem aleatoriedade no escopo do módulo).

export type AdmissionStatus = 'internado' | 'alta' | 'obito' | 'transferido';

export interface Department {
  id: number;
  name: string;
  totalBeds: number;
}
export interface Professional {
  id: number;
  name: string;
  specialty: string;
  crm: string;
}
export interface Patient {
  id: number;
  name: string;
  birthDate: string;
  gender: 'M' | 'F';
  cpf: string;
}
export interface Exam {
  id: number;
  type: string;
  status: 'concluido' | 'pendente';
  requestedAt: string;
  resultAt: string | null;
  result: string | null;
}
export interface Vital {
  measuredAt: string;
  heartRate: number;
  systolic: number;
  diastolic: number;
  temperature: number;
  spo2: number;
}
export interface Admission {
  id: number;
  patient: Patient;
  department: Department;
  doctor: Professional;
  bed: number;
  status: AdmissionStatus;
  admissionDate: string;
  dischargeDate: string | null;
  diagnosis: string;
  exams: Exam[];
  vitals: Vital[];
}

const DEPTS: Department[] = [
  { id: 1, name: 'Cardiologia', totalBeds: 12 },
  { id: 2, name: 'Cirurgia', totalBeds: 16 },
  { id: 3, name: 'Clínica Médica', totalBeds: 20 },
  { id: 4, name: 'Pediatria', totalBeds: 10 },
  { id: 5, name: 'UTI', totalBeds: 8 },
];
const FIRST = [
  'Ana',
  'Bruno',
  'Carla',
  'Daniel',
  'Eduarda',
  'Felipe',
  'Gabriela',
  'Henrique',
  'Isabela',
  'João',
  'Larissa',
  'Marcos',
  'Natália',
  'Otávio',
  'Paula',
  'Rafael',
  'Sofia',
  'Tiago',
  'Vitória',
  'Lucas',
];
const LAST = [
  'Silva',
  'Souza',
  'Oliveira',
  'Santos',
  'Pereira',
  'Lima',
  'Costa',
  'Ferreira',
  'Almeida',
  'Ribeiro',
  'Carvalho',
  'Gomes',
];
const SPECIALTIES = [
  'Cardiologista',
  'Cirurgião Geral',
  'Clínico Geral',
  'Pediatra',
  'Intensivista',
];
const DIAG = [
  'Pneumonia comunitária',
  'Insuficiência cardíaca',
  'Apendicite aguda',
  'Colecistite',
  'Bronquiolite',
  'Sepse',
  'Infarto agudo do miocárdio',
  'Fratura de fêmur',
  'AVC isquêmico',
  'Diabetes descompensado',
];
const EXAMS = [
  'Hemograma',
  'PCR',
  'Raio-X de tórax',
  'Tomografia',
  'Eletrocardiograma',
  'Gasometria',
  'Ureia e creatinina',
  'Ecocardiograma',
];

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const DAY = 86400000;

let cache: { admissions: Admission[]; now: number } | null = null;

export function getDb() {
  if (cache) return cache;
  const r = rng(42);
  const pick = <T>(a: T[]): T => a[Math.floor(r() * a.length)]!;
  const now = Date.now();
  const pros: Professional[] = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1,
    name: `Dr(a). ${pick(FIRST)} ${pick(LAST)}`,
    specialty: SPECIALTIES[i % 5] ?? '',
    crm: `CRM-CE ${10000 + Math.floor(r() * 89999)}`,
  }));
  const patients: Patient[] = Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    name: `${pick(FIRST)} ${pick(LAST)} ${pick(LAST)}`,
    birthDate: new Date(now - (1 + r() * 85) * 365 * DAY).toISOString(),
    gender: r() > 0.5 ? 'M' : 'F',
    cpf: `***.${100 + Math.floor(r() * 899)}.${100 + Math.floor(r() * 899)}-**`,
  }));
  const admissions: Admission[] = Array.from({ length: 40 }, (_, i) => {
    const dept = DEPTS[Math.floor(r() * 5)]!;
    const start = now - Math.floor(r() * 60 * DAY);
    const stay = (1 + r() * 14) * DAY;
    const roll = r();
    const status: AdmissionStatus =
      roll < 0.18 ? 'internado' : roll < 0.9 ? 'alta' : roll < 0.95 ? 'obito' : 'transferido';
    let end: number | null = start + stay;
    if (status === 'internado') end = null;
    else if (end > now) end = now - DAY * r();
    const effEnd = end ?? now;
    const exams: Exam[] = Array.from({ length: 1 + Math.floor(r() * 3) }, (_, k) => {
      const req = start + r() * (effEnd - start);
      const done = r() > 0.15 || status !== 'internado';
      return {
        id: i * 10 + k,
        type: pick(EXAMS),
        status: done ? 'concluido' : 'pendente',
        requestedAt: new Date(req).toISOString(),
        resultAt: done ? new Date(req + (2 + r() * 30) * 3600000).toISOString() : null,
        result: done ? pick(['Normal', 'Alterado', 'Sem achados relevantes', 'Ver laudo']) : null,
      };
    });
    const nV = Math.max(3, Math.min(10, Math.round((effEnd - start) / DAY)));
    const vitals: Vital[] = Array.from({ length: nV }, (_, k) => ({
      measuredAt: new Date(start + ((effEnd - start) * k) / Math.max(1, nV - 1)).toISOString(),
      heartRate: Math.round(70 + r() * 35),
      systolic: Math.round(110 + r() * 35),
      diastolic: Math.round(65 + r() * 25),
      temperature: +(36 + r() * 2.4).toFixed(1),
      spo2: Math.round(91 + r() * 8),
    }));
    return {
      id: i + 1,
      patient: pick(patients),
      department: dept,
      doctor: pros[dept.id - 1 + 5 * Math.floor(r() * 3)]!,
      bed: 1 + Math.floor(r() * dept.totalBeds),
      status,
      admissionDate: new Date(start).toISOString(),
      dischargeDate: end ? new Date(end).toISOString() : null,
      diagnosis: pick(DIAG),
      exams,
      vitals,
    };
  });
  cache = { admissions, now };
  return cache;
}

export const departments = () => DEPTS;
