// biome-ignore-all lint/style/noNonNullAssertion: camada de dados mockados, será substituída pela integração com a API
// Cliente da API. Hoje responde com dados mockados; para usar a API real,
// troque cada função por um fetch em `${API_URL}/api/v1/...` mantendo os tipos.
import { type Admission, type AdmissionStatus, departments, getDb } from './mock';

const DAY = 86400000;
const delay = <T>(v: T) => new Promise<T>((res) => setTimeout(() => res(v), 120));

export interface Period {
  from: string;
  to: string;
}
export function defaultPeriod(days = 30): Period {
  const to = new Date();
  const from = new Date(to.getTime() - days * DAY);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const overlaps = (a: Admission, from: number, to: number, now: number) =>
  new Date(a.admissionDate).getTime() <= to &&
  (a.dischargeDate ? new Date(a.dischargeDate).getTime() : now) >= from;

export async function getDepartments() {
  return delay(departments());
}

export async function getKpis(p: Period) {
  const { admissions, now } = getDb();
  const from = new Date(p.from).getTime(),
    to = new Date(p.to).getTime() + DAY;
  const inPeriod = admissions.filter((a) => {
    const t = new Date(a.admissionDate).getTime();
    return t >= from && t < to;
  });
  const active = admissions.filter((a) => a.status === 'internado');
  const beds = departments().reduce((s, d) => s + d.totalBeds, 0);
  const occupiedBeds = new Set(active.map((a) => `${a.department.id}-${a.bed}`)).size;
  const closed = inPeriod.filter((a) => a.dischargeDate);
  const avgStay = closed.length
    ? closed.reduce(
        (s, a) =>
          s +
          (Math.min(new Date(a.dischargeDate!).getTime(), now) -
            new Date(a.admissionDate).getTime()),
        0,
      ) /
      closed.length /
      DAY
    : 0;
  const exams = admissions.flatMap((a) => a.exams);
  const doneExams = exams.filter((e) => e.resultAt);
  const avgResultH = doneExams.length
    ? doneExams.reduce(
        (s, e) => s + (new Date(e.resultAt!).getTime() - new Date(e.requestedAt).getTime()),
        0,
      ) /
      doneExams.length /
      3600000
    : 0;
  const deaths = closed.filter((a) => a.status === 'obito').length;
  return delay({
    occupancyRate: beds ? occupiedBeds / beds : 0,
    occupiedBeds,
    totalBeds: beds,
    activeAdmissions: active.length,
    avgLengthOfStayDays: avgStay,
    pendingExams: exams.filter((e) => e.status === 'pendente').length,
    avgExamResultHours: avgResultH,
    mortalityRate: closed.length ? deaths / closed.length : 0,
    admissionsInPeriod: inPeriod.length,
  });
}

export async function getDepartmentOccupancy() {
  const { admissions } = getDb();
  return delay(
    departments().map((d) => {
      const occupied = new Set(
        admissions
          .filter((a) => a.status === 'internado' && a.department.id === d.id)
          .map((a) => a.bed),
      ).size;
      return {
        departmentId: d.id,
        name: d.name,
        totalBeds: d.totalBeds,
        occupiedBeds: occupied,
        rate: occupied / d.totalBeds,
      };
    }),
  );
}

export async function getDailyCensus(p: Period, departmentId?: number) {
  const { admissions, now } = getDb();
  const out: { date: string; occupiedBeds: number; admissions: number; discharges: number }[] = [];
  for (let t = new Date(p.from).getTime(); t <= new Date(p.to).getTime(); t += DAY) {
    const list = admissions.filter((a) => !departmentId || a.department.id === departmentId);
    const occ = new Set(
      list
        .filter((a) => overlaps(a, t, t + DAY - 1, now))
        .map((a) => `${a.department.id}-${a.bed}`),
    ).size;
    const adm = list.filter((a) => {
      const x = new Date(a.admissionDate).getTime();
      return x >= t && x < t + DAY;
    }).length;
    const dis = list.filter(
      (a) =>
        a.dischargeDate &&
        (() => {
          const x = new Date(a.dischargeDate!).getTime();
          return x >= t && x < t + DAY;
        })(),
    ).length;
    out.push({
      date: new Date(t).toISOString().slice(0, 10),
      occupiedBeds: occ,
      admissions: adm,
      discharges: dis,
    });
  }
  return delay(out);
}

export type SortField = 'admissionDate' | 'patient' | 'department' | 'status';
export interface AdmissionsQuery {
  status?: AdmissionStatus | undefined;
  departmentId?: number | undefined;
  search?: string | undefined;
  from?: string | undefined;
  to?: string | undefined;
  page: number;
  pageSize: number;
  sort: SortField;
  order: 'asc' | 'desc';
}

export async function listAdmissions(q: AdmissionsQuery) {
  let list = getDb().admissions.slice();
  if (q.status) list = list.filter((a) => a.status === q.status);
  if (q.departmentId) list = list.filter((a) => a.department.id === q.departmentId);
  if (q.search) {
    const s = q.search.toLowerCase();
    list = list.filter(
      (a) => a.patient.name.toLowerCase().includes(s) || a.diagnosis.toLowerCase().includes(s),
    );
  }
  if (q.from) list = list.filter((a) => a.admissionDate.slice(0, 10) >= q.from!);
  if (q.to) list = list.filter((a) => a.admissionDate.slice(0, 10) <= q.to!);
  const key = (a: Admission) =>
    q.sort === 'patient'
      ? a.patient.name
      : q.sort === 'department'
        ? a.department.name
        : q.sort === 'status'
          ? a.status
          : a.admissionDate;
  list.sort((a, b) => key(a).localeCompare(key(b)) * (q.order === 'asc' ? 1 : -1));
  const start = (q.page - 1) * q.pageSize;
  return delay({
    data: list.slice(start, start + q.pageSize),
    total: list.length,
    page: q.page,
    pageSize: q.pageSize,
  });
}

export async function getAdmission(id: number) {
  return delay(getDb().admissions.find((a) => a.id === id) ?? null);
}
