import { apiService } from './base.service';
import { User } from '../../types';

class UsersService {
  // Get current user
  async getCurrentUser(): Promise<{ user: User }> {
    return apiService.get('/users/me');
  }

  // Update user
  async updateUser(data: { username?: string; pushToken?: string }): Promise<{ user: User }> {
    return apiService.patch('/users/me', data);
  }
}

export const usersService = new UsersService();