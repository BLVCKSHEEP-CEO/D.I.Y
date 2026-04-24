import { Component } from 'react';
import { trackEvent } from '../lib/telemetry';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error.'
    };
  }

  componentDidCatch(error, errorInfo) {
    trackEvent('ui_error_boundary', {
      message: error?.message || 'Unknown UI error',
      stack: error?.stack || '',
      componentStack: errorInfo?.componentStack || ''
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <section className="diy-card p-4 sm:p-5">
            <p className="font-mono text-xs uppercase tracking-[0.16em]">Application Error</p>
            <h2 className="mt-2 text-2xl font-bold">Something broke in the interface.</h2>
            <p className="mt-2 text-sm">{this.state.message}</p>
            <button
              type="button"
              className="pressable mt-4 bg-electric px-4 py-2 text-xs font-bold uppercase tracking-wide text-white"
              onClick={() => window.location.reload()}
            >
              Reload App
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;







