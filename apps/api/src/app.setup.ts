import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppConfig } from './shared/infrastructure/config/app-config';

export const API_PREFIX = 'api/v1';

/** Configuração HTTP compartilhada entre o main.ts e os testes e2e. */
export function configureApp(app: INestApplication): void {
  const { env } = app.get(AppConfig);

  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });
  app.enableShutdownHooks();

  if (env.CORS_ORIGIN.length > 0) {
    app.enableCors({ origin: env.CORS_ORIGIN, methods: ['GET'] });
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Hospital Vida Plena — API')
      .setDescription('Indicadores, ocupação de leitos e internações para o dashboard de gestão.')
      .setVersion('1.0')
      .build(),
  );
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(document));
}
