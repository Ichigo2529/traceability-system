import { ApiClient } from '../client';
import { AuthTokens, User } from '../types';

export class AuthService {
  constructor(private client: ApiClient) {}

  async login(username: string, password: string): Promise<User> {
    const data = await this.client.post<AuthTokens>('/auth/login', { username, password });
    this.client.setTokens(data);
    return data.user;
  }

  async logout() {
    try {
      // Best effort logout
      const current = this.client.getTokens(); // Wait, need to expose this
      if (current?.refresh_token) {
        await this.client.post('/auth/logout', { refresh_token: current.refresh_token });
      }
    } catch {
      // Ignore
    } finally {
      this.client.clearTokens();
    }
  }

  // Helper to check local state
  isAuthenticated(): boolean {
    return !!this.client.getTokens()?.access_token;
  }
}
