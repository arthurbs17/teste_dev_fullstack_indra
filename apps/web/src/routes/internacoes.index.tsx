import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useState } from 'react';
import { AppShell, Card } from '@/components/AppShell';
import { getDepartments, listAdmissions, type SortField } from '@/lib/api';
import { fmtDate, STATUS_CLASS, STATUS_LABEL, stayDays } from '@/lib/format';
import type { AdmissionStatus } from '@/lib/mock';

const PAGE_SIZE = 8;
const STATUSES: AdmissionStatus[] = ['internado', 'alta', 'obito', 'transferido'];

export const Route = createFileRoute('/internacoes/')({
  validateSearch: (s: Record<string, unknown>) => ({
    ...(STATUSES.includes(s['status'] as AdmissionStatus)
      ? { status: s['status'] as AdmissionStatus }
      : {}),
    ...(s['dept'] ? { dept: Number(s['dept']) } : {}),
    ...(typeof s['busca'] === 'string' ? { busca: s['busca'] } : {}),
    ...(typeof s['de'] === 'string' ? { de: s['de'] } : {}),
    ...(typeof s['ate'] === 'string' ? { ate: s['ate'] } : {}),
    pagina: Math.max(1, Number(s['pagina']) || 1),
    ordem: (['admissionDate', 'patient', 'department', 'status'] as SortField[]).includes(
      s['ordem'] as SortField,
    )
      ? (s['ordem'] as SortField)
      : 'admissionDate',
    dir: s['dir'] === 'asc' ? ('asc' as const) : ('desc' as const),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const [result, departments] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ['admissions', deps],
        queryFn: () =>
          listAdmissions({
            status: deps.status,
            departmentId: deps.dept,
            search: deps.busca,
            from: deps.de,
            to: deps.ate,
            page: deps.pagina,
            pageSize: PAGE_SIZE,
            sort: deps.ordem,
            order: deps.dir,
          }),
      }),
      context.queryClient.ensureQueryData({ queryKey: ['departments'], queryFn: getDepartments }),
    ]);
    return { result, departments };
  },
  head: () => ({
    meta: [
      { title: 'Internações — Gestão Hospitalar' },
      {
        name: 'description',
        content: 'Listagem de internações com filtros por status, departamento, período e busca.',
      },
      { property: 'og:title', content: 'Internações — Gestão Hospitalar' },
      {
        property: 'og:description',
        content: 'Listagem de internações com filtros por status, departamento, período e busca.',
      },
    ],
  }),
  component: Internacoes,
});

function Internacoes() {
  const { result, departments } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/internacoes/' });
  const [busca, setBusca] = useState(search.busca ?? '');
  const set = (patch: Record<string, unknown>) =>
    navigate({
      search: (s) => {
        const next: Record<string, unknown> = {
          ...s,
          ...patch,
          pagina: (patch['pagina'] as number | undefined) ?? 1,
        };
        for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
        return next as typeof s;
      },
      replace: true,
    });
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  const SortBtn = ({ field, children }: { field: SortField; children: string }) => (
    <button
      type="button"
      onClick={() =>
        set({ ordem: field, dir: search.ordem === field && search.dir === 'desc' ? 'asc' : 'desc' })
      }
      className="inline-flex items-center gap-1 font-medium hover:text-primary"
    >
      {children}
      <ArrowUpDown
        className={`h-3 w-3 ${search.ordem === field ? 'text-primary' : 'opacity-40'}`}
      />
    </button>
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Internações</h1>
          <p className="text-sm text-muted-foreground">{result.total} registro(s) encontrado(s).</p>
        </header>

        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                set({ busca: busca || undefined });
              }}
            >
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Paciente ou diagnóstico…"
                className="w-56 rounded-md border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </form>
            <select
              value={search.status ?? ''}
              onChange={(e) =>
                set({ status: (e.target.value || undefined) as AdmissionStatus | undefined })
              }
              className="rounded-md border bg-background px-2 py-2 text-sm"
            >
              <option value="">Todos os status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={search.dept ?? ''}
              onChange={(e) => set({ dept: e.target.value ? Number(e.target.value) : undefined })}
              className="rounded-md border bg-background px-2 py-2 text-sm"
            >
              <option value="">Todos os departamentos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              De
              <input
                type="date"
                value={search.de ?? ''}
                onChange={(e) => set({ de: e.target.value || undefined })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              Até
              <input
                type="date"
                value={search.ate ?? ''}
                onChange={(e) => set({ ate: e.target.value || undefined })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </label>
          </div>
        </Card>

        {/* Tabela no desktop */}
        <Card className="hidden md:block p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">
                  <SortBtn field="patient">Paciente</SortBtn>
                </th>
                <th className="px-4 py-3">
                  <SortBtn field="department">Departamento</SortBtn>
                </th>
                <th className="px-4 py-3">
                  <SortBtn field="status">Status</SortBtn>
                </th>
                <th className="px-4 py-3">
                  <SortBtn field="admissionDate">Admissão</SortBtn>
                </th>
                <th className="px-4 py-3">Permanência</th>
                <th className="px-4 py-3">Leito</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <Link
                      to="/internacoes/$id"
                      params={{ id: String(a.id) }}
                      search={{ pagina: 1, ordem: 'admissionDate', dir: 'desc' }}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.patient.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{a.diagnosis}</p>
                  </td>
                  <td className="px-4 py-3">{a.department.name}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular">{fmtDate(a.admissionDate)}</td>
                  <td className="px-4 py-3 tabular">
                    {stayDays(a.admissionDate, a.dischargeDate)} d
                  </td>
                  <td className="px-4 py-3 tabular">{a.bed}</td>
                </tr>
              ))}
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhuma internação encontrada com esses filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        {/* Cards no mobile */}
        <div className="space-y-3 md:hidden">
          {result.data.map((a) => (
            <Link
              key={a.id}
              to="/internacoes/$id"
              params={{ id: String(a.id) }}
              search={{ pagina: 1, ordem: 'admissionDate', dir: 'desc' }}
            >
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{a.patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.diagnosis} · {a.department.name}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[a.status]}`}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular">
                  Admissão {fmtDate(a.admissionDate)} · {stayDays(a.admissionDate, a.dischargeDate)}{' '}
                  dias · Leito {a.bed}
                </p>
              </Card>
            </Link>
          ))}
          {result.data.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma internação encontrada.
            </Card>
          )}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground tabular">
            Página {result.page} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={result.page <= 1}
              onClick={() => set({ pagina: result.page - 1 })}
              className="rounded-md border bg-card p-2 disabled:opacity-40 hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={result.page >= totalPages}
              onClick={() => set({ pagina: result.page + 1 })}
              className="rounded-md border bg-card p-2 disabled:opacity-40 hover:bg-accent"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
