import { ApiClient } from '../client';
import { DeviceActivationRequest, DeviceInfo, OperatorSession, User } from '../types';

export class DeviceService {
  constructor(private client: ApiClient) {}

  async register(fingerprint: string, hostname?: string): Promise<DeviceInfo> {
    const data = await this.client.post<DeviceInfo>('/device/register', { fingerprint, hostname });
    if (data.device_token) {
      this.client.setDeviceToken(data.device_token);
    }
    return data;
  }

  async activate(payload: DeviceActivationRequest): Promise<DeviceInfo> {
    const data = await this.client.post<DeviceInfo>('/device/activate', payload);
    if (data.device_token) {
      this.client.setDeviceToken(data.device_token);
    }
    if (data.device_code && data.secret_key) {
      this.client.setDeviceIdentity(data.device_code, data.secret_key);
    }
    return data;
  }

  async heartbeat(): Promise<DeviceInfo> {
    return this.client.post<DeviceInfo>('/device/heartbeat');
  }

  async operatorLogin(username: string, password: string): Promise<OperatorSession> {
    return this.client.post<OperatorSession>('/device/operator/login', { username, password });
  }

  async operatorLogout() {
    return this.client.post('/device/operator/logout');
  }

  async getOperator(): Promise<User | null> {
    const session = await this.client.get<{ user: User } | null>('/device/operator/me');
    return session?.user ?? null;
  }
}
