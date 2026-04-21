import { Module } from '@nestjs/common';
import { MappingsService } from './mappings.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MappingsService],
  exports: [MappingsService],
})
export class MappingsModule {}
