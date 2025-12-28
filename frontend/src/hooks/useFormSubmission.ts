import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface UseFormSubmissionOptions {
  /**
   * Minimum time between submissions (ms)
   * Prevents accidental double-clicks
   * @default 1000
   */
  debounceMs?: number;

  /**
   * Show error toast for duplicate submission attempts
   * @default true
   */
  showDuplicateToast?: boolean;
}

interface UseFormSubmissionReturn {
  /**
   * Whether a submission is currently in progress
   */
  isSubmitting: boolean;

  /**
   * Wrap your form submission handler with this
   * Prevents duplicate submissions and adds error handling
   */
  handleSubmit: <T>(submitFn: () => Promise<T>) => Promise<T | undefined>;
}

/**
 * Hook to prevent duplicate form submissions
 *
 * Problem: User double-clicks submit → two requests fire → duplicate data
 *
 * Solution:
 * - Tracks isSubmitting state
 * - Prevents new submissions while one is in progress
 * - Debounces submissions (min 1 second between attempts)
 * - Handles errors gracefully
 * - Shows user-friendly error messages
 *
 * Usage:
 * ```tsx
 * const { isSubmitting, handleSubmit } = useFormSubmission();
 *
 * const onSubmit = async (data) => {
 *   await handleSubmit(async () => {
 *     await api.createProject(data);
 *     navigate('/projects');
 *   });
 * };
 *
 * <Button disabled={isSubmitting}>Submit</Button>
 * ```
 *
 * CRITICAL: This does NOT replace React Hook Form's isSubmitting
 * Use BOTH for maximum safety:
 * - RHF isSubmitting: Disables button during validation + submission
 * - This isSubmitting: Prevents duplicate API calls
 */
export function useFormSubmission(
  options: UseFormSubmissionOptions = {}
): UseFormSubmissionReturn {
  const { debounceMs = 1000, showDuplicateToast = true } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitTime = useRef<number>(0);
  const abortController = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async <T>(submitFn: () => Promise<T>): Promise<T | undefined> => {
      // Check if already submitting
      if (isSubmitting) {
        if (showDuplicateToast) {
          toast.error("Please wait", {
            description: "Your previous request is still processing.",
          });
        }
        return undefined;
      }

      // Check debounce (prevent rapid double-clicks)
      const now = Date.now();
      const timeSinceLastSubmit = now - lastSubmitTime.current;

      if (timeSinceLastSubmit < debounceMs) {
        if (showDuplicateToast) {
          toast.error("Too fast", {
            description: "Please wait a moment before trying again.",
          });
        }
        return undefined;
      }

      // Update last submit time
      lastSubmitTime.current = now;

      // Create abort controller for this submission
      abortController.current = new AbortController();

      try {
        setIsSubmitting(true);

        // Execute the submission function
        const result = await submitFn();

        return result;
      } catch (error: any) {
        // Handle user-friendly error messages from Axios interceptor
        if (error.userMessage) {
          toast.error("Request failed", {
            description: error.userMessage,
          });
        } else if (error.response?.data?.error?.message) {
          // Handle API error responses
          toast.error("Request failed", {
            description: error.response.data.error.message,
          });
        } else if (error.message) {
          // Generic error
          toast.error("Request failed", {
            description: error.message,
          });
        } else {
          // Unknown error
          toast.error("Something went wrong", {
            description: "Please try again later.",
          });
        }

        // Re-throw so caller can handle if needed
        throw error;
      } finally {
        setIsSubmitting(false);
        abortController.current = null;
      }
    },
    [isSubmitting, debounceMs, showDuplicateToast]
  );

  return {
    isSubmitting,
    handleSubmit,
  };
}
