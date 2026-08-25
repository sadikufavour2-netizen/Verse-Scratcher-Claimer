import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { VerseLogo, PolygonBadge } from './VerseBrand';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class WalletErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('WalletErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div id="wallet-error-boundary-view" className="min-h-screen bg-[#070A13] text-white flex flex-col">
          {/* Persistent Header */}
          <header className="border-b border-slate-800/80 bg-[#0A0F1D]/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between">
            <VerseLogo size={36} />
            <div className="flex items-center gap-3">
              <PolygonBadge />
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-bold text-sm rounded-xl transition-all shadow-md active:scale-95"
              >
                CONNECT WALLET
              </button>
            </div>
          </header>

          {/* Main Error Body */}
          <main className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-[#0D1426] border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4">
                <AlertTriangle size={28} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">VERSE SCRATCHER CLAIMER</h2>
              <p className="text-xs uppercase tracking-widest text-purple-400 font-semibold mb-3">
                POLYGON NETWORK
              </p>
              <div className="p-3 bg-red-950/40 rounded-lg border border-red-500/20 text-red-200 text-sm mb-5 text-left font-mono break-all">
                {this.state.error?.message || 'Wallet connection encountered an unexpected issue.'}
              </div>
              <button
                id="error-boundary-retry-button"
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#00E5FF] hover:bg-[#00cce6] text-black font-bold rounded-xl transition-all shadow-lg active:scale-95"
              >
                <RefreshCw size={16} />
                TRY AGAIN
              </button>
            </div>
          </main>
        </div>
      );
    }

    return this.props.children;
  }
}
