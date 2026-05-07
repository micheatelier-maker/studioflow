import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 p-8 flex items-center justify-center">
          <div className="max-w-md w-full p-8 bg-stone-900 rounded-[2rem] border border-red-900/50 space-y-4">
            <h1 className="text-2xl font-bold text-red-500">Something went wrong</h1>
            <p className="text-stone-400 text-sm">The application crashed. Please refresh the page or check the console.</p>
            <pre className="bg-stone-950 p-4 rounded-xl text-xs overflow-auto max-h-40 border border-stone-800 text-red-400/80">
              {this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-red-950/30 hover:bg-red-900/40 text-red-400 rounded-2xl border border-red-900/50 transition-colors font-bold uppercase tracking-wider text-xs"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
