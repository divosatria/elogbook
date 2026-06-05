import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class MonitoringErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Monitoring Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-96 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="text-center p-8">
            <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              Monitoring Error
            </h3>
            <p className="text-slate-600 mb-4">
              Terjadi kesalahan saat memuat sistem monitoring
            </p>
            <button
              onClick={this.handleRetry}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <RefreshCw size={16} />
              <span>Coba Lagi</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default MonitoringErrorBoundary;