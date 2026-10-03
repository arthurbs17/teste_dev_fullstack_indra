import { createRouter, rootRouteId } from '@tanstack/react-router';
import { describe, expect, it } from 'vitest';

import { routeTree } from '@/routeTree.gen';

// Casa as rotas sem rodar loaders nem renderizar: os loaders dependem de rede,
// e o jsdom não carrega as folhas de estilo pelas quais o React espera.
describe('Rotas da aplicação', () => {
  const router = createRouter({ routeTree });
  const leafOf = (path: string) => router.matchRoutes(path).at(-1)?.routeId;

  it('casa o painel em / em vez de cair no "não encontrado"', () => {
    expect(leafOf('/')).not.toBe(rootRouteId);
    expect(leafOf('/')).toBe('/');
  });

  it('casa a listagem em /internacoes', () => {
    expect(leafOf('/internacoes')).toBe('/internacoes/');
  });

  it('casa o detalhe em /internacoes/:id como rota própria, e não dentro da listagem', () => {
    const matches = router.matchRoutes('/internacoes/7').map((m) => m.routeId);
    expect(matches.at(-1)).toBe('/internacoes/$id');
    expect(matches).not.toContain('/internacoes/');
  });
});
