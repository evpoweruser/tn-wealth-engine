import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { EngineProvider } from './context/EngineContext';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';
import './index.css';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('tn_engine_v5');
      localStorage.removeItem('tn_engine_v4');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          background: '#030712',
          color: '#f8fafc',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          textAlign: 'center'
        }}>
          <h2 style={{ fontSize: '20px', color: '#f87171', marginBottom: '10px' }}>
            Application Encountered an Error
          </h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '400px', marginBottom: '20px' }}>
            {this.state.error?.message || 'An unexpected error occurred while rendering.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 18px',
              background: '#38bdf8',
              color: '#030712',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Reset Settings & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <EngineProvider>
          <App />
        </EngineProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
