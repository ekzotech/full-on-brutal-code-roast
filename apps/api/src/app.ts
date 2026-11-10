import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CommentsController } from './comments';
import { DatabaseModule } from './database';
import { LanguagesController } from './languages';
import { PastesController } from './pastes';

@Controller('health')
class HealthController {
  constructor(private readonly db: DataSource) {}

  @Get()
  status() {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.db.query('SELECT 1');
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController, LanguagesController, PastesController, CommentsController],
})
export class AppModule {}
