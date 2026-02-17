import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OlaMapsProvider, AutocompleteSuggestion } from './providers/ola-maps.provider';
import { MapsProvider, Coordinates, RouteData, Place } from './interfaces/maps-provider.interface';

export type { AutocompleteSuggestion };


@Injectable()
export class MapsService {
  private provider: MapsProvider;

  constructor(
    private configService: ConfigService,
    private olaMapsProvider: OlaMapsProvider,
  ) {
    this.provider = this.olaMapsProvider;
    console.log('🗺️  Maps provider: Ola Maps');
  }

  async getRoute(
    origin: Coordinates,
    destination: Coordinates,
    waypoints?: Coordinates[],
  ): Promise<RouteData> {
    return this.provider.getRoute(origin, destination, waypoints);
  }

  async geocode(address: string): Promise<Coordinates> {
    return this.provider.geocode(address);
  }

  async reverseGeocode(coords: Coordinates): Promise<string> {
    return this.provider.reverseGeocode(coords);
  }

  async searchNearby(
    location: Coordinates,
    type: string,
    radius: number,
  ): Promise<Place[]> {
    return this.provider.searchNearby(location, type, radius);
  }

  // ✅ NEW: Autocomplete
  async autocomplete(
    input: string,
    location?: Coordinates,
  ): Promise<AutocompleteSuggestion[]> {
    return this.olaMapsProvider.autocomplete(input, location);
  }

  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371e3;
    const φ1 = (coord1.lat * Math.PI) / 180;
    const φ2 = (coord2.lat * Math.PI) / 180;
    const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours === 0) return `${minutes} min`;
    return `${hours} hr ${minutes} min`;
  }
}