import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/app.setup';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

export interface TestApp {
  app: INestApplication;
  prisma: PrismaService;
}

/** Aplicação completa (mesma configuração HTTP do main.ts) ligada ao banco de teste. */
export async function createTestApp(): Promise<TestApp> {
  // Trava contra rodar os testes (que inserem fixtures) no banco de desenvolvimento.
  if (process.env.E2E_TESTCONTAINERS !== 'true') {
    throw new Error('Testes e2e precisam do banco do Testcontainers (rode via test:e2e).');
  }

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return { app, prisma: app.get(PrismaService) };
}
