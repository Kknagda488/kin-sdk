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
  isInline?: boolean;
}

let root: Root | null = null;
let stateUpdateEmitter: ((state: Partial<WidgetState>) => void) | null = null;

function KinWidgetContainer({ initialClient, hideDefaultLauncher, bottomTabs, isInline }: { initialClient: KinClient; hideDefaultLauncher: boolean; bottomTabs?: ('home' | 'messages' | 'help' | 'news')[]; isInline?: boolean }) {
  const [state, setState] = useState<WidgetState>({
    isOpen: isInline ? true : false,
    client: initialClient,
    prefillMessage: '',
    hideDefaultLauncher,
    bottomTabs,
    isInline,
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
      isInline={state.isInline}
    />
  );
}

export function mountKinWidget(client: KinClient, options?: { hideDefaultLauncher?: boolean; bottomTabs?: ('home' | 'messages' | 'help' | 'news')[]; containerSelector?: string }) {
  if (root) return; // Already mounted

  let container = options?.containerSelector ? document.querySelector(options.containerSelector) : null;
  const isInline = !!container;

  if (!container) {
    container = document.getElementById('kin-widget-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'kin-widget-root';
      document.body.appendChild(container);
    }
  }

  root = createRoot(container);
  root.render(<KinWidgetContainer initialClient={client} hideDefaultLauncher={isInline || !!options?.hideDefaultLauncher} bottomTabs={options?.bottomTabs} isInline={isInline} />);
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
