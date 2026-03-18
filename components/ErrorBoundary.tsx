import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f0d0c] flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full space-y-8 text-center">
            <div className="inline-block p-4 rounded-3xl bg-rose-900/20 border border-rose-900/30 mb-4">
              <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-stone-50">Something went wrong</h1>
            <p className="text-stone-400 text-sm leading-relaxed">
              The studio encountered an unexpected error. Your data is likely safe in local storage.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-stone-100 text-black font-black uppercase text-xs tracking-[0.4em] rounded-[2rem] active:scale-95 transition-all"
            >
              Reload Studio
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-4 bg-rose-900/20 text-rose-500 font-black uppercase text-[10px] tracking-[0.4em] rounded-[2rem] border border-rose-900/30"
            >
              Reset All Data (Danger)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
