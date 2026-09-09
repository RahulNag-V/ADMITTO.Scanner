import React, { Component, ReactNode, ErrorInfo } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  props: Props;
  state: State = { hasError: false, error: null };

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isConfigError =
        this.state.error?.message?.includes('configuration') ||
        this.state.error?.message?.includes('missing VITE_');

      const homeUrl = import.meta.env.BASE_URL || '/';

      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 text-center space-y-5 mesh-bg text-slate-100">
          <div className="w-14 h-14 rounded-3xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-xl shadow-rose-500/10">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
              {isConfigError ? 'Configuration Notice' : 'Display Recovery Mode'}
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isConfigError
                ? 'Application configuration is incomplete. Please contact the administrator.'
                : 'The application encountered an unexpected display issue and safely entered recovery mode.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
            <a
              href={homeUrl}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-all border border-white/10 active:scale-95 cursor-pointer"
            >
              Return Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
