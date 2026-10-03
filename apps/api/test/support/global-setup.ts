import { resolve } from 'node:path';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

declare global {
  var __POSTGRES_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

/**
 * Sobe um Postgres descartável com os mesmos scripts de database/init usados
 * pelo docker-compose. As credenciais são geradas pelo Testcontainers e só
 * existem durante a execução dos testes.
 */
export default async function globalSetup(): Promise<void> {
  const initScripts = resolve(__dirname, '../../../../database/init');

  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withCopyDirectoriesToContainer([
      { source: initScripts, target: '/docker-entrypoint-initdb.d' },
    ])
    .start();

  globalThis.__POSTGRES_CONTAINER__ = container;
  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.E2E_TESTCONTAINERS = 'true';
  process.env.NODE_ENV = 'test';
  process.env.CORS_ORIGIN = '';
}
