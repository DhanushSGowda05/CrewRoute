import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { MapsService } from './maps.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { GetRouteDto } from './dto/get-route.dto';
import { SearchPlacesDto } from './dto/search-places.dto';

@Controller('places')
@UseGuards(ClerkAuthGuard)
export class MapsController {
  constructor(private mapsService: MapsService) {}

  @Get('route')
  async getRoute(@Query() dto: GetRouteDto) {
    const { originLat, originLng, destLat, destLng, waypointsStr } = dto;

    const origin = { lat: parseFloat(originLat), lng: parseFloat(originLng) };
    const destination = { lat: parseFloat(destLat), lng: parseFloat(destLng) };

    let waypoints: { lat: number; lng: number }[] | undefined = undefined;

    if (waypointsStr) {
      try {
        const waypointPairs = waypointsStr.split('|');
        waypoints = waypointPairs.map((pair) => {
          const [lat, lng] = pair.split(',');
          return { lat: parseFloat(lat), lng: parseFloat(lng) };
        });
      } catch (error) {
        throw new BadRequestException('Invalid waypoints format. Use: lat1,lng1|lat2,lng2');
      }
    }

    const route = await this.mapsService.getRoute(origin, destination, waypoints);
    return { origin, destination, waypoints, route };
  }

  @Get('nearby')
  async searchNearby(@Query() dto: SearchPlacesDto) {
    const { lat, lng, type, radius } = dto;
    const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const searchRadius = radius ? parseInt(radius) : 5000;
    const places = await this.mapsService.searchNearby(location, type, searchRadius);
    return { location, type, radius: searchRadius, count: places.length, places };
  }

  @Get('geocode')
  async geocode(@Query('address') address: string) {
    if (!address) throw new BadRequestException('Address is required');
    const coordinates = await this.mapsService.geocode(address);
    return { address, coordinates };
  }

  @Get('reverse-geocode')
  async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    if (!lat || !lng) throw new BadRequestException('Both lat and lng are required');
    const coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const address = await this.mapsService.reverseGeocode(coordinates);
    return { coordinates, address };
  }

  // ✅ NEW: Autocomplete
  @Get('autocomplete')
  async autocomplete(
    @Query('input') input: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
  ) {
    if (!input || input.trim().length < 2) {
      throw new BadRequestException('Input must be at least 2 characters');
    }

    const location =
      lat && lng
        ? { lat: parseFloat(lat), lng: parseFloat(lng) }
        : undefined;

    const suggestions = await this.mapsService.autocomplete(input.trim(), location);

    return {
      input,
      location,
      count: suggestions.length,
      suggestions,
    };
  }
}
