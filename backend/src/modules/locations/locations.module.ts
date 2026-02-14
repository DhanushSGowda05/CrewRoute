import { Module } from '@nestjs/common';
import { LocationsGateway } from './locations.gateway';
import { LocationsService } from './locations.service';

@Module({
  providers: [LocationsGateway, LocationsService],
  exports: [LocationsGateway, LocationsService],
})
export class LocationsModule {}