import type { LoginCredentials, RegisterData } from "@/types";
import { useMutationFactory } from "../useMutationFactory";
import { authApi } from "@/api/auth.api";
import { queryKeys } from "@/utils/queryKeys";

/**
 * Login mutation with OAuth-specific error handling
 */
export function useLogin() {
  return useMutationFactory({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    successMessage: "Welcome back!",
    invalidateKeys: [queryKeys.user.current()],
    getErrorMessage: (error: any) => {
      if (error?.isRateLimitError) {
        return error.userMessage;
      }

      if (
        error?.response?.status === 401 &&
        error?.response?.data?.error?.message?.includes("Google login")
      ) {
        return "This account uses Google login. Please sign in with Google.";
      }

      if (
        error?.response?.status === 401 &&
        error?.response?.data?.error?.message?.includes("GitHub login")
      ) {
        return "This account uses GitHub login. Please sign in with GitHub.";
      }

      if (error?.response?.status === 401) {
        return "Invalid email or password";
      }
      return error?.response?.data?.error?.message || "Login failed";
    },
  });
}

/**
 *  Register mutation with field-level validation error parsing
 */
export function useRegister() {
  return useMutationFactory({
    mutationFn: (data: RegisterData) => authApi.register(data),
    successMessage: "Account created successfully!",
    invalidateKeys: [queryKeys.user.current()],
    getErrorMessage: (error: any) => {
      if (error?.isRateLimitError) {
        return error.userMessage;
      }

      if (error?.response?.status === 409) {
        return "An account with this email already exists";
      }

      if (
        error?.response?.status === 400 &&
        error?.response?.data?.error?.details
      ) {
        const details = error.response.data.error.details;

        // If multiple field errors, show first one
        if (Array.isArray(details) && details.length > 0) {
          return details[0].message;
        }
      }

      if (error?.response?.status === 400) {
        return (
          error?.response?.data?.error?.message || "Invalid registration data"
        );
      }

      return error?.response?.data?.error?.message || "Registration failed";
    },
  });
}

/**
 * Logout mutation with atomic cleanup
 */
export function useLogout() {
  return useMutationFactory({
    mutationFn: () => authApi.logout(),
    successMessage: "Logged out successfully",

    // Clear all auth data on success (handled in AuthContext)
  });
}

/**
 * Verify email mutation
 */
export function useVerifyEmail() {
  return useMutationFactory({
    mutationFn: (token: string) => authApi.verifyEmail(token),

    successMessage: (data) => data.message || "Email verified successfully!",

    getErrorMessage: (error: any) => {
      if (error?.isRateLimitError) {
        return error.userMessage;
      }

      if (error?.response?.status === 401) {
        return "Invalid or expired verification token";
      }

      if (error?.response?.status === 400) {
        return "Email already verified";
      }

      return error?.response?.data?.error?.message || "Verification failed";
    },
  });
}

/**
 * Resend verification email mutation
 */
export function useResendVerification() {
  return useMutationFactory({
    mutationFn: () => authApi.resendVerificationEmail(),

    successMessage: "Verification email sent!",

    debounceMs: 3000, // Longer debounce for email sending

    getErrorMessage: (error: any) => {
      if (error?.isRateLimitError) {
        return error.userMessage;
      }

      return (
        error?.response?.data?.error?.message ||
        "Failed to resend verification email"
      );
    },
  });
}

/**
 * Forgot password mutation
 */
export function useForgotPassword() {
  return useMutationFactory({
    mutationFn: (email: string) => authApi.forgotPassword(email),

    successMessage: "Password reset email sent!",

    debounceMs: 3000, // Longer debounce for email sending

    getErrorMessage: (error: any) => {
      if (error?.isRateLimitError) {
        return error.userMessage;
      }

      return (
        error?.response?.data?.error?.message || "Failed to send reset email"
      );
    },
  });
}

/**
 * Reset password mutation
 */
export function useResetPassword() {
  return useMutationFactory({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      authApi.resetPassword(token, password),

    successMessage: "Password reset successfully!",

    getErrorMessage: (error: any) => {
      if (error?.response?.status === 401) {
        return "Invalid or expired reset token";
      }

      if (
        error?.response?.status === 400 &&
        error?.response?.data?.error?.details
      ) {
        const details = error.response.data.error.details;

        if (Array.isArray(details) && details.length > 0) {
          return details[0].message;
        }
      }

      return error?.response?.data?.error?.message || "Password reset failed";
    },
  });
}

/**
 * OAuth login init mutation
 * On success, redirects user to OAuth provider
 */
export function useOAuthLoginInit() {
  return useMutationFactory({
    mutationFn: (provider: "google" | "github") =>
      authApi.oauthLoginInit(provider),
    getErrorMessage: (error: any) => {
      if (error?.isRateLimitError) {
        return error.userMessage;
      }

      return (
        error?.response?.data?.error?.message ||
        "Failed to initialize OAuth login"
      );
    },
  });
}

/**
 * OAuth register init mutation
 * On success, redirects user to OAuth provider
 */
export function useOAuthRegisterInit() {
  return useMutationFactory({
    mutationFn: ({
      provider,
      role,
    }: {
      provider: "google" | "github";
      role: "STUDENT" | "MENTOR" | "EMPLOYER";
    }) => authApi.oauthRegisterInit(provider, role),
    getErrorMessage: (error: any) => {
      if (error?.isRateLimitError) {
        return error.userMessage;
      }

      return (
        error?.response?.data?.error?.message ||
        "Failed to initialize OAuth registration"
      );
    },
  });
}
