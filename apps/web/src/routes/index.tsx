import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { BedDouble, CalendarPlus, Clock3, FlaskConical, HeartPulse, Percent } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AppShell, Card } from '@/components/AppShell';
import {
  defaultPeriod,
  getDailyCensus,
  getDepartmentOccupancy,
  getDepartments,
  getKpis,
} from '@/lib/api';
import { fmtNum, fmtPct } from '@/lib/format';

const PERIODS = [7, 15, 30] as const;

export const Route = createFileRoute('/')({
  validateSearch: (s: Record<string, unknown>) => ({
    dias: [7, 15, 30].includes(Number(s['dias'])) ? Number(s['dias']) : 30,
    ...(s['dept'] ? { dept: Number(s['dept']) } : {}),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const period = defaultPeriod(deps.dias);
    const [kpis, occupancy, census, departments] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ['kpis', period],
        queryFn: () => getKpis(period),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ['occupancy'],
        queryFn: getDepartmentOccupancy,
      }),
      context.queryClient.ensureQueryData({
        queryKey: ['census', period, deps.dept],
        queryFn: () => getDailyCensus(period, deps.dept),
      }),
      context.queryClient.ensureQueryData({ queryKey: ['departments'], queryFn: getDepartments }),
    ]);
    return { kpis, occupancy, census, departments, period };
  },
  head: () => ({
    meta: [
      { title: 'Painel — Gestão Hospitalar' },
      {
        name: 'description',
        content: 'Indicadores de gestão hospitalar: ocupação, internações, exames e censo diário.',
      },
      { property: 'og:title', content: 'Painel — Gestão Hospitalar' },
      {
        property: 'og:description',
        content: 'Indicadores de gestão hospitalar: ocupação, internações, exames e censo diário.',
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { kpis, occupancy, census, departments } = Route.useLoaderData();
  const { dias, dept } = Route.useSearch();
  const navigate = useNavigate();

  const cards = [
    {
      label: 'Taxa de ocupação',
      value: fmtPct(kpis.occupancyRate),
      sub: `${kpis.occupiedBeds} de ${kpis.totalBeds} leitos`,
      icon: Percent,
    },
    {
      label: 'Internações ativas',
      value: String(kpis.activeAdmissions),
      sub: 'status internado',
      icon: BedDouble,
    },
    {
      label: 'Internações no período',
      value: String(kpis.admissionsInPeriod),
      sub: `últimos ${dias} dias`,
      icon: CalendarPlus,
    },
    {
      label: 'Tempo médio de internação',
      value: `${fmtNum(kpis.avgLengthOfStayDays)} d`,
      sub: 'altas no período',
      icon: Clock3,
    },
    {
      label: 'Exames pendentes',
      value: String(kpis.pendingExams),
      sub: `tempo médio de resultado: ${fmtNum(kpis.avgExamResultHours)} h`,
      icon: FlaskConical,
    },
    {
      label: 'Taxa de óbito',
      value: fmtPct(kpis.mortalityRate),
      sub: 'altas no período',
      icon: HeartPulse,
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Painel de indicadores</h1>
            <p className="text-sm text-muted-foreground">Visão geral da operação hospitalar.</p>
          </div>
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {PERIODS.map((d) => (
              <button
                type="button"
                key={d}
                onClick={() =>
                  navigate({
                    to: '/',
                    search: { dias: d, ...(dept ? { dept } : {}) },
                    replace: true,
                  })
                }
                className={`rounded-md px-3 py-1.5 text-sm tabular ${dias === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}
              >
                {d} dias
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {cards.map(({ label, value, sub, icon: Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Ocupação por departamento">
            {occupancy.every((o) => o.occupiedBeds === 0) && (
              <p className="mb-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Nenhum leito ocupado no momento.
              </p>
            )}
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={occupancy} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(v, name) => [
                    String(v),
                    name === 'occupiedBeds' ? 'Ocupados' : 'Total',
                  ]}
                  labelStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="totalBeds"
                  fill="var(--color-muted)"
                  radius={[3, 3, 0, 0]}
                  name="totalBeds"
                />
                <Bar dataKey="occupiedBeds" radius={[3, 3, 0, 0]} name="occupiedBeds">
                  {occupancy.map((o) => (
                    <Cell key={o.departmentId} fill="var(--color-chart-1)" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card
            title="Censo diário — leitos ocupados"
            action={
              <select
                value={dept ?? ''}
                onChange={(e) =>
                  navigate({
                    to: '/',
                    search: { dias, ...(e.target.value ? { dept: Number(e.target.value) } : {}) },
                    replace: true,
                  })
                }
                className="rounded-md border bg-background px-2 py-1 text-xs"
              >
                <option value="">Todos os departamentos</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            }
          >
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={census} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  allowDecimals={false}
                />
                <Tooltip
                  labelFormatter={(d) =>
                    new Date(`${String(d)}T00:00:00Z`).toLocaleDateString('pt-BR', {
                      timeZone: 'UTC',
                    })
                  }
                  formatter={(v) => [String(v), 'Leitos ocupados']}
                />
                <Line
                  type="monotone"
                  dataKey="occupiedBeds"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="admissions"
                  stroke="var(--color-chart-2)"
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 bg-chart-1 inline-block" /> Leitos ocupados
              </span>
              <span className="flex items-center gap-1">
                <span className="h-0.5 w-4 bg-chart-2 inline-block" /> Internações no dia
              </span>
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
