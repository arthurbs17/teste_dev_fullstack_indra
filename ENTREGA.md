# Entrega — Dashboard de Gestão Hospitalar

Aplicação full stack sobre a base do "Hospital Vida Plena": uma **API REST em
NestJS** e um **dashboard React (TanStack Start)**, num monorepo Turborepo, com
tudo subindo pelo Docker Compose.

- [Como rodar](#como-rodar)
- [O que foi construído](#o-que-foi-construído)
- [Arquitetura](#arquitetura)
- [Decisões técnicas e trade-offs](#decisões-técnicas-e-trade-offs)
- [Inconsistências encontradas nos dados](#inconsistências-encontradas-nos-dados)
- [Segurança](#segurança)
- [Testes](#testes)
- [Fluxo de Git](#fluxo-de-git)
- [O que eu faria com mais tempo](#o-que-eu-faria-com-mais-tempo)
- [Deploy em nuvem](#deploy-em-nuvem)
- [Uso de IA](#uso-de-ia)

---

## Como rodar

### Com Docker (recomendado)

Pré-requisito: Docker com Compose v2.

```bash
cp .env.example .env
docker compose up --build
```

| Serviço | Endereço |
|---|---|
| Dashboard | http://localhost:3000 |
| API (Swagger) | http://localhost:3001/docs |
| Health check da API | http://localhost:3001/health |
| Adminer | http://localhost:8080 (servidor `db`, credenciais do `.env`) |

Os containers sobem em ordem, cada um esperando o anterior ficar saudável:
`db` → `api` → `web`.

> **Por que o `cp .env.example .env`?** O `docker-compose.yml` original tinha a
> senha do banco como valor padrão. Tirei todas as credenciais do arquivo: as
> variáveis vêm só do `.env`, e se alguma faltar o Compose para com uma mensagem
> dizendo qual (`Defina POSTGRES_DB no .env`). O custo é esse passo a mais.

Para recriar o banco do zero: `docker compose down -v && docker compose up --build`.

### Desenvolvimento local

Pré-requisitos: Node 24 e pnpm 10 (via `corepack enable`).

```bash
cp .env.example .env
docker compose up -d db          # só o banco
pnpm install
pnpm dev                         # API em :3001 e web em :3000, via Turborepo
```

| Comando | O que faz |
|---|---|
| `pnpm build` | Build de todos os pacotes, na ordem de dependência |
| `pnpm test` | Testes unitários (contracts, api, web) |
| `pnpm test:e2e` | Testes e2e da API contra um Postgres descartável (precisa de Docker) |
| `pnpm typecheck` | TypeScript em todos os pacotes |
| `pnpm check` | Lint e formatação (Biome) |

---

## O que foi construído

### API (`apps/api`)

| Rota | Retorno |
|---|---|
| `GET /health` | Status da API e do banco (503 se o banco cair) |
| `GET /api/v1/kpis?from&to` | Ocupação, internações ativas e exames pendentes (agora); internações, altas, tempo médio de internação, taxa de óbito e tempo médio de resultado de exames (no período, padrão 30 dias) |
| `GET /api/v1/departments` | Departamentos |
| `GET /api/v1/departments/occupancy` | Leitos totais, ocupados e taxa por departamento |
| `GET /api/v1/occupancy/daily?from&to&departmentId` | Censo diário: leitos ocupados no fim de cada dia, internações e altas do dia |
| `GET /api/v1/admissions?status&departmentId&from&to&search&page&pageSize&sort&order` | Internações paginadas, com filtros, busca e ordenação (inclusive por tempo de internação) |
| `GET /api/v1/admissions/:id` | Internação com paciente, responsável, exames e sinais vitais |

- Toda entrada é validada, e toda resposta é conferida contra o contrato antes
  de sair.
- Erros seguem o padrão **problem+json** (RFC 9457): 400 com a lista de campos
  inválidos, 404, 422 para regra de negócio (ex.: período acima de 366 dias),
  429 e 500 sem detalhes internos.
- O Swagger em `/docs` é gerado a partir dos mesmos schemas, inclusive as
  respostas de erro.

### Dashboard (`apps/web`)

| Rota | Conteúdo |
|---|---|
| `/` | Cards de KPI, seletor de 7/15/30 dias, ocupação atual por departamento (barras) e censo diário filtrável por departamento (linhas) |
| `/internacoes` | Listagem com busca (paciente, documento ou diagnóstico), filtros de status, departamento e período, ordenação e paginação |
| `/internacoes/:id` | Paciente, internação, responsável, gráficos de sinais vitais (FC, PA e SpO₂; temperatura em gráfico próprio) e exames |

- **Filtros na URL:** ficam nos parâmetros de busca, então os links são
  compartilháveis e o botão voltar funciona.
- **Responsivo:** tabela no desktop, cards no celular e menu no topo em telas
  pequenas.
- **Estados tratados:** lista vazia, "não encontrado" e API fora do ar (com
  botão "Tentar novamente").

---

## Arquitetura

```
apps/
  api/          NestJS 11 + Prisma 7 (arquitetura hexagonal)
  web/          TanStack Start (React 19 + Vite, SSR) + Tailwind 4 + Recharts
packages/
  contracts/    Schemas Zod compartilhados entre api e web
  tsconfig/     Presets de TypeScript
database/init/  Schema e seed fornecidos (não alterados)
```

```
navegador ──► web (SSR + server functions) ──► api (REST) ──► Postgres
              └─ API_URL só existe aqui        └─ problem+json, Swagger
```

### Contratos compartilhados

O pacote `@hospital/contracts` define em Zod a entrada e a saída de cada rota.
A API usa esses schemas para validar requisições e respostas e para gerar o
Swagger. O web usa os mesmos schemas para validar o que recebe e para tipar as
telas. Se a API mudar um campo, o TypeScript acusa o erro no front.

### API em arquitetura hexagonal

Cada módulo (`admissions`, `departments`, `indicators`, `health`) tem três
camadas:

- `domain/`: entidades, value objects e regras, em TypeScript puro. Exemplos:
  `Period`, `OccupancyRate`, `Admission.lengthOfStayDays`.
- `application/`: casos de uso e **ports** (interfaces).
- `infrastructure/`: **adapters**, isto é, controllers HTTP e repositórios Prisma.

Uma regra do Biome garante a direção das dependências: `domain` e `application`
não podem importar `@nestjs/*`, `@prisma/*` nem `infrastructure/`. Com isso, os
casos de uso são testados com repositórios em memória e um relógio fixo, sem
banco e sem Nest.

Para os indicadores, apliquei um **CQRS leve**. KPIs e censo são agregações, e
modelá-los como entidades ricas seria exagero. Os casos de uso consultam um
*query port* que devolve números calculados em SQL, e as razões e os
arredondamentos ficam no domínio.

### Web: quem chama a API é o servidor

No TanStack Start, os loaders rodam no servidor no primeiro acesso e no
navegador nas navegações seguintes. Por isso toda chamada passa por uma
**server function**: o navegador fala só com o servidor do web, que chama a API
pela rede interna. Com isso:

- não há CORS a configurar;
- a `API_URL` nunca chega ao navegador;
- as chamadas internas do web têm proteção CSRF.

---

## Decisões técnicas e trade-offs

| Decisão | Alternativa | Por quê |
|---|---|---|
| **Monorepo Turborepo + pnpm** | Pastas separadas | Contratos compartilhados, build na ordem certa, cache e `turbo prune` para imagens Docker enxutas |
| **NestJS 11** | NestJS 12, Fastify | O Nest 12 é ESM-only e o `nestjs-zod` ainda não o suporta; Nest pela estrutura modular e pela injeção de dependência |
| **Prisma 7 com driver adapter `pg`** | `pg` puro, Knex | Client tipado para listagem e detalhe, com o SQL das agregações escrito à mão |
| **`$queryRaw` nas agregações** | Prisma TypedSQL | O TypedSQL exige o banco conectado no `prisma generate`, o que quebraria o build da imagem Docker |
| **Schema do Prisma por introspecção** | `prisma migrate` | O banco é criado pelos scripts fornecidos, que seguem como fonte de verdade; o `migrate diff` contra o banco dá vazio |
| **Zod como contrato único** | class-validator | Os mesmos schemas validam a API e o front |
| **TanStack Start** no front | Next.js (o plano inicial) | Prototipei o front no Lovable, que gera TanStack Start; ele entrega o que me levaria ao Next (SSR, rotas por arquivo, filtros na URL), então mantive e integrei |
| **Server functions como BFF** | Loaders chamando a API direto | Loaders também rodam no navegador; assim a API fica atrás do web |
| **Credenciais só no `.env`** | Valores padrão no compose | Nenhum segredo versionado; custo de um passo a mais antes do `up` |
| **Não alterar o seed** | Corrigir os dados | A base é do avaliador; as inconsistências são tratadas nas queries e na interface e documentadas abaixo |
| **Port `Clock`** | `now()` do banco | Todas as consultas de um request usam o mesmo instante, e os testes ficam determinísticos |
| **Sem autenticação** | JWT/OIDC | Fora do escopo pedido; o desenho está em [O que eu faria com mais tempo](#o-que-eu-faria-com-mais-tempo) |

### Definições dos indicadores

| Indicador | Definição |
|---|---|
| **Internação ativa** | Status `internado`. É o status que vale, e não a ausência de data de alta, por causa das altas com data futura no seed. |
| **Saída efetiva** | Nula se a internação está ativa. Senão, `LEAST(discharge_date, agora)`. |
| **Leito ocupado** | Par distinto (departamento, leito) com internação ativa. |
| **Censo do dia D** | Leitos ocupados no fim do dia, ou no momento da consulta quando D é hoje. O último ponto da série bate com a ocupação atual. |
| **Datas** | As colunas são `TIMESTAMP` sem fuso, e o banco roda em UTC. API e front tratam tudo em UTC para não deslocar o dia. |

---

## Inconsistências encontradas nos dados

O seed é determinístico (`setseed(0.42)`), então quem subir o ambiente verá o
mesmo cenário.

| Achado | Causa provável | Como tratei |
|---|---|---|
| **Todos os 80 exames estão `concluido`** (zero pendentes) | A subquery `LATERAL` que sorteia o status não referencia a linha externa, então o Postgres a calcula uma única vez | O KPI mostra 0 corretamente, acompanhado do tempo médio de resultado |
| **Só 3 internações ativas, todas na Cirurgia** | Distribuição do sorteio | Acrescentei o **censo diário histórico**, que dá conteúdo à série temporal |
| **3 altas com `discharge_date` no futuro** | A alta é sorteada a partir de uma internação recente | A "saída efetiva" limita a alta ao momento atual |
| **4 exames com `requested_at` no futuro** | O mesmo sorteio, a partir de internações recentes | Exibidos como estão; o tempo de resultado considera só resultados já ocorridos |
| **Duas internações ativas no mesmo leito ao mesmo tempo** (ids 25 e 14, leito 2 da Cirurgia) | Leito sorteado sem checar ocupação | Ocupação e censo contam leitos distintos; por isso a série de altas não fecha 1 para 1 com a de ocupação |

---

## Segurança

- **SQL injection:** todo SQL bruto é parametrizado (`$queryRaw` e fragmentos
  `Prisma.sql`). A coluna de ordenação vem de um mapa fixo, nunca da entrada.
- **Validação:** limites de página (100 itens), busca (100 caracteres), período
  (366 dias) e ids (até o máximo de `INTEGER` do Postgres).
- **Erros:** nenhum 500 expõe stack ou mensagem do banco; esses detalhes vão só
  para o log.
- **Cabeçalhos:** `helmet` na API (sem `X-Powered-By`, CSP, `nosniff`). No web,
  `frame-ancestors`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`
  em todas as respostas.
- **Dados de pacientes fora de buscadores:** `robots.txt` com `Disallow: /`,
  meta `noindex` e `X-Robots-Tag`.
- **Rate limit:** 600 requisições por minuto por IP na API
  (`RATE_LIMIT_PER_MINUTE`), com 429 em problem+json. O `/health` fica de fora.
- **Swagger desligável:** `SWAGGER_ENABLED=false` em ambientes expostos.
- **Imagens Docker:** usuário sem root, sem código-fonte, sem devDependencies e
  sem `.env`.
- **Dependências:** `pnpm audit` sem alertas, com overrides para dependências
  transitivas.

**Limitação conhecida:** como o web chama a API pelo servidor, todos os usuários
do dashboard chegam à API pelo IP do container do web. O rate limit da API
protege contra acesso direto abusivo; limite por usuário é papel de um proxy ou
gateway na frente.

---

## Testes

| Pacote | Tipo | Quantidade | O que cobre |
|---|---|---|---|
| `contracts` | Unitário (Vitest) | 15 | Conversão dos parâmetros da URL, valores padrão, limites, período invertido |
| `api` | Unitário (Jest) | 38 | Value objects (`Period`, `OccupancyRate`, tempo de internação, idade) e casos de uso com fakes em memória e relógio fixo |
| `api` | e2e (Jest + Testcontainers) | 37 | HTTP → casos de uso → SQL contra um Postgres real com os scripts de `database/init` |
| `web` | Unitário (Vitest) | 12 | Cliente HTTP (contrato, problem+json, falha de conexão), formatação e rotas |

- **Datas relativas:** as datas do seed dependem do `NOW()`, então os e2e
  conferem **invariantes**. Exemplos: a soma da ocupação por departamento é
  igual à ocupação geral; o último ponto do censo é igual à ocupação atual; a
  paginação percorre tudo sem repetir.
- **Casos de borda com valores exatos:** um departamento isolado, com fixtures
  numa linha do tempo controlada, cobre leito sobreposto, alta futura e
  `%`/`_` na busca.
- **Os testes pegam regressões:** removi de propósito o escape do `LIKE` e a
  contagem de leitos distintos, e cada mutação derrubou o seu teste.

---

## Fluxo de Git

- **Gitflow:** `main` (entregas), `develop` (integração) e uma branch
  `feature/*` por etapa.
- **PRs com raciocínio:** cada etapa entrou por Pull Request, revisado e
  mergeado por mim, com a descrição explicando o porquê das decisões. São 14
  PRs, do #1 (estrutura do monorepo) ao desta documentação.
- **Commits:** Conventional Commits, curtos e assinados com chave SSH (selo
  *Verified* no GitHub).

---

## O que eu faria com mais tempo

1. **Autenticação e autorização.** São dados de saúde, sensíveis pela LGPD:
   - OIDC com um provedor (Keycloak, Entra ID) em vez de login caseiro. O web
     guarda a sessão em cookie `httpOnly`, e a API valida o JWT num guard
     global, com o `/health` público.
   - Perfis por papel. A gestão vê indicadores agregados; médicos e enfermagem
     veem o detalhe do paciente (o schema já tem `staff.role`).
   - Auditoria de quem acessou o detalhe de qual paciente, e documento
     mascarado nas listagens.
   - Na arquitetura hexagonal, isso entra como um módulo `auth` com ports
     (`TokenVerifier`, `AccessPolicy`), sem tocar nos módulos existentes.
2. **Índices com evidência.** Com 40 internações o ganho é pequeno, mas eu
   adicionaria um `03_indexes.sql` (`admissions(admission_date)`,
   `(status, department_id)`) justificado com `EXPLAIN ANALYZE` antes e depois.
   Num volume real, valeria uma view materializada para o censo.
3. **CI:** GitHub Actions rodando lint, typecheck, testes unitários e e2e e o
   build das imagens em cada PR, com a `main` protegida.
4. **Testes de interface:** Playwright cobrindo os fluxos principais
   (filtrar → abrir detalhe → voltar) em desktop e celular.
5. **CSP completa no web,** com nonce nos scripts inline do SSR.
6. **Fontes hospedadas junto com a aplicação,** em vez do Google Fonts, para o
   navegador do usuário não conectar com terceiros.
7. **Observabilidade:** logs estruturados (pino) com id de correlação entre web
   e API, e métricas e traces com OpenTelemetry.
8. **Cache:** `Cache-Control` curto nos indicadores e cache das agregações,
   invalidado por janela de tempo.

---

## Deploy em nuvem

As duas imagens são independentes e configuradas só por variáveis de ambiente,
então rodam em qualquer orquestrador de containers. Exemplo na AWS:

| Peça | Serviço |
|---|---|
| Banco | **RDS PostgreSQL 16** em sub-rede privada. Rodar `database/init/01_schema.sql` e `02_seed.sql` uma vez com `psql`. |
| API e web | **ECS Fargate** (um serviço cada), imagens no **ECR**, gerando com `docker build -f apps/<app>/Dockerfile .` |
| Entrada | **Application Load Balancer** com HTTPS (ACM) apontando só para o web. A API fica sem acesso público, na rede interna. |
| Segredos | **Secrets Manager** para `DATABASE_URL`, injetado como variável no serviço da API |

| Variável | Serviço | Valor em produção |
|---|---|---|
| `DATABASE_URL` | api | URL do RDS (via Secrets Manager) |
| `SWAGGER_ENABLED` | api | `false` |
| `RATE_LIMIT_PER_MINUTE` | api | Conforme o tráfego esperado |
| `API_URL` | web | Endereço interno da API (ex.: Service Connect) |

Os health checks do ALB e do ECS usam os endpoints já existentes: `/health` na
API e `/robots.txt` no web. O mesmo desenho se aplica a Cloud Run + Cloud SQL ou
a Azure Container Apps + Azure Database for PostgreSQL.

---

## Uso de IA

Usei o **Claude Code** (Claude, da Anthropic) como par de programação no
terminal, e o **Lovable** para prototipar a interface. O modelo de trabalho foi
**cooperativo e supervisionado**: a IA executava e propunha, e eu decidia,
revisava e integrava. A autonomia dela foi baixa por escolha. Ela não avançava
de etapa, não escolhia a stack sozinha e não integrava código sem a minha
aprovação.

### Como dividimos o trabalho

**Planejamento conjunto, antes de qualquer código.**
- Comecei pedindo uma análise do desafio e do banco. A IA subiu o Postgres,
  consultou os dados e apontou as inconsistências do seed.
- A partir disso, montamos juntos um plano registrado em documento, com um
  registro de decisões.
- As decisões de arquitetura foram minhas: Turborepo, NestJS no lugar do
  Fastify que ela propôs, Prisma, arquitetura hexagonal, Gitflow com PRs,
  credenciais só no `.env` e a organização dos contratos por domínio.
- A IA contribuía com análise de alternativas e trade-offs. Por exemplo,
  levantou que o Nest 12 é ESM-only e que o TypedSQL quebraria o build Docker.
- Em vários momentos, pedi para ela **não começar nada** até eu revisar a
  arquitetura.

**Execução em etapas pequenas, com ponto de controle humano em cada uma.**
- Cada etapa virou uma branch `feature/*` e um Pull Request.
- A IA implementava, rodava as verificações e abria o PR com a descrição do
  raciocínio. **Eu revisava e fazia o merge.** Ela não tinha permissão para
  mergear, e só começava a etapa seguinte depois que eu avisava.
- Defini o padrão dos commits (curtos, sem co-autoria da IA) e pedi para ela
  reescrever os primeiros quando não seguiram esse padrão.
- Os commits são assinados com a minha chave SSH. Eu a carregava no agente a
  cada sessão, o que também funcionava como trava: sem a chave, a IA não
  conseguia commitar.

**Supervisão do que entrava.**
- Revisei cada PR e pedi ajustes de rumo, como reorganizar os contratos por
  domínio, documentar os erros no Swagger e fazer uma revisão de segurança.
- O frontend foi prototipado por mim no Lovable. Depois pedi à IA que
  analisasse o código, removesse todas as dependências e referências da
  plataforma, o integrasse ao monorepo e o ligasse à API.
- Também pedi uma auditoria de dados sensíveis antes do merge. Ela apontou, por
  exemplo, metadados EXIF no favicon.

### Onde a IA ajudou mais

- **Análise:** levantar as inconsistências do seed e definir regras coerentes
  para os indicadores.
- **Verificação:**
  - os testes e2e com Testcontainers e o teste de mutação para provar que os
    testes pegam regressões;
  - a validação do `docker compose up --build` num clone limpo, como o avaliador
    fará.
- **Problemas que só apareceram na verificação.** A conferência sistemática
  pegou falhas, inclusive em código que a própria IA tinha escrito:
  - o build incremental do TypeScript gerando só parte dos arquivos;
  - o pool do Postgres sem timeout travando o health check;
  - ids acima de `INTEGER` gerando 500;
  - a rota de detalhe renderizando a listagem no protótipo;
  - o healthcheck do container falhando por IPv6.

### Limites que mantive

- Nenhuma decisão de stack, arquitetura ou escopo foi tomada pela IA sem a
  minha confirmação.
- Nenhum merge, push na `main` ou release foi feito pela IA; releases e
  revisões ficaram comigo.
- Itens fora do pedido, como autenticação, foram discutidos antes. Optei por
  documentar o desenho em vez de implementar.
