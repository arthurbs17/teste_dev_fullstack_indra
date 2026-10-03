# syntax=docker/dockerfile:1
# Build a partir da raiz do monorepo:
#   docker build -f apps/api/Dockerfile .

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# A versão do pnpm vem do campo packageManager do package.json raiz
RUN corepack enable

# 1. Recorta o monorepo: só a api e os pacotes de que ela depende
FROM base AS pruner
WORKDIR /repo
RUN npm install -g turbo@2.11.7
COPY . .
RUN turbo prune @hospital/api --docker

# 2. Instala dependências (camada em cache enquanto o lockfile não muda) e compila
FROM base AS builder
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# "build" depende de "generate" (prisma generate), que não precisa de banco
RUN pnpm turbo run build --filter=@hospital/api
# Pasta autocontida só com dependências de produção (inclui @hospital/contracts)
RUN pnpm --filter @hospital/api deploy --prod --legacy /out/api
# O pnpm resolve as peers opcionais do @prisma/client ("prisma" e "typescript")
# a partir das devDependencies da api, levando o CLI do Prisma (Studio, React,
# pglite...) para a produção. O client gerado só usa @prisma/client/runtime,
# então essas árvores são removidas (~300MB).
RUN cd /out/api/node_modules/.pnpm \
  && rm -rf prisma@* @prisma+studio-core@* @prisma+engines@* @prisma+dev@* @prisma+config@* \
            @prisma+fetch-engine@* @prisma+get-platform@* effect@* @electric-sql+* \
            react@* react-dom@* typescript@*

# 3. Imagem final: sem código-fonte, sem devDependencies, sem root
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /out/api ./
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:3001/health > /dev/null || exit 1
CMD ["node", "dist/main.js"]
