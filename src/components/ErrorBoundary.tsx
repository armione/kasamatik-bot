// src/components/ErrorBoundary.tsx

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleCopyDetails = () => {
    const { error, errorInfo } = this.state;
    const errorDetails = `
--- HATA DETAYLARI ---
Mesaj: ${error?.toString()}
Stack: ${error?.stack}

--- BİLEŞEN STACK ---
${errorInfo?.componentStack}
--------------------
    `;
    navigator.clipboard.writeText(errorDetails.trim());
    alert('Hata detayları panoya kopyalandı!');
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white p-4">
          <div className="text-center glass-card p-8 rounded-2xl max-w-lg w-full">
            <h1 className="text-3xl font-bold text-red-400 mb-4">Oops! Bir şeyler ters gitti.</h1>
            <p className="text-gray-300 mb-6">
              Beklenmedik bir hata oluştu. Lütfen sayfayı yeniden yüklemeyi deneyin. Sorun devam ederse, geliştiriciye bildirmek için hata detaylarını kopyalayabilirsiniz.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="gradient-button px-6 py-2 rounded-lg font-semibold"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={this.handleCopyDetails}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-semibold"
              >
                Detayları Kopyala
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
