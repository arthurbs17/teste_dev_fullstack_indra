import {
  type AdmissionSortField,
  type AdmissionStatus,
  admissionSortFields,
  admissionStatusSchema,
  INT4_MAX,
} from '@hospital/contracts';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { AppShell, Card } from '@/components/AppShell';
import { RouteError } from '@/components/RouteError';
import { getDepartments, listAdmissions } from '@/lib/api/functions';
import { fmtDate, fmtNum, STATUS_CLASS, STATUS_LABEL } from '@/lib/format';

const PAGE_SIZE = 10;
const STATUSES = admissionStatusSchema.options;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

interface AdmissionsSearch {
  status?: AdmissionStatus;
  dept?: number;
  busca?: string;
  de?: string;
  ate?: string;
  pagina: number;
  ordem: AdmissionSortField;
  dir: 'asc' | 'desc';
}

/** Filtros vivem na URL: links compartilháveis e botão voltar funcionando. */
function validateSearch(search: Record<string, unknown>): AdmissionsSearch {
  const status = admissionStatusSchema.safeParse(search['status']);
  const dept = Number(search['dept']);
  const busca = typeof search['busca'] === 'string' ? search['busca'].trim() : '';
  const de = String(search['de'] ?? '');
  const ate = String(search['ate'] ?? '');
  const ordem = admissionSortFields.find((f) => f === search['ordem']) ?? 'admissionDate';

  return {
    ...(status.success ? { status: status.data } : {}),
    ...(Number.isInteger(dept) && dept > 0 && dept <= INT4_MAX ? { dept } : {}),
    ...(busca ? { busca: busca.slice(0, 100) } : {}),
    ...(ISO_DATE.test(de) ? { de } : {}),
    ...(ISO_DATE.test(ate) ? { ate } : {}),
    pagina: Math.min(100_000, Math.max(1, Math.trunc(Number(search['pagina'])) || 1)),
    ordem,
    dir: search['dir'] === 'asc' ? 'asc' : 'desc',
  };
}

export const Route = createFileRoute('/internacoes/')({
  validateSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [result, departments] = await Promise.all([
      listAdmissions({
        data: {
          page: deps.pagina,
          pageSize: PAGE_SIZE,
          sort: deps.ordem,
          order: deps.dir,
          ...(deps.status ? { status: deps.status } : {}),
          ...(deps.dept ? { departmentId: deps.dept } : {}),
          ...(deps.busca ? { search: deps.busca } : {}),
          ...(deps.de ? { from: deps.de } : {}),
          ...(deps.ate ? { to: deps.ate } : {}),
        },
      }),
      getDepartments(),
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
    ],
  }),
  errorComponent: RouteError,
  component: Internacoes,
});

type SearchPatch = Partial<Record<keyof AdmissionsSearch, string | number | undefined>>;

