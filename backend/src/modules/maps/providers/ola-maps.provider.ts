import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MapsProvider, Coordinates, RouteData, Place } from '../interfaces/maps-provider.interface';

@Injectable()
export class OlaMapsProvider implements MapsProvider {
  private apiKey: string;
  private baseUrl = 'https://api.olamaps.io';

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('maps.olaApiKey')!;

    if (!this.apiKey) {
      console.warn('⚠️ OLA_MAPS_API_KEY not set - maps functionality will fail');
    }
  }

  // ==========================
  // ROUTE (Directions API)
  // ==========================
  async getRoute(
    origin: Coordinates,
    destination: Coordinates,
    waypoints?: Coordinates[],
  ): Promise<RouteData> {
    try {
      const originParam = `${origin.lat},${origin.lng}`;
      const destinationParam = `${destination.lat},${destination.lng}`;

      const waypointsParam =
        waypoints && waypoints.length > 0
          ? `&waypoints=${waypoints.map(w => `${w.lat},${w.lng}`).join('|')}`
          : '';

      const url = `${this.baseUrl}/routing/v1/directions?origin=${originParam}&destination=${destinationParam}${waypointsParam}&api_key=${this.apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Ola Directions Error:', errorBody);
        throw new HttpException(
          'Ola Maps Directions API error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();

      const route = data.routes?.[0];
      const leg = route?.legs?.[0];

      if (!route || !leg) {
        throw new HttpException('No route found', HttpStatus.NOT_FOUND);
      }

      return {
        distance: leg.readable_distance,
        duration: leg.readable_duration,
        distanceMeters: leg.distance,
        durationSeconds: leg.duration,
        polyline: route.overview_polyline,
      };
    } catch (error) {
      console.error('Ola Maps getRoute error:', error);
      throw new HttpException(
        'Failed to get route from Ola Maps',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==========================
  // FORWARD GEOCODE
  // ==========================
  async geocode(address: string): Promise<Coordinates> {
    try {
      const url = `${this.baseUrl}/places/v1/geocode?address=${encodeURIComponent(
        address,
      )}&api_key=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Ola Geocode Error:', errorBody);
        throw new HttpException(
          'Ola Maps geocoding error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();

      const result = data.geocodingResults?.[0];

      if (!result) {
        throw new HttpException('Address not found', HttpStatus.NOT_FOUND);
      }

      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      };
    } catch (error) {
      console.error('Ola Maps geocode error:', error);
      throw new HttpException(
        'Failed to geocode address',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  // ==========================
  // REVERSE GEOCODE
  // ==========================
  async reverseGeocode(coords: Coordinates): Promise<string> {
    try {
      const url = `${this.baseUrl}/places/v1/reverse-geocode?latlng=${coords.lat},${coords.lng}&api_key=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Ola Reverse Geocode Error:', errorBody);
        throw new HttpException(
          'Ola Maps reverse geocoding error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();

      const result = data.results?.[0];

      if (!result) {
        throw new HttpException('Location not found', HttpStatus.NOT_FOUND);
      }

      return result.formatted_address;
    } catch (error) {
      console.error('Ola Maps reverseGeocode error:', error);
      throw new HttpException(
        'Failed to reverse geocode',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


  // ==========================
  // NEARBY SEARCH
  // ==========================
  async searchNearby(
    location: Coordinates,
    type: string,
    radius: number,
  ): Promise<Place[]> {
    try {
      const url = `${this.baseUrl}/places/v1/nearbysearch?location=${location.lat},${location.lng}&types=${type}&radius=${radius}&api_key=${this.apiKey}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Ola Nearby Error:', errorBody);
        throw new HttpException(
          'Ola Maps nearby search error',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = await response.json();

      const places = data.predictions;

      if (!places || places.length === 0) {
        return [];
      }

      return places.map((place: any) => ({
        id: place.place_id,
        name: place.structured_formatting?.main_text || place.description,
        location: {
          lat: null,
          lng: null,
        },
        address:
          place.structured_formatting?.secondary_text || place.description,
        rating: undefined,
        types: place.types,
      }));
    } catch (error) {
      console.error('Ola Maps searchNearby error:', error);
      return [];
    }
  }

  // ==========================
  // HELPERS
  // ==========================
  private formatDistance(meters: number): string {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1)} km`;
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) return `${minutes} min`;
    return `${hours} hr ${minutes} min`;
  }
}
