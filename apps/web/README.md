# @hospital/web

Dashboard de gestão hospitalar em **TanStack Start** (React 19 + Vite, com SSR),
Tailwind CSS 4 e Recharts.

## Rotas

| Rota | Conteúdo |
|---|---|
| `/` | Painel: KPIs, ocupação por departamento e censo diário |
| `/internacoes` | Listagem com filtros, ordenação e paginação |
| `/internacoes/:id` | Detalhe da internação: paciente, exames e sinais vitais |

Os filtros ficam na URL (search params validados por rota), então os links são
compartilháveis e o botão voltar funciona.

## Scripts

Rodados pela raiz do monorepo (`pnpm turbo run <task> --filter=@hospital/web`)
ou dentro desta pasta:

```bash
pnpm dev        # servidor de desenvolvimento em http://localhost:3000
pnpm build      # build de produção (servidor Node do Nitro em .output/)
pnpm start      # sobe o build de produção
pnpm test       # testes (Vitest + jsdom)
pnpm typecheck
```

Lint e formatação são feitos pelo Biome na raiz (`pnpm check`).
