'use client';

import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="p-8 m-4 border-red-500/20 bg-red-500/5">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div>
              <div className="p-6 rounded-full bg-muted border border-border">
                <AlertTriangle className="h-12 w-12 text-red-500" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Something went wrong</h3>
              <p className="text-muted-foreground max-w-md">
                An unexpected error occurred while rendering this component.
              </p>
              {this.state.error && process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Error details
                  </summary>
                  <pre className="mt-2 p-4 bg-slate-900 rounded-lg text-xs overflow-auto max-w-2xl">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <Button onClick={this.handleReset} variant="outline" className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => (window.location.href = '/')} className="gap-2">
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier usage
export function ErrorBoundaryWrapper({
  children,
  fallback,
  onReset,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}) {
  return (
    <ErrorBoundary fallback={fallback} onReset={onReset}>
      {children}
    </ErrorBoundary>
  );
}
