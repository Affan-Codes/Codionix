import { userApi } from "@/api/user.api";
import { useMutationFactory } from "../useMutationFactory";
import type { User } from "@/types";
import { queryKeys } from "@/utils/queryKeys";

/**
 * Update profile mutation with optimistic updates
 */
export function useUpdateProfileMutation() {
  return useMutationFactory({
    mutationFn: (data: Partial<User>) => userApi.updateProfile(data),

    successMessage: "Profile updated successfully!",

    invalidateKeys: [queryKeys.user.current()],

    // Optimistic update
    onOptimistic: (newData, qc) => {
      const previousUser = qc.getQueryData<User>(queryKeys.user.current());

      if (previousUser) {
        const optimisticUser = { ...previousUser, ...newData };
        qc.setQueryData<User>(queryKeys.user.current(), optimisticUser);
      }

      return { previousUser };
    },

    // Rollback on error
    onRollback: (context: any, qc) => {
      if (context?.previousUser) {
        qc.setQueryData(queryKeys.user.current(), context.previousUser);
      }
    },
  });
}

/**
 * Upload avatar mutation
 */
export function useUploadAvatarMutation() {
  return useMutationFactory({
    mutationFn: (file: File) => userApi.uploadAvatar(file),

    successMessage: "Profile picture updated!",

    invalidateKeys: [queryKeys.user.current()],
  });
}
