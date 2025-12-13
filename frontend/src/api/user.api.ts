import type { ApiResponse, User } from "@/types";
import apiClient from "./axios";

export const userApi = {
  // Get current user profile
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>("/users/me");
    return response.data.data!;
  },

  // Update current user profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<ApiResponse<User>>(
      "/users/me",
      data
    );
    return response.data.data!;
  },

  // Upload profile picture
  uploadAvatar: async (file: File): Promise<{ profilePictureUrl: string }> => {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await apiClient.post<
      ApiResponse<{ profilePictureUrl: string }>
    >("/users/me/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data.data!;
  },
};
