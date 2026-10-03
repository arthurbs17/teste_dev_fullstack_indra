import { INT4_MAX } from '@hospital/contracts';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, FlaskConical, type LucideIcon, Stethoscope, User } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell, Card } from '@/components/AppShell';
import { RouteError } from '@/components/RouteError';
import { getAdmission } from '@/lib/api/functions';
import {
  EXAM_STATUS_CLASS,
  EXAM_STATUS_LABEL,
  fmtDate,
  fmtDateTime,
  fmtNum,
  ROLE_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
} from '@/lib/format';

const AXIS_TICK = { fontSize: 11, fill: 'var(--color-muted-foreground)' };

export const Route = createFileRoute('/internacoes/$id')({
  loader: async ({ params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0 || id > INT4_MAX) throw notFound();
    return { admission: await getAdmission({ data: { id } }) };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.admission.patient.name} — Internação #${loaderData.admission.id}`
          : 'Internação não encontrada',
      },
    ],
  }),
  errorComponent: RouteError,
  notFoundComponent: AdmissionNotFound,
  component: Detalhe,
});

function Detalhe() {
  const { admission: a } = Route.useLoaderData();
  const vitals = a.vitalSigns.map((v) => ({ ...v, label: fmtDateTime(v.measuredAt) }));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <BackLink />

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{a.patient.name}</h1>
            <p className="text-sm text-muted-foreground">
              {a.diagnosis ?? 'Sem diagnóstico registrado'} · Internação #{a.id}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASS[a.status]}`}>
            {STATUS_LABEL[a.status]}
          </span>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Paciente">
            <dl className="space-y-2 text-sm">
              <Row icon={User} label="Idade" value={`${a.patient.age} anos`} />
              <Row label="Sexo" value={a.patient.gender === 'M' ? 'Masculino' : 'Feminino'} />
              <Row label="Nascimento" value={fmtDate(a.patient.birthDate)} />
              <Row label="Documento" value={a.patient.document} />
            </dl>
          </Card>
          <Card title="Internação">
            <dl className="space-y-2 text-sm">
              <Row label="Departamento" value={a.department.name} />
              <Row label="Leito" value={String(a.bedNumber)} />
              <Row label="Entrada" value={fmtDateTime(a.admissionDate)} />
              <Row label="Saída" value={a.dischargeDate ? fmtDateTime(a.dischargeDate) : '—'} />
              <Row label="Permanência" value={`${fmtNum(a.lengthOfStayDays)} dias`} />
            </dl>
          </Card>
          <Card title="Responsável">
            {a.attendingStaff ? (
              <dl className="space-y-2 text-sm">
                <Row icon={Stethoscope} label="Nome" value={a.attendingStaff.name} />
                <Row label="Função" value={ROLE_LABEL[a.attendingStaff.role]} />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum responsável registrado.</p>
            )}
          </Card>
        </div>

        <Card title="Sinais vitais">
          {vitals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma medição registrada nesta internação.
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Frequência cardíaca, pressão arterial e saturação
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={vitals} margin={{ left: -18, right: 8, top: 4 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis dataKey="label" tick={AXIS_TICK} minTickGap={40} />
                    <YAxis tick={AXIS_TICK} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="heartRate"
                      name="FC (bpm)"
                      stroke="var(--color-chart-2)"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="systolicPressure"
                      name="PA sistólica (mmHg)"
                      stroke="var(--color-chart-1)"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolicPressure"
                      name="PA diastólica (mmHg)"
                      stroke="var(--color-chart-3)"
                      strokeWidth={2}
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="oxygenSaturation"
                      name="SpO₂ (%)"
                      stroke="var(--color-chart-4)"
                      strokeWidth={2}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Temperatura (°C)</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={vitals} margin={{ left: -18, right: 8, top: 4 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="var(--color-border)"
                      vertical={false}
                    />
                    <XAxis dataKey="label" tick={AXIS_TICK} minTickGap={40} />
                    <YAxis tick={AXIS_TICK} domain={[35, 40]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      name="Temperatura (°C)"
                      stroke="var(--color-destructive)"
                      strokeWidth={2}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>

        <Card title="Exames">
          {a.exams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum exame solicitado nesta internação.
            </p>
          ) : (
            <ul className="divide-y">
              {a.exams.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary" aria-hidden />
                    <div>
                      <p className="font-medium">{e.examType}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado em {fmtDateTime(e.requestedAt)}
                        {e.resultAt ? ` · Resultado em ${fmtDateTime(e.resultAt)}` : ''}
                        {e.turnaroundHours !== null ? ` (${fmtNum(e.turnaroundHours)} h)` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.resultValue && (
                      <span className="text-xs text-muted-foreground">{e.resultValue}</span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXAM_STATUS_CLASS[e.status]}`}
                    >
                      {EXAM_STATUS_LABEL[e.status]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function AdmissionNotFound() {
  return (
    <AppShell>
      <div className="mx-auto max-w-xl space-y-4">
        <BackLink />
        <Card className="p-8 text-center">
          <h1 className="text-lg font-semibold">Internação não encontrada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ela pode ter sido removida ou o endereço está incorreto.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

function BackLink() {
  return (
    <Link
      to="/internacoes"
      search={{ pagina: 1, ordem: 'admissionDate', dir: 'desc' }}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar para internações
    </Link>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: string; icon?: LucideIcon }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