function Internacoes() {
  const { result, departments } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: '/internacoes/' });
  const [busca, setBusca] = useState(search.busca ?? '');

  // Mantém o campo de busca em sincronia ao navegar (voltar/avançar)
  useEffect(() => setBusca(search.busca ?? ''), [search.busca]);

  /** Aplica filtros e volta para a primeira página (exceto ao paginar). */
  const update = (patch: SearchPatch) =>
    navigate({
      search: (current) => validateSearch({ ...current, pagina: 1, ...patch }),
      replace: true,
    });

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    update({ busca: busca || undefined });
  };

  const totalPages = Math.max(1, result.totalPages);
  const hasFilters = Boolean(
    search.status || search.dept || search.busca || search.de || search.ate,
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-5">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Internações</h1>
          <p className="text-sm text-muted-foreground">
            {result.total}{' '}
            {result.total === 1 ? 'internação encontrada' : 'internações encontradas'}.
          </p>
        </header>

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-2">
            <form className="relative" onSubmit={onSearch}>
              <Search
                className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                aria-hidden
              />
              <input
                type="search"
                aria-label="Buscar por paciente, documento ou diagnóstico"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Paciente, documento ou diagnóstico…"
                className="w-64 rounded-md border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </form>
            <select
              aria-label="Status"
              value={search.status ?? ''}
              onChange={(e) => update({ status: e.target.value || undefined })}
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
              aria-label="Departamento"
              value={search.dept ?? ''}
              onChange={(e) => update({ dept: e.target.value || undefined })}
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
              Internação de
              <input
                type="date"
                value={search.de ?? ''}
                max={search.ate}
                onChange={(e) => update({ de: e.target.value || undefined })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-muted-foreground">
              até
              <input
                type="date"
                value={search.ate ?? ''}
                min={search.de}
                onChange={(e) => update({ ate: e.target.value || undefined })}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            {hasFilters && (
              <button
                type="button"
                onClick={() =>
                  navigate({ search: { pagina: 1, ordem: search.ordem, dir: search.dir } })
                }
                className="rounded-md px-2 py-2 text-xs text-primary hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </Card>

        {/* Tabela no desktop */}
        <Card className="hidden overflow-hidden p-0 md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <SortableHeader field="patientName" search={search} onSort={update}>
                  Paciente
                </SortableHeader>
                <SortableHeader field="departmentName" search={search} onSort={update}>
                  Departamento
                </SortableHeader>
                <th className="px-4 py-3 font-medium">Status</th>
                <SortableHeader field="admissionDate" search={search} onSort={update}>
                  Internação
                </SortableHeader>
                <SortableHeader field="dischargeDate" search={search} onSort={update}>
                  Alta
                </SortableHeader>
                <SortableHeader field="lengthOfStay" search={search} onSort={update}>
                  Permanência
                </SortableHeader>
                <th className="px-4 py-3 font-medium">Leito</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((a) => (
                <tr key={a.id} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <Link
                      to="/internacoes/$id"
                      params={{ id: String(a.id) }}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.patient.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {a.diagnosis ?? 'Sem diagnóstico'} · {a.patient.document}
                    </p>
                  </td>
                  <td className="px-4 py-3">{a.department.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 tabular">{fmtDate(a.admissionDate)}</td>
                  <td className="px-4 py-3 tabular">
                    {a.dischargeDate ? fmtDate(a.dischargeDate) : '—'}
                  </td>
                  <td className="px-4 py-3 tabular">{fmtNum(a.lengthOfStayDays)} d</td>
                  <td className="px-4 py-3 tabular">{a.bedNumber}</td>
                </tr>
              ))}
              {result.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
            <Link key={a.id} to="/internacoes/$id" params={{ id: String(a.id) }} className="block">
              <Card className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{a.patient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.diagnosis ?? 'Sem diagnóstico'} · {a.department.name}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular">
                  Internação {fmtDate(a.admissionDate)} · {fmtNum(a.lengthOfStayDays)} dias · Leito{' '}
                  {a.bedNumber}
                </p>
              </Card>
            </Link>
          ))}
          {result.data.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma internação encontrada com esses filtros.
            </Card>
          )}
        </div>

        <nav className="flex items-center justify-between" aria-label="Paginação">
          <p className="text-xs text-muted-foreground tabular">
            Página {Math.min(result.page, totalPages)} de {totalPages}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={result.page <= 1}
              onClick={() => update({ pagina: result.page - 1 })}
              className="rounded-md border bg-card p-2 hover:bg-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Próxima página"
              disabled={result.page >= totalPages}
              onClick={() => update({ pagina: result.page + 1 })}
              className="rounded-md border bg-card p-2 hover:bg-accent disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </nav>
      </div>
    </AppShell>
  );
}

function SortableHeader({
  field,
  search,
  onSort,
  children,
}: {
  field: AdmissionSortField;
  search: AdmissionsSearch;
  onSort: (patch: SearchPatch) => void;
  children: ReactNode;
}) {
  const active = search.ordem === field;
  const Icon = !active ? ArrowUpDown : search.dir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      className="px-4 py-3"
      aria-sort={active ? (search.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() =>
          onSort({ ordem: field, dir: active && search.dir === 'desc' ? 'asc' : 'desc' })
        }
        className="inline-flex items-center gap-1 font-medium hover:text-primary"
      >
        {children}
        <Icon className={`h-3 w-3 ${active ? 'text-primary' : 'opacity-40'}`} aria-hidden />
      </button>
    </th>
  );
}

function StatusBadge({ status }: { status: AdmissionStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
