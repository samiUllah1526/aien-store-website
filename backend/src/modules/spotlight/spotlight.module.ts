import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SpotlightService } from './spotlight.service';

@Module({
  imports: [PrismaModule],
  providers: [SpotlightService],
  exports: [SpotlightService],
})
export class SpotlightModule {}
