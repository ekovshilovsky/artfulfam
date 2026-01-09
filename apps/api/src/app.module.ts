import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { TemplatesModule } from './templates/templates.module';
import { DraftsModule } from './drafts/drafts.module';

@Module({
  imports: [TemplatesModule, DraftsModule],
  controllers: [HealthController],
})
export class AppModule {}
