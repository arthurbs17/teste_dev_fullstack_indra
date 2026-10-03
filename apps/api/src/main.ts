import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { AppConfig } from './shared/infrastructure/config/app-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const { env } = app.get(AppConfig);
  await app.listen(env.API_PORT);
  Logger.log(`API em http://localhost:${env.API_PORT} (docs em /docs)`, 'Bootstrap');
}

void bootstrap();
