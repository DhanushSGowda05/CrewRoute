import { apiService } from './base.service';
import { EmergencyAlert, TriggerAlertDto } from '../../types';

class EmergencyService {
  // Trigger alert
  async triggerAlert(rideId: string, data: TriggerAlertDto): Promise<{ alert: EmergencyAlert }> {
    return apiService.post(`/rides/${rideId}/emergency`, data);
  }

  // Get alerts
  async getAlerts(rideId: string): Promise<EmergencyAlert[]> {
    return apiService.get(`/rides/${rideId}/emergency`);
  }

  // Resolve alert
  async resolveAlert(alertId: string): Promise<{ alert: any; message: string }> {
    return apiService.patch(`/emergency/${alertId}/resolve`);
  }
}

export const emergencyService = new EmergencyService();