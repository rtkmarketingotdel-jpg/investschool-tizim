import { Component, type ReactNode } from 'react';
import i18n from '@/i18n';

interface State {
  failed: boolean;
}

/** Keeps a rendering bug in one screen from blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-xl">{i18n.t('errors.INTERNAL_ERROR')}</p>
        <button className="rounded-xl bg-primary px-6 py-3 text-white" onClick={() => location.assign('/')}>
          {i18n.t('errors.reload')}
        </button>
      </div>
    );
  }
}
