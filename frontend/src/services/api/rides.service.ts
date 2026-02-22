import { apiService } from './base.service';
import { Ride } from '../../types';

class RidesService {
  // Create ride
  async createRide(data: {
    pickup: { lat: number; lng: number; address: string };
    destination: { lat: number; lng: number; address: string };
    rideName?: string;
    waypoints?: Array<{ lat: number; lng: number }>;
  }): Promise<{ ride: Ride }> {
    return apiService.post('/rides', data);
  }

  // Join ride - SIMPLE STRING PARAMETER
  async joinRide(rideCode: string): Promise<{ ride: Ride }> {
    return apiService.post('/rides/join', { rideCode });
  }

  // Get ride details
  async getRide(rideId: string): Promise<{ ride: Ride }> {
    return apiService.get(`/rides/${rideId}`);
  }

  
 // List my rides
async listMyRides(status?: string): Promise<Ride[]> {
  const response = await apiService.get<{ rides: Ride[] }>('/rides', { status });
  return response.rides; // ✅ Return the array, not the object
}


  // Start ride
  async startRide(rideId: string): Promise<{ ride: Ride }> {
    return apiService.post(`/rides/${rideId}/start`);
  }

  // Complete ride
  async completeRide(rideId: string): Promise<{ ride: Ride }> {
    return apiService.post(`/rides/${rideId}/complete`);
  }

  // Cancel ride
  async cancelRide(rideId: string): Promise<{ message: string }> {
    return apiService.post(`/rides/${rideId}/cancel`);
  }

  // Leave ride
  async leaveRide(rideId: string): Promise<{ message: string }> {
    return apiService.delete(`/rides/${rideId}/leave`);
  }
}

export const ridesService = new RidesService();