import React from 'react';

/**
 * @file ErrorBoundary.jsx
 * @description A higher-order component that catches JavaScript errors anywhere in their child component tree.
 */

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="container mt-5">
          <div className="card border-danger">
            <div className="card-header bg-danger text-white">
              <h4 className="mb-0">Something went wrong</h4>
            </div>
            <div className="card-body">
              <p className="lead">The application encountered an unexpected error.</p>
              <div className="alert alert-secondary">
                {this.state.error && this.state.error.toString()}
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => window.location.reload()}
              >
                Reload Application
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
