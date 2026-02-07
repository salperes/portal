import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class DocumentViewerErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a benign DOM manipulation error from ONLYOFFICE
    if (error.message?.includes('insertBefore') ||
        error.message?.includes('removeChild') ||
        error.message?.includes('appendChild')) {
      // Log but don't crash for DOM manipulation errors
      console.warn('ONLYOFFICE DOM manipulation warning (non-fatal):', error.message);
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Only log real errors, not DOM manipulation warnings
    if (!error.message?.includes('insertBefore') &&
        !error.message?.includes('removeChild') &&
        !error.message?.includes('appendChild')) {
      console.error('DocumentViewer error:', error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-90">
          <div className="bg-white rounded-lg p-8 max-w-md text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-xl font-semibold mb-2">Döküman Görüntüleyici Hatası</h2>
            <p className="text-gray-600 mb-4">
              Döküman görüntülenirken bir hata oluştu. Lütfen tekrar deneyin.
            </p>
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Tekrar Dene
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DocumentViewerErrorBoundary;
