export interface SocketAuthData {
  token: string;
}

export interface JoinRideEvent {
  rideId: string;
}

export interface LeaveRideEvent {
  rideId: string;
}

export interface UserJoinedEvent {
  userId: string;
  username: string;
  joinedAt: string;
}

export interface UserLeftEvent {
  userId: string;
  username: string;
}

export interface RideStartedEvent {
  rideId: string;
  startedBy: string;
  username: string;
  startedAt: string;
}

export interface RideCompletedEvent {
  rideId: string;
  completedAt: string;
  statistics: {
    actualDuration: string;
  };
}

export interface SOSTriggeredEvent {
  alertId: string;
  userId: string;
  username: string;
  alertType: string;
  location: {
    latitude: number;
    longitude: number;
  };
  message?: string;
  triggeredAt: string;
}

export interface ForcedLeaveEvent {
  rideId: string;
  reason: string;
}