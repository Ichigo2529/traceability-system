import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError, ApiErrorResponse } from './errors';
import { AuthTokens } from './types';

export class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private deviceToken: string | null = null;
  private deviceIdentity: { deviceId: string; secretKey: string } | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
    }
  }

  public clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auth_tokens');
    }
  }

  public setDeviceToken(token: string) {
    this.deviceToken = token;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('device_token', token);
    }
  }

  public setDeviceIdentity(deviceId: string, secretKey: string) {
    this.deviceIdentity = { deviceId, secretKey };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('device_identity', JSON.stringify(this.deviceIdentity));
    }
  }

  public getTokens() {
    return {
      access_token: this.accessToken,
      refresh_token: this.refreshToken
    };
  }

  public loadTokensFromStorage() {
    if (typeof localStorage === 'undefined') return;
    
    const stored = localStorage.getItem('auth_tokens');
    if (stored) {
      const tokens = JSON.parse(stored);
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
    }
    const device = localStorage.getItem('device_token');
    if (device) {
      this.deviceToken = device;
    }
    const identity = localStorage.getItem('device_identity');
    if (identity) {
      this.deviceIdentity = JSON.parse(identity);
    }
  }

  private async buildDeviceSignature(deviceId: string, secretKey: string, timestamp: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(`${deviceId}:${timestamp}`));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private setupInterceptors() {
    // Request Interceptor
    this.client.interceptors.request.use(async (config) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      if (this.deviceToken) {
        config.headers['Device-Token'] = this.deviceToken;
      }
      if (this.deviceIdentity && config.url?.startsWith('/events')) {
        const ts = Date.now().toString();
        const sig = await this.buildDeviceSignature(this.deviceIdentity.deviceId, this.deviceIdentity.secretKey, ts);
        config.headers['x-device-id'] = this.deviceIdentity.deviceId;
        config.headers['x-device-timestamp'] = ts;
        config.headers['x-device-signature'] = sig;
      }
      return config;
    });

    // Response Interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        // Handle 401 Unauthorized (Token Expiry)
        if (error.response?.status === 401 && !originalRequest._retry && this.refreshToken) {
          if (originalRequest.url?.includes('/auth/refresh')) {
             // Refresh failed, logout
             this.clearTokens();
             return Promise.reject(error);
          }

          originalRequest._retry = true;

          try {
            // Avoid multiple refresh calls
            if (!this.refreshPromise) {
              this.refreshPromise = this.refreshAccessToken();
            }
            
            const newToken = await this.refreshPromise;
            this.refreshPromise = null;
            
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            }
            return this.client(originalRequest);
          } catch (refreshErr) {
            this.refreshPromise = null;
            this.clearTokens();
            return Promise.reject(refreshErr);
          }
        }

        // Standardize Error
        const apiError = new ApiError(
          error.response?.data?.message || error.message || 'Unknown Error',
          error.response?.data?.error_code || 'UNKNOWN_ERROR',
          error.response?.status || 500,
          error.response?.data,
          originalRequest?.url,
          originalRequest?.method?.toUpperCase()
        );
        return Promise.reject(apiError);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    try {
      // Use a separate client instance to avoid interceptor loops
      const response = await axios.post(`${this.client.defaults.baseURL}/auth/refresh`, {
        refresh_token: this.refreshToken
      });
      
      if (response.data.success) {
        const { access_token, refresh_token } = response.data.data;
        this.accessToken = access_token;
        this.refreshToken = refresh_token; // Rotation
        
        // Update storage
        const current = JSON.parse(localStorage.getItem('auth_tokens') || '{}');
        this.setTokens({ ...current, access_token, refresh_token });
        
        return access_token;
      } else {
        throw new Error('Refresh failed');
      }
    } catch (err) {
      throw err;
    }
  }

  // Generic Request Wrapper
  async request<T>(config: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<{ success: boolean; data: T }> = await this.client.request(config);
    return response.data.data;
  }

  // HTTP Methods
  get<T>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  delete<T>(url: string, config?: AxiosRequestConfig) {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }
}
