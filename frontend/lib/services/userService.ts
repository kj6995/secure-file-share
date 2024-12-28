import api from '@/lib/api/axios';

export interface GuestUser {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export class UserService {
  static async getGuestUsers(): Promise<GuestUser[]> {
    try {
      const response = await api.get<GuestUser[]>('/users/guest-users/');
      if (!Array.isArray(response.data)) {
        console.error('Invalid response format:', response.data);
        return [];
      }
      return response.data;
    } catch (error) {
      console.error('Failed to fetch guest users:', error);
      throw error;
    }
  }
}
