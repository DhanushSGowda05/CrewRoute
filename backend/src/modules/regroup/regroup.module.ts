import { Module } from '@nestjs/common';
import { RegroupController } from './regroup.controller';
import { RegroupService } from './regroup.service';

@Module({
  controllers: [RegroupController],
  providers: [RegroupService],
  exports: [RegroupService],
})
export class RegroupModule {}