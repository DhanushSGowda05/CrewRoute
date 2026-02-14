import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

import { OlaMapsProvider } from './providers/ola-maps.provider';  // ← ADD

@Module({
  controllers: [MapsController],
  providers: [
    MapsService, 
    OlaMapsProvider,  // ← ADD
  ],
  exports: [MapsService],
})
export class MapsModule {}