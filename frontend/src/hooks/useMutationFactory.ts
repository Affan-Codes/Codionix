import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

interface MutationFactoryOptions<TData, TVariables> {
  /**
   * The mutation function to execute
   */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /**
   * Success message or function to generate message
   */
  successMessage?: string | ((data: TData, variables: TVariables) => string);

  /**
   * Query keys to invalidate on success
   */
  invalidateKeys?: QueryKey[];

  /**
   * Optimistic update function
   */
  onOptimistic?: (
    variables: TVariables,
    queryClient: ReturnType<typeof useQueryClient>
  ) => unknown;

  /**
   * Rollback function for failed optimistic updates
   */
  onRollback?: (
    context: unknown,
    queryClient: ReturnType<typeof useQueryClient>
  ) => void;

  /**
   * Minimum time between submissions (ms)
   * @default 1000
   */
  debounceMs?: number;

  /**
   * Show error toast for duplicate submission attempts
   * @default true
   */
  showDuplicateToast?: boolean;

  /**
   * Custom error message extractor
   */
  getErrorMessage?: (error: unknown) => string;
}

export function useMutationFactory<TData = unknown, TVariables = void>(
  options: MutationFactoryOptions<TData, TVariables>
) {
  const {
    mutationFn,
    successMessage,
    invalidateKeys = [],
    onOptimistic,
    onRollback,
    debounceMs = 1000,
    showDuplicateToast = true,
    getErrorMessage,
  } = options;

  const queryClient = useQueryClient();
  const lastSubmitTime = useRef<number>(0);
  const isPendingRef = useRef(false);

  const mutation = useMutation({
    mutationFn,

    // Optimistic updates
    onMutate: async (variables) => {
      // Check debounce
      const now = Date.now();
      const timeSinceLastSubmit = now - lastSubmitTime.current;

      if (timeSinceLastSubmit < debounceMs && isPendingRef.current) {
        if (showDuplicateToast) {
          toast.error("Please wait", {
            description: "Your previous request is still processing.",
          });
        }
        throw new Error("DUPLICATE_SUBMISSION");
      }

      lastSubmitTime.current = now;
      isPendingRef.current = true;

      // Run optimistic update if provided
      if (onOptimistic) {
        return onOptimistic(variables, queryClient);
      }

      return undefined;
    },

    // Success handler
    onSuccess: (data, variables) => {
      isPendingRef.current = false;

      // Invalidate specified query keys
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Show success message
      if (successMessage) {
        const message =
          typeof successMessage === "function"
            ? successMessage(data, variables)
            : successMessage;

        toast.success(message);
      }
    },

    // Error handler
    onError: (error: any, _variables, context) => {
      isPendingRef.current = false;

      // Skip toast for duplicate submissions
      if (error?.message === "DUPLICATE_SUBMISSION") {
        return;
      }

      // Rollback optimistic updates
      if (onRollback && context) {
        onRollback(context, queryClient);
      }

      // Extract error message
      let errorMessage = "Something went wrong. Please try again.";

      if (getErrorMessage) {
        errorMessage = getErrorMessage(error);
      } else if (error.userMessage) {
        errorMessage = error.userMessage;
      } else if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.message && error.message !== "DUPLICATE_SUBMISSION") {
        errorMessage = error.message;
      }

      toast.error("Request failed", {
        description: errorMessage,
      });
    },

    // Settle handler (runs after success or error)
    onSettled: () => {
      // Safety: ensure isPendingRef is reset even if other handlers throw
      isPendingRef.current = false;
    },

    // Retry configuration (only for network errors)
    retry: (failureCount, error: any) => {
      // Don't retry duplicate submissions
      if (error?.message === "DUPLICATE_SUBMISSION") return false;

      // Don't retry validation errors (4xx)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }

      // Retry server errors once
      return failureCount < 1;
    },

    retryDelay: 1000,
  });

  // Wrap mutate to provide same API as useFormSubmission
  const handleSubmit = useCallback(
    async (variables: TVariables) => {
      try {
        return await mutation.mutateAsync(variables);
      } catch (error) {
        // Error already handled in onError
        throw error;
      }
    },
    [mutation]
  );

  return {
    ...mutation,
    handleSubmit, // For backward compatibility
    isSubmitting: mutation.isPending, // Alias for consistency
  };
}
