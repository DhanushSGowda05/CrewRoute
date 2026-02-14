export interface Coordinates {
  lat: number;
  lng: number;
}

export interface RouteData {
  distance: string; // "346 km"
  duration: string; // "5 hours 30 mins"
  distanceMeters: number; // 346000
  durationSeconds: number; // 19800
  polyline: string; // Encoded polyline
}

export interface Place {
  id: string;
  name: string;
  location: Coordinates;
  distance?: number; // meters from search origin
  address?: string;
  rating?: number;
  types?: string[];
}

export interface MapsProvider {
  getRoute(
    origin: Coordinates,
    destination: Coordinates,
    waypoints?: Coordinates[],
  ): Promise<RouteData>;

  geocode(address: string): Promise<Coordinates>;

  reverseGeocode(coords: Coordinates): Promise<string>;

  searchNearby(location: Coordinates, type: string, radius: number): Promise<Place[]>;
}