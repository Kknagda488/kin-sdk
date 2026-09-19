import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { KinWidget } from './index';
import { KinClient } from '../core';

export interface WidgetState {
  isOpen: boolean;
  client: KinClient | null;
  prefillMessage: string;
  hideDefaultLauncher: boolean;
  bottomTabs?: ('home' | 'messages' | 'help' | 'news')[];
}

let root: Root | null = null;
let stateUpdateEmitter: ((state: Partial<WidgetState>) => void) | null = null;

function KinWidgetContainer({ initialClient, hideDefaultLauncher, bottomTabs }: { initialClient: KinClient; hideDefaultLauncher: boolean; bottomTabs?: ('home' | 'messages' | 'help' | 'news')[] }) {
  const [state, setState] = useState<WidgetState>({
    isOpen: false,
    client: initialClient,
    prefillMessage: '',
    hideDefaultLauncher,
    bottomTabs,
  });

  useEffect(() => {
    stateUpdateEmitter = (newState: Partial<WidgetState>) => {
      setState((prev) => ({ ...prev, ...newState }));
    };
    return () => {
      stateUpdateEmitter = null;
    };
  }, []);

  return (
    <KinWidget
      isOpen={state.isOpen}
      setIsOpen={(open) => {
        // We import the hide/show methods dynamically to avoid circular dependencies
        if (open) {
          import('../api').then(({ show }) => show());
        } else {
          import('../api').then(({ hide }) => hide());
        }
      }}
      client={state.client}
      hideDefaultLauncher={state.hideDefaultLauncher}
      bottomTabs={state.bottomTabs}
    />
  );
}

export function mountKinWidget(client: KinClient, options?: { hideDefaultLauncher?: boolean; bottomTabs?: ('home' | 'messages' | 'help' | 'news')[] }) {
  if (root) return; // Already mounted

  let container = document.getElementById('kin-widget-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'kin-widget-root';
    document.body.appendChild(container);
  }

  root = createRoot(container);
  root.render(<KinWidgetContainer initialClient={client} hideDefaultLauncher={!!options?.hideDefaultLauncher} bottomTabs={options?.bottomTabs} />);
}

export function updateWidgetState(newState: Partial<WidgetState>) {
  if (stateUpdateEmitter) {
    stateUpdateEmitter(newState);
  }
}

export function unmountKinWidget() {
  if (root) {
    root.unmount();
    root = null;
  }
  const container = document.getElementById('kin-widget-root');
  if (container) {
    container.remove();
  }
}
