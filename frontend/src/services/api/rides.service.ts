import { apiService } from './base.service';
import { Ride, CreateRideDto, JoinRideDto } from '../../types';

class RidesService {
  // Create ride
  async createRide(data: CreateRideDto): Promise<{ ride: Ride }> {
    return apiService.post('/rides', data);
  }

  // Join ride
  async joinRide(data: JoinRideDto): Promise<{ ride: Ride; participants: any[] }> {
    return apiService.post('/rides/join', data);
  }

  // Get ride details
  async getRide(rideId: string): Promise<{ ride: Ride }> {
    return apiService.get(`/rides/${rideId}`);
  }

  // List my rides
  async listMyRides(status?: string): Promise<Ride[]> {
    return apiService.get('/rides', { status });
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