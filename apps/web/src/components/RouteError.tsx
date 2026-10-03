import { type ErrorComponentProps, useRouter } from '@tanstack/react-router';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { AppShell, Card } from '@/components/AppShell';

/** Erro de carregamento de uma página (ex.: API fora do ar), com opção de tentar de novo. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <AppShell>
      <div className="mx-auto max-w-xl">
        <Card className="p-8 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" aria-hidden />
          <h1 className="mt-3 text-lg font-semibold">Não foi possível carregar os dados</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Erro inesperado.'}
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
              void router.invalidate();
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RotateCw className="h-4 w-4" aria-hidden /> Tentar novamente
          </button>
        </Card>
      </div>
    </AppShell>
  );
}
