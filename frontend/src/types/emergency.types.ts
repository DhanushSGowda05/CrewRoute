export type AlertType = 'SOS' | 'BREAKDOWN' | 'ACCIDENT' | 'MEDICAL';

export type AlertStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';

export interface EmergencyAlert {
  id: string;
  rideId: string;
  userId: string;
  username: string;
  alertType: AlertType;
  status: AlertStatus;
  message?: string;
  latitude: number;
  longitude: number;
  triggeredAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface TriggerAlertDto {
  alertType: AlertType;
  latitude: number;
  longitude: number;
  message?: string;
}