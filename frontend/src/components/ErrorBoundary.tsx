import { Component, type ErrorInfo, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Catches unhandled errors in React component tree
 *
 * This is a CLASS COMPONENT because React's error boundary API
 * requires componentDidCatch and getDerivedStateFromError lifecycle methods
 * which are not available in functional components.
 *
 * Wraps the entire app to prevent white screens of death.
 */

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   * This is called during the render phase
   */
  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details after render phase
   * This is where you'd send errors to monitoring service (Sentry, LogRocket, etc.)
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console in development
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Store error info in state for display
    this.setState({
      errorInfo,
    });

    // TODO: Send to error tracking service in production
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  /**
   * Reset error boundary and reload the page
   */
  handleReload = (): void => {
    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Force page reload to reset app state
    window.location.reload();
  };

  /**
   * Go back to home page without reloading
   */
  handleGoHome = (): void => {
    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Navigate to home
    window.location.href = "/";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <Card className="w-full max-w-2xl">
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-destructive/10 rounded-full p-4">
                  <AlertTriangleIcon className="size-12 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center">
                Oops! Something went wrong
              </CardTitle>
              <CardDescription className="text-base text-center">
                We've encountered an unexpected error. Don't worry, your data is
                safe.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Error Details (only in development) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm font-semibold text-red-900 mb-2">
                    Error Details (Development Only):
                  </p>
                  <pre className="text-xs text-red-800 whitespace-pre-wrap wrap-break-word font-mono">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <details className="mt-3">
                      <summary className="text-sm font-medium text-red-900 cursor-pointer">
                        Component Stack
                      </summary>
                      <pre className="text-xs text-red-800 whitespace-pre-wrap wrap-break-word font-mono mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* User-Friendly Message */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This error has been logged and our team will investigate.
                  Here's what you can do:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Reload the page to try again</li>
                  <li>Go back to the home page</li>
                  <li>
                    If the problem persists, contact support with the error
                    details
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReload}
                  className="flex-1"
                  size="lg"
                >
                  <RefreshCwIcon className="size-4" />
                  Reload Page
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Go to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
