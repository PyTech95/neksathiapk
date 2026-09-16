import React from 'react';
import { StartupState } from './StartupState';
import { diagnostic } from '@/src/utils/diagnostics';

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { diagnostic('screen-render-failed'); }
  render() {
    return this.state.failed ? <StartupState error="This screen couldn’t open. Please retry." onRetry={() => this.setState({ failed: false })} /> : this.props.children;
  }
}