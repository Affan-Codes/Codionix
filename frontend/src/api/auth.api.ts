import type {
  ApiResponse,
  AuthResponse,
  LoginCredentials,
  RegisterData,
} from "@/types";
import apiClient from "./axios";

export const authApi = {
  // Register new user
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/register",
      data
    );
    return response.data.data!;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      "/auth/login",
      credentials
    );
    return response.data.data!;
  },

  // Refresh access token
  refreshToken: async (
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post<
      ApiResponse<{ accessToken: string; refreshToken: string }>
    >("/auth/refresh", { refreshToken });
    return response.data.data!;
  },

  // Logout user
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post("/auth/logout", { refreshToken });
  },

  // Verify email with token
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/verify-email",
      { token }
    );
    return response.data.data!;
  },

  // Resend verification email
  resendVerificationEmail: async (): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/resend-verification"
    );
    return response.data.data!;
  },

  // Forgot password - send reset email
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/forgot-password",
      { email }
    );
    return response.data.data!;
  },

  // Reset password with token
  resetPassword: async (
    token: string,
    password: string
  ): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/reset-password",
      { token, password }
    );
    return response.data.data!;
  },
};
