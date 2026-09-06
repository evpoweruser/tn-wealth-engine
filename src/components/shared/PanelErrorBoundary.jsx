import React from 'react';

/**
 * PanelErrorBoundary — isolates dashboard panel crashes.
 * A failing panel shows a compact fallback instead of blanking the whole app
 * (the lesson of the production `.tot` crash, which one boundary turned into
 * a white screen).
 */
class PanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`Panel "${this.props.panelName || 'unknown'}" crashed:`, error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 12,
          borderRadius: 10,
          border: '1px solid var(--accent-red, #ef4444)',
          color: 'var(--text-muted)',
          fontSize: 12,
          marginTop: 8,
        }}>
          {this.props.panelName || 'Panel'} unavailable — {String(this.state.error.message || this.state.error)}
        </div>
      );
    }
    return this.props.children;
  }
}

export default PanelErrorBoundary;
