export type RideStatus = 'CREATED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type ParticipantRole = 'owner' | 'participant';

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface Route {
  distance: number;        // meters
  duration: number;        // seconds
  polyline: string;        // encoded polyline
}

export interface Ride {
  id: string;
  rideCode: string;
  rideName?: string;
  status: RideStatus;
  ownerId: string;
  
  // Locations
  pickup: Location;
  destination: Location;
  waypoints?: Location[];
  
  // Route info
  route: Route;
  
  // Timestamps
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  
  // Participants
  participants?: Participant[];
}

export interface Participant {
  userId: string;
  username: string;
  role: ParticipantRole;
  joinedAt: string;
  leftAt?: string;
}

export interface CreateRideDto {
  pickup: Location;
  destination: Location;
  waypoints?: Location[];
  rideName?: string;
}

export interface JoinRideDto {
  rideCode: string;
}