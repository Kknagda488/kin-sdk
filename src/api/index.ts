import { KinClient } from '../core';
import { mountKinWidget, unmountKinWidget, updateWidgetState } from '../ui/mount';

type EventCallback = () => void;

interface KinOptions {
  organization_id: string;
  user_id?: string;
  name?: string;
  email?: string;
  created_at?: string;
  endpoint?: string;
}

// Global State
let kinClient: KinClient | null = null;
let isWidgetOpen = false;
let callbacks: { onShow: EventCallback[]; onHide: EventCallback[] } = {
  onShow: [],
  onHide: [],
};

/**
 * Initializes the Kin Messenger SDK.
 */
export function Kin(options: KinOptions) {
  if (kinClient) {
    console.warn('Kin Messenger SDK is already initialized.');
    update(options);
    return;
  }

  kinClient = new KinClient({
    baseUrl: options.endpoint || 'http://localhost:8000/api/v1',
    widgetKey: options.organization_id, // we map organization_id or app_id to widgetKey internally
    // We can also extend KinClientConfig in the future if we want to pass user info
  });

  // Mount the React component into the DOM
  mountKinWidget(kinClient);
}

export function show() {
  if (!kinClient) return;
  isWidgetOpen = true;
  updateWidgetState({ isOpen: true });
  callbacks.onShow.forEach(cb => cb());
}

export function hide() {
  if (!kinClient) return;
  isWidgetOpen = false;
  updateWidgetState({ isOpen: false });
  callbacks.onHide.forEach(cb => cb());
}

export function shutdown() {
  if (!kinClient) return;
  hide();
  unmountKinWidget();
  kinClient = null;
  callbacks = { onShow: [], onHide: [] };
}

export function update(data: Partial<KinOptions>) {
  if (!kinClient) return;
  if (data.user_id) kinClient.userId = data.user_id;
  if (data.email) kinClient.userEmail = data.email;
  if (data.name) kinClient.userName = data.name;
  
  // Update the mounted widget with the new client state
  updateWidgetState({ client: kinClient });
}

export function startConversation(message: string) {
  if (!kinClient) return;
  show();
  updateWidgetState({ prefillMessage: message });
}

export function onShow(callback: EventCallback) {
  callbacks.onShow.push(callback);
}

export function onHide(callback: EventCallback) {
  callbacks.onHide.push(callback);
}

export default Kin;
