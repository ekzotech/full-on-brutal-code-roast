import { Controller, Get, Module } from '@nestjs/common';
import { DatabaseModule } from './database';
import { LanguagesController } from './languages';
import { PastesController } from './pastes';

@Controller('health')
class HealthController {
  @Get()
  status() {
    return { status: 'ok' };
  }
}

@Module({ imports: [DatabaseModule], controllers: [HealthController, LanguagesController, PastesController] })
export class AppModule {}
