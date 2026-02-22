export type RideStatus = 'CREATED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type ParticipantRole = 'owner' | 'participant';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

// ─── Request DTOs ─────────────────────────────────────────

export interface CreateRideDto {
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  destination: {
    lat: number;
    lng: number;
    address: string;
  };
  rideName?: string;
  waypoints?: Array<{
    lat: number;
    lng: number;
  }>;
}

export interface JoinRideDto {
  rideCode: string;
}

export interface Route {
  distance: number;        // meters
  duration: number;        // seconds
  polyline: string;        // encoded polyline
}

// ✅ ADD THIS:
export interface Participant {
  userId: string;
  username: string;
  role: ParticipantRole;
  joinedAt: string;
  leftAt: string | null;
}

export interface Ride {
  id: string;
  rideCode: string;
  ownerId: string;
  status: RideStatus;
  rideName: string | null;
  
  // Pickup
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string | null;
  
  // Destination
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string | null;
  
  // Route
  routePolyline: string | null;
  routeDistance: number | null;
  routeDuration: number | null;
  
  // Timestamps
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  
  // Stats
  actualDistance: number | null;
  actualDuration: number | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
  
  // Relations
  participants: Participant[];
  
  // Legacy compatibility (for old code)
  pickup: Location;
  destination: Location;
  route: {
    distance: string;
    duration: string;
    distanceMeters: number;
    durationSeconds: number;
    polyline: string;
  };
}