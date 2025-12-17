import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.hash = '#/';
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-dark-900 rounded-2xl border border-dark-700 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">
              Qualcosa è andato storto
            </h1>

            <p className="text-dark-400 mb-6">
              Si è verificato un errore imprevisto. Puoi provare a ricaricare la pagina o tornare alla home.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 text-left bg-dark-800 rounded-xl p-4 overflow-auto max-h-40">
                <p className="text-red-400 text-sm font-mono">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-dark-500 text-xs mt-2 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 text-dark-900 rounded-xl font-semibold hover:bg-primary-400 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                Ricarica Pagina
              </button>

              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-dark-700 text-white rounded-xl font-semibold hover:bg-dark-600 transition-colors"
              >
                <Home className="w-5 h-5" />
                Torna alla Home
              </button>
            </div>

            <button
              onClick={this.handleReset}
              className="mt-4 text-dark-500 hover:text-dark-300 text-sm transition-colors"
            >
              Prova a continuare comunque
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
