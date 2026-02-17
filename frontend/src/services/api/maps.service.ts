import { apiService } from './base.service';

// ─── Types ────────────────────────────────────────────────
export interface AutocompleteSuggestion {
  placeId: string;
  name: string;
  description: string;
  lat: number | null;
  lng: number | null;
}

export interface RouteData {
  distance: string;
  duration: string;
  distanceMeters: number;
  durationSeconds: number;
  polyline: string;
}

export interface RouteResponse {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: { lat: number; lng: number }[];
  route: RouteData;
}

// ─── Service ──────────────────────────────────────────────
class MapsService {

  // Get route between two points
  async getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: { lat: number; lng: number }[],
  ): Promise<RouteResponse> {
    const params: any = {
      originLat: origin.lat,
      originLng: origin.lng,
      destLat: destination.lat,
      destLng: destination.lng,
    };

    if (waypoints && waypoints.length > 0) {
      params.waypointsStr = waypoints
        .map(w => `${w.lat},${w.lng}`)
        .join('|');
    }

    return apiService.get('/places/route', params);
  }

  // Autocomplete search (Ola Maps via backend)
  async autocomplete(
    input: string,
    location?: { lat: number; lng: number },
  ): Promise<AutocompleteSuggestion[]> {
    const params: any = { input };

    if (location) {
      params.lat = location.lat;
      params.lng = location.lng;
    }

    const response = await apiService.get<{
      suggestions: AutocompleteSuggestion[];
      count: number;
    }>('/places/autocomplete', params);

    return response?.suggestions || [];
  }

  // Geocode address → coordinates
  async geocode(address: string): Promise<{
    address: string;
    coordinates: { lat: number; lng: number };
  }> {
    return apiService.get('/places/geocode', { address });
  }

  // Reverse geocode coordinates → address
  async reverseGeocode(lat: number, lng: number): Promise<{
    coordinates: { lat: number; lng: number };
    address: string;
  }> {
    return apiService.get('/places/reverse-geocode', { lat, lng });
  }

  // Search nearby places
  async searchNearby(
    lat: number,
    lng: number,
    type: string,
    radius: number = 5000,
  ): Promise<any> {
    return apiService.get('/places/nearby', { lat, lng, type, radius });
  }
}

export const mapsService = new MapsService();
