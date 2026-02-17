import { apiService } from './base.service';
import { RegroupPoint, CreateRegroupDto } from '../../types';

class RegroupService {
  // Create regroup point
  async createRegroup(rideId: string, data: CreateRegroupDto): Promise<{ regroupPoint: RegroupPoint }> {
    return apiService.post(`/rides/${rideId}/regroup`, data);
  }

  // Get regroup points
  async getRegroupPoints(rideId: string): Promise<RegroupPoint[]> {
    return apiService.get(`/rides/${rideId}/regroup`);
  }

  // Mark arrived
  async markArrived(regroupId: string): Promise<{ regroupPoint: any; message: string }> {
    return apiService.patch(`/regroup/${regroupId}/arrive`);
  }

  // Complete regroup
  async completeRegroup(regroupId: string): Promise<{ regroupPoint: any; message: string }> {
    return apiService.patch(`/regroup/${regroupId}/complete`);
  }
}

export const regroupService = new RegroupService();