import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppConfig } from './shared/infrastructure/config/app-config';

export const API_PREFIX = 'api/v1';

/** Configuração HTTP compartilhada entre o main.ts e os testes e2e. */
export function configureApp(app: INestApplication): void {
  const { env } = app.get(AppConfig);

  app.setGlobalPrefix(API_PREFIX, { exclude: ['health'] });

  // Cabeçalhos de segurança (nosniff, frame-ancestors, sem X-Powered-By...).
  // A CSP libera inline apenas para o Swagger UI em /docs funcionar.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          frameAncestors: ["'none'"],
          // HTTPS é responsabilidade do proxy/balanceador; forçar aqui quebraria o
          // Swagger servido em http://localhost.
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.enableShutdownHooks();

  if (env.CORS_ORIGIN.length > 0) {
    app.enableCors({ origin: env.CORS_ORIGIN, methods: ['GET'] });
  }

  if (!env.SWAGGER_ENABLED) return;

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
