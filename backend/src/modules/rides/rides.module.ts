import { Module } from '@nestjs/common';
import { RidesController } from './rides.controller';
import { RidesService } from './rides.service';
import { MapsModule } from '../maps/maps.module';
import { LocationsModule } from '../locations/locations.module';

@Module({
  imports: [MapsModule, LocationsModule],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}