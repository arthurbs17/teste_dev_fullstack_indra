import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';
import { AppConfig } from '../config/app-config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: AppConfig) {
    super({
      adapter: new PrismaPg({
        connectionString: config.env.DATABASE_URL,
        // Sem timeout, o pool espera indefinidamente quando o banco está
        // inacessível (pacotes descartados), travando requests e o health check.
        connectionTimeoutMillis: 5_000,
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
