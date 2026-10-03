import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { DatabaseHealth } from '../../application/ports/database-health';

@Injectable()
export class PrismaDatabaseHealth extends DatabaseHealth {
  private readonly logger = new Logger(PrismaDatabaseHealth.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isUp(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn(`Banco indisponível: ${(error as Error).message}`);
      return false;
    }
  }
}
