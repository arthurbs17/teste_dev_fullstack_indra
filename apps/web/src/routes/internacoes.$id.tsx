import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { ArrowLeft, FlaskConical, Stethoscope, User } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell, Card } from '@/components/AppShell';
import { getAdmission } from '@/lib/api';
import { age, fmtDate, fmtDateTime, STATUS_CLASS, STATUS_LABEL, stayDays } from '@/lib/format';

export const Route = createFileRoute('/internacoes/$id')({
  loader: async ({ params, context }) => {
    const admission = await context.queryClient.ensureQueryData({
      queryKey: ['admission', params.id],
      queryFn: () => getAdmission(Number(params.id)),
    });
    if (!admission) throw notFound();
    return { admission };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `Internação #${loaderData.admission.id} — Gestão Hospitalar`
          : 'Internação não encontrada',
      },
      {
        name: 'description',
        content: 'Detalhe da internação: paciente, exames e série de sinais vitais.',
      },
      { property: 'og:title', content: 'Detalhe da internação — Gestão Hospitalar' },
      {
        property: 'og:description',
        content: 'Detalhe da internação: paciente, exames e série de sinais vitais.',
      },
      ...(loaderData ? [] : [{ name: 'robots', content: 'noindex' }]),
    ],
  }),
  component: Detalhe,
});

function Detalhe() {
  const { admission: a } = Route.useLoaderData();
  const vitals = a.vitals.map((v) => ({ ...v, dia: fmtDateTime(v.measuredAt) }));

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          to="/internacoes"
          search={{ pagina: 1, ordem: 'admissionDate', dir: 'desc' }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para internações
        </Link>

        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{a.patient.name}</h1>
            <p className="text-sm text-muted-foreground">{a.diagnosis}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASS[a.status]}`}>
            {STATUS_LABEL[a.status]}
          </span>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Paciente">
            <dl className="space-y-2 text-sm">
              <Row icon={User} k="Idade" v={`${age(a.patient.birthDate)} anos`} />
              <Row k="Sexo" v={a.patient.gender === 'M' ? 'Masculino' : 'Feminino'} />
              <Row k="Nascimento" v={fmtDate(a.patient.birthDate)} />
              <Row k="CPF" v={a.patient.cpf} />
            </dl>
          </Card>
          <Card title="Internação">
            <dl className="space-y-2 text-sm">
              <Row k="Departamento" v={a.department.name} />
              <Row k="Leito" v={String(a.bed)} />
              <Row k="Admissão" v={fmtDate(a.admissionDate)} />
              <Row k="Alta" v={a.dischargeDate ? fmtDate(a.dischargeDate) : '—'} />
              <Row k="Permanência" v={`${stayDays(a.admissionDate, a.dischargeDate)} dias`} />
            </dl>
          </Card>
          <Card title="Responsável">
            <dl className="space-y-2 text-sm">
              <Row icon={Stethoscope} k="Médico" v={a.doctor.name} />
              <Row k="Especialidade" v={a.doctor.specialty} />
              <Row k="Registro" v={a.doctor.crm} />
            </dl>
          </Card>
        </div>

        <Card title="Sinais vitais">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={vitals} margin={{ left: -18, right: 8, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="dia"
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                minTickGap={40}
              />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="heartRate"
                name="FC (bpm)"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="systolic"
                name="PA sistólica"
                stroke="var(--color-chart-1)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="diastolic"
                name="PA diastólica"
                stroke="var(--color-chart-3)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="spo2"
                name="SpO₂ (%)"
                stroke="var(--color-chart-4)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Legend color="var(--color-chart-2)" label="Frequência cardíaca" />
            <Legend color="var(--color-chart-1)" label="Pressão sistólica" />
            <Legend color="var(--color-chart-3)" label="Pressão diastólica" />
            <Legend color="var(--color-chart-4)" label="Saturação O₂" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Temperatura: {vitals.map((v) => v.temperature.toFixed(1)).join(' · ')} °C
          </p>
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
                    <FlaskConical className="h-4 w-4 text-primary" />
                    <div>
                      <p className="font-medium">{e.type}</p>
                      <p className="text-xs text-muted-foreground">
                        Solicitado em {fmtDateTime(e.requestedAt)}
                        {e.resultAt ? ` · Resultado em ${fmtDateTime(e.resultAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.result && <span className="text-xs text-muted-foreground">{e.result}</span>}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.status === 'concluido' ? 'bg-success/15 text-success' : 'bg-warning/20 text-foreground'}`}
                    >
                      {e.status === 'concluido' ? 'Concluído' : 'Pendente'}
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

function Row({ k, v, icon: Icon }: { k: string; v: string; icon?: typeof User }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {k}
      </dt>
      <dd className="font-medium text-right">{v}</dd>
    </div>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="h-0.5 w-4 inline-block" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
