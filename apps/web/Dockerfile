# syntax=docker/dockerfile:1
# Build a partir da raiz do monorepo:
#   docker build -f apps/web/Dockerfile .

FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# A versão do pnpm vem do campo packageManager do package.json raiz
RUN corepack enable

# 1. Recorta o monorepo: só o web e os pacotes de que ele depende
FROM base AS pruner
WORKDIR /repo
RUN npm install -g turbo@2.11.7
COPY . .
RUN turbo prune @hospital/web --docker

# 2. Instala dependências (camada em cache enquanto o lockfile não muda) e compila
FROM base AS builder
WORKDIR /repo
COPY --from=pruner /repo/out/json/ .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
COPY --from=pruner /repo/out/full/ .
# Compila @hospital/contracts e o web; o Nitro gera um servidor Node
# autocontido (dependências já empacotadas) em apps/web/.output
RUN pnpm turbo run build --filter=@hospital/web

# 3. Imagem final: só o servidor gerado, sem node_modules, sem root
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /repo/apps/web/.output ./.output
USER node
EXPOSE 3000
# Verifica só o servidor do web (arquivo estático), sem depender da API
HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -qO- http://localhost:3000/robots.txt > /dev/null || exit 1
CMD ["node", ".output/server/index.mjs"]
