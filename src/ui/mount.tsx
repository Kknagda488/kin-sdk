import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { KinWidget } from './index';
import { KinClient } from '../core';

export interface WidgetState {
  isOpen: boolean;
  client: KinClient | null;
  prefillMessage: string;
}

let root: Root | null = null;
let stateUpdateEmitter: ((state: Partial<WidgetState>) => void) | null = null;

function KinWidgetContainer({ initialClient }: { initialClient: KinClient }) {
  const [state, setState] = useState<WidgetState>({
    isOpen: false,
    client: initialClient,
    prefillMessage: '',
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
    />
  );
}

export function mountKinWidget(client: KinClient) {
  if (root) return; // Already mounted

  let container = document.getElementById('kin-widget-root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'kin-widget-root';
    document.body.appendChild(container);
  }

  root = createRoot(container);
  root.render(<KinWidgetContainer initialClient={client} />);
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
