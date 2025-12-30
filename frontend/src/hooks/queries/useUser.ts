import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/api/user.api";
import { queryKeys } from "@/utils/queryKeys";
import { toast } from "sonner";
import type { User } from "@/types";
import { useAuth } from "@/context/AuthContext";

/**
 * ===================================
 * QUERY HOOKS (Read Operations)
 * ===================================
 */

/**
 * Fetch current user profile
 *
 * CRITICAL: This syncs with AuthContext
 * When user data updates here, AuthContext must also update
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.user.current(),
    queryFn: () => userApi.getCurrentUser(),
    staleTime: 10 * 60 * 1000, // 10min - user data rarely changes
    // Only fetch if user is authenticated
    enabled: !!localStorage.getItem("accessToken"),
  });
}

/**
 * ===================================
 * MUTATION HOOKS (Write Operations)
 * ===================================
 */

/**
 * Update user profile
 *
 * AUTOMATIC CACHE INVALIDATION:
 * - Updates current user cache
 * - Syncs with AuthContext
 *
 * OPTIMISTIC UPDATE:
 * - Immediately updates UI
 * - Rolls back on error
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: (data: Partial<User>) => userApi.updateProfile(data),

    // OPTIMISTIC UPDATE: Update UI immediately
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.user.current(),
      });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData<User>(
        queryKeys.user.current()
      );

      // Optimistically update cache
      if (previousUser) {
        const optimisticUser = { ...previousUser, ...newData };
        queryClient.setQueryData<User>(
          queryKeys.user.current(),
          optimisticUser
        );

        // CRITICAL: Also update AuthContext
        updateUser(optimisticUser);
      }

      return { previousUser };
    },

    onSuccess: (updatedUser) => {
      // Update cache with server response
      queryClient.setQueryData(queryKeys.user.current(), updatedUser);

      // CRITICAL: Sync with AuthContext
      updateUser(updatedUser);

      toast.success("Profile updated!", {
        description: "Your changes have been saved.",
      });
    },

    // Rollback on error
    onError: (error: any, _, context) => {
      // Restore previous value
      if (context?.previousUser) {
        queryClient.setQueryData(
          queryKeys.user.current(),
          context.previousUser
        );

        // CRITICAL: Rollback AuthContext too
        updateUser(context.previousUser);
      }

      toast.error("Failed to update profile", {
        description:
          error.response?.data?.error?.message || "Changes were not saved",
      });
    },
  });
}

/**
 * Upload profile picture
 *
 * AUTOMATIC CACHE INVALIDATION:
 * - Updates current user cache with new avatar URL
 * - Syncs with AuthContext
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();

  return useMutation({
    mutationFn: (file: File) => userApi.uploadAvatar(file),

    onSuccess: (data) => {
      // Get current user data
      const currentUser = queryClient.getQueryData<User>(
        queryKeys.user.current()
      );

      if (currentUser) {
        // Update with new profile picture URL
        const updatedUser = {
          ...currentUser,
          profilePictureUrl: data.profilePictureUrl,
        };

        queryClient.setQueryData(queryKeys.user.current(), updatedUser);

        // CRITICAL: Sync with AuthContext
        updateUser(updatedUser);
      }

      toast.success("Profile picture updated!", {
        description: "Your new avatar is now visible.",
      });
    },

    onError: (error: any) => {
      toast.error("Failed to upload avatar", {
        description:
          error.response?.data?.error?.message || "Please try again later",
      });
    },
  });
}
