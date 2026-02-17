export interface LocationUpdate {
  rideId: string;
  latitude: number;
  longitude: number;
  speed?: number;        // m/s
  heading?: number;      // 0-360 degrees
  accuracy?: number;     // meters
  timestamp?: number;
}

export interface RiderLocation {
  userId: string;
  username: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}