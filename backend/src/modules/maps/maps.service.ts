import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
//import { GoogleMapsProvider } from './providers/google-maps.provider';
import { OlaMapsProvider } from './providers/ola-maps.provider';  // ← ADD
import { MapsProvider, Coordinates, RouteData, Place } from './interfaces/maps-provider.interface';

@Injectable()
export class MapsService {
  private provider: MapsProvider;

  constructor(
    private configService: ConfigService,
    //private googleMapsProvider: GoogleMapsProvider,
    private olaMapsProvider: OlaMapsProvider,  // ← ADD
  ) {
    this.provider = this.olaMapsProvider;
    console.log('🗺️  Maps provider: Ola Maps');
  }

  // Delegate to active provider
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

  // Helper: Calculate distance between two coordinates (Haversine formula)
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (coord1.lat * Math.PI) / 180;
    const φ2 = (coord2.lat * Math.PI) / 180;
    const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
    const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Helper: Format distance for display
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  }

  // Helper: Format duration for display
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) {
      return `${minutes} min`;
    }
    return `${hours} hr ${minutes} min`;
  }
}