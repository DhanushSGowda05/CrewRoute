export interface RegroupPoint {
  id: string;
  rideId: string;
  name: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  waitUntilAll: boolean;
  arrivedRiders: string[];  // userIds
  createdAt: string;
  completedAt?: string;
}

export interface CreateRegroupDto {
  name: string;
  latitude: number;
  longitude: number;
}