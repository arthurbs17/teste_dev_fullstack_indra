import { INT4_MAX } from '@hospital/contracts';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  BedDouble,
  CalendarPlus,
  Clock3,
  FlaskConical,
  HeartPulse,
  type LucideIcon,
  Percent,
} from 'lucide-react';
import {
  Bar,
  BarChart,
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
import {
  getDailyCensus,
  getDepartmentOccupancy,
  getDepartments,
  getKpis,
} from '@/lib/api/functions';
import { fmtDate, fmtDays, fmtNum, fmtPct, periodStart } from '@/lib/format';

const PERIODS = [7, 15, 30] as const;
type PeriodDays = (typeof PERIODS)[number];

const AXIS_TICK = { fontSize: 11, fill: 'var(--color-muted-foreground)' };

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): { dias: PeriodDays; dept?: number } => {
    const dias = PERIODS.find((d) => d === Number(search['dias'])) ?? 30;
    const dept = Number(search['dept']);
    return Number.isInteger(dept) && dept > 0 && dept <= INT4_MAX ? { dias, dept } : { dias };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const from = periodStart(deps.dias);
    const [kpis, occupancy, census, departments] = await Promise.all([
      getKpis({ data: { from } }),
      getDepartmentOccupancy(),
      getDailyCensus({ data: { from, ...(deps.dept ? { departmentId: deps.dept } : {}) } }),
      getDepartments(),
    ]);
    return { kpis, occupancy, census, departments };
  },
  head: () => ({
    meta: [
      { title: 'Painel — Gestão Hospitalar' },
      {
        name: 'description',
        content: 'Indicadores de gestão hospitalar: ocupação, internações, exames e censo diário.',
      },
    ],
  }),
  errorComponent: RouteError,
  component: Dashboard,
});

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
}

function Dashboard() {
  const { kpis, occupancy, census, departments } = Route.useLoaderData();
  const { dias, dept } = Route.useSearch();
  const navigate = useNavigate({ from: '/' });

  const cards: KpiCard[] = [
    {
      label: 'Taxa de ocupação',
      value: fmtPct(kpis.occupancy.rate),
      sub: `${kpis.occupancy.occupiedBeds} de ${kpis.occupancy.totalBeds} leitos ocupados agora`,
      icon: Percent,
    },
    {
      label: 'Internações ativas',
      value: String(kpis.activeAdmissions),
      sub: 'pacientes internados agora',
      icon: BedDouble,
    },
    {
      label: 'Internações no período',
      value: String(kpis.admissionsInPeriod),
      sub: `${kpis.dischargesInPeriod} encerradas (alta ou óbito)`,
      icon: CalendarPlus,
    },
    {
      label: 'Tempo médio de internação',
      value: fmtDays(kpis.averageLengthOfStayDays),
      sub: 'internações encerradas no período',
      icon: Clock3,
    },
    {
      label: 'Exames pendentes',
      value: String(kpis.pendingExams),
      sub: `resultado em média em ${fmtNum(kpis.averageExamTurnaroundHours)} h`,
      icon: FlaskConical,
    },
    {
      label: 'Taxa de óbito',
      value: fmtPct(kpis.mortalityRate),
      sub: 'das internações encerradas no período',
      icon: HeartPulse,
    },
  ];

  const noOccupancy = occupancy.every((o) => o.occupiedBeds === 0);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Painel de indicadores</h1>
            <p className="text-sm text-muted-foreground">
              Período: {fmtDate(kpis.period.from)} a {fmtDate(kpis.period.to)}
            </p>
          </div>
          <fieldset className="flex gap-1 rounded-lg border bg-card p-1">
            <legend className="sr-only">Período</legend>
            {PERIODS.map((d) => (
              <button
                type="button"
                key={d}
                aria-pressed={dias === d}
                onClick={() => navigate({ search: (s) => ({ ...s, dias: d }), replace: true })}
                className={`rounded-md px-3 py-1.5 text-sm tabular ${
                  dias === d
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {d} dias
              </button>
            ))}
          </fieldset>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {cards.map(({ label, value, sub, icon: Icon }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <Icon className="h-4 w-4 text-primary" aria-hidden />
              </div>
              <p className="mt-2 text-2xl font-semibold tabular">{value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Ocupação atual por departamento">
            {noOccupancy && (
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
                  dataKey="departmentName"
                  tick={AXIS_TICK}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="totalBeds"
                  name="Leitos totais"
                  fill="var(--color-muted)"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="occupiedBeds"
                  name="Leitos ocupados"
                  fill="var(--color-chart-1)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card
            title="Censo diário — leitos ocupados"
            action={
              <select
                aria-label="Departamento do censo"
                value={dept ?? ''}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  navigate({
                    search: (s) => ({ dias: s.dias, ...(value ? { dept: value } : {}) }),
                    replace: true,
                  });
                }}
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
              <LineChart data={census.points} margin={{ left: -18, right: 8, top: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={AXIS_TICK}
                  tickFormatter={(d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`}
                  minTickGap={24}
                />
                <YAxis tick={AXIS_TICK} allowDecimals={false} />
                <Tooltip labelFormatter={(d) => fmtDate(String(d))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="occupiedBeds"
                  name="Leitos ocupados"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="admissions"
                  name="Internações no dia"
                  stroke="var(--color-chart-2)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="discharges"
                  name="Altas no dia"
                  stroke="var(--color-chart-3)"
                  strokeWidth={1.5}
                  strokeDasharray="2 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-muted-foreground">
              {census.totalBeds} leitos no escopo · leitos ocupados no fim de cada dia
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
