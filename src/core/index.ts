export interface BookingSlot {
  start: string;
  end: string;
  label: string;
}

export interface MeetingType {
  id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  timezone: string;
  is_active?: boolean;
}

export interface BookingCard {
  kind: 'booking_card';
  meeting_type?: MeetingType | null;
  slots: BookingSlot[];
}

export interface MessengerArticle {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  url?: string | null;
}

export interface ProductTourStep {
  title: string;
  body: string;
  selector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface ProductTour {
  id: string;
  name: string;
  description: string;
  trigger_path: string;
  steps: ProductTourStep[];
}

export interface MessengerWidgetContent {
  messenger: {
    spaces: { home: boolean; messages: boolean; help: boolean; news: boolean };
    greeting: string;
    intro: string;
    primaryColor: string;
    backgroundStyle: 'dark' | 'light';
    showLauncher: boolean;
    switch?: { enabled: boolean; phone_number?: string; destination_url?: string };
  };
  articles: MessengerArticle[];
  product_tours_enabled: boolean;
  product_tours: ProductTour[];
}

export interface Message {
  id: string;
  /** Server message ID used to resume Inbox synchronization while keeping optimistic UI IDs stable. */
  backendId?: string;
  role: 'customer' | 'ai' | 'human_agent';
  content: string;
  citations?: any[];
  isStreaming?: boolean;
  booking?: BookingCard;
}

export interface KinClientConfig {
  widgetKey: string;
  baseUrl?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  onMessage?: (message: Message) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'streaming') => void;
  onError?: (error: string) => void;
}

export class KinClient {
  private config: KinClientConfig;
  private sessionId: string | null = null;
  private anonymousId = '';
  private deviceIdentifier = '';
  private browserSessionId = '';
  public messages: Message[] = [];
  public onMessage?: (message: Message) => void;
  public onStateChange?: (state: 'idle' | 'connecting' | 'streaming') => void;
  public onUnreadCountChange?: (count: number) => void;
  public onUnreadCountChange?: (count: number) => void;
  public userId?: string;
  public userEmail?: string;
  public userName?: string;
  public bottomTabs?: string[];
  public onWidgetContentUpdate?: (content: MessengerWidgetContent) => void;
  public onConfigUpdate?: (tabs: string[]) => void;
  private pollingInterval?: number;
  private heartbeatInterval?: number;
  private activeSends = 0;
  private sendQueue: Promise<void> = Promise.resolve();
  private localMessageSequence = 0;

  constructor(config: KinClientConfig) {
    this.config = {
      baseUrl: 'http://localhost:8000/api/v1',
      ...config,
    };
    this.userId = config.userId;
    this.userEmail = config.userEmail;
    this.userName = config.userName;
    this.loadSession();
    this.loadVisitorIdentity();
    void this.validateWidgetKey().then(() => this.ping());
    if (typeof window !== 'undefined') {
      this.heartbeatInterval = window.setInterval(() => void this.ping(), 60_000);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  public get widgetKey(): string {
    return this.config.widgetKey;
  }

  private get storageKey() {
    return `kin_session_${this.config.widgetKey}`;
  }

  private get visitorStorageKey() {
    return `kin_visitor_${this.config.widgetKey}`;
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = Math.random() * 16 | 0;
      return (char === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
    });
  }

  private loadVisitorIdentity() {
    if (typeof window === 'undefined') return;
    try {
      const saved = JSON.parse(localStorage.getItem(this.visitorStorageKey) || '{}');
      const cookieName = `kin_anonymous_${this.config.widgetKey}`;
      const cookieId = document.cookie.split('; ').find((part) => part.startsWith(`${cookieName}=`))?.split('=').slice(1).join('=');
      const identityExpired = !saved.createdAt || Date.now() - Number(saved.createdAt) > 15552000000;
      this.anonymousId = identityExpired ? (cookieId || this.createId()) : (cookieId || saved.anonymousId || this.createId());
      this.deviceIdentifier = identityExpired ? this.createId() : (saved.deviceIdentifier || this.createId());
      const sessionKey = `${this.visitorStorageKey}_session`;
      this.browserSessionId = sessionStorage.getItem(sessionKey) || this.createId();
      localStorage.setItem(this.visitorStorageKey, JSON.stringify({
        anonymousId: this.anonymousId,
        deviceIdentifier: this.deviceIdentifier,
        createdAt: Date.now(),
      }));
      sessionStorage.setItem(sessionKey, this.browserSessionId);
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `${cookieName}=${encodeURIComponent(this.anonymousId)}; Path=/; Max-Age=15552000; SameSite=Lax${secure}`;
    } catch (error) {
      console.warn('Could not persist Kin visitor identity', error);
      this.anonymousId ||= this.createId();
      this.deviceIdentifier ||= this.createId();
      this.browserSessionId ||= this.createId();
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') void this.ping();
  };

  private async ping() {
    if (typeof window === 'undefined' || !this.anonymousId) return;
    const page = new URL(window.location.href);
    const referrer = document.referrer ? new URL(document.referrer) : null;
    try {
      await fetch(`${this.config.baseUrl}/gateway/ping`, {
        method: 'POST',
        headers: this.widgetHeaders(true),
        body: JSON.stringify({
          anonymous_id: this.anonymousId,
          device_identifier: this.deviceIdentifier,
          session_id: this.browserSessionId,
          platform: 'web',
          installation_type: 'js-snippet',
          installation_version: '1.0.4',
          source: 'apiBoot',
          page_url: `${page.origin}${page.pathname}`,
          page_title: document.title,
          referrer: referrer ? `${referrer.origin}${referrer.pathname}` : null,
          user_id: this.userId,
          user_email: this.userEmail,
          user_name: this.userName,
        }),
      });
    } catch (error) {
      console.warn('Kin visitor ping failed', error);
    }
  }

  private nextLocalMessageId() {
    return `m_${Date.now()}_${this.localMessageSequence++}`;
  }

  private loadSession() {
    try {
      if (typeof window === 'undefined') return;
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.sessionId) this.sessionId = parsed.sessionId;
        if (parsed.messages) this.messages = parsed.messages;
      }
    } catch (e) {
      console.warn('Failed to load Kin session', e);
    }
  }

  private saveSession() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.setItem(this.storageKey, JSON.stringify({
        sessionId: this.sessionId,
        messages: this.messages,
      }));
    } catch (e) {
      console.warn('Failed to save Kin session', e);
    }
  }

  private widgetHeaders(json = false): Record<string, string> {
    return {
      'X-Kin-Widget-Key': this.config.widgetKey,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    };
  }

  private async validateWidgetKey() {
    try {
      const res = await fetch(`${this.config.baseUrl}/gateway/validate`, {
        method: 'POST',
        headers: this.widgetHeaders(),
      });
      if (!res.ok) {
        throw new Error('Invalid widget key or rate limited');
      }
      const data = await res.json();
      if (data.bottom_tabs && Array.isArray(data.bottom_tabs)) {
        const tabs = data.bottom_tabs as string[];
        this.bottomTabs = tabs;
        if (this.onConfigUpdate) {
          this.onConfigUpdate(tabs);
        }
      }
    } catch (e: any) {
      this.config.onError?.(e.message || 'Validation failed');
    }
  }

  public async fetchMeetingTypes(): Promise<MeetingType[]> {
    const res = await fetch(`${this.config.baseUrl}/scheduling/meeting-types`, {
      headers: this.widgetHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load meeting types');
    return res.json();
  }

  public async fetchWidgetContent(): Promise<MessengerWidgetContent> {
    const res = await fetch(`${this.config.baseUrl}/knowledge/widget-content`, {
      headers: this.widgetHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load Messenger content');
    const content = await res.json();
    return {
      ...content,
      product_tours_enabled: content.product_tours_enabled === true,
      product_tours: Array.isArray(content.product_tours) ? content.product_tours : [],
    };
  }

  public async fetchSlots(meetingTypeId?: string): Promise<BookingCard> {
    const params = meetingTypeId ? `?meeting_type_id=${meetingTypeId}` : '';
    const res = await fetch(`${this.config.baseUrl}/scheduling/slots${params}`, {
      headers: this.widgetHeaders(),
    });
    if (!res.ok) throw new Error('Failed to load availability');
    const data = await res.json();
    return {
      kind: 'booking_card',
      meeting_type: data.meeting_type,
      slots: data.slots || [],
    };
  }

  public async bookMeeting(input: {
    meetingTypeId: string;
    start: string;
    guestName?: string;
    guestEmail?: string;
    notes?: string;
  }) {
    const res = await fetch(`${this.config.baseUrl}/scheduling/book`, {
      method: 'POST',
      headers: this.widgetHeaders(true),
      body: JSON.stringify({
        meeting_type_id: input.meetingTypeId,
        start: input.start,
        guest_name: input.guestName || this.userName,
        guest_email: input.guestEmail || this.userEmail,
        notes: input.notes,
        conversation_id: this.sessionId,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || 'Could not book that time');
    }

    const confirm: Message = {
      id: `m_book_${Date.now()}`,
      role: 'ai',
      content: `You're booked${data.meeting_name ? ` for ${data.meeting_name}` : ''}${data.start ? ` at ${new Date(data.start).toLocaleString()}` : ''}. ${data.meet_url ? `Join Google Meet: ${data.meet_url}` : `We'll send a confirmation${data.guest_email ? ` to ${data.guest_email}` : ''}.`}`,
    };
    this.messages = [...this.messages, confirm];
    this.saveSession();
    this.emit(confirm);
    return data;
  }

  public async sendMessage(content: string, attachments?: { type: string; data: string }[]) {
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    const userMsg: Message = {
      id: this.nextLocalMessageId(),
      role: 'customer',
      content,
    };
    this.messages = [...this.messages, userMsg];
    this.saveSession();
    this.emit(userMsg);

    const aiMsgId = this.nextLocalMessageId();
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'ai',
      content: '',
      isStreaming: true,
    };
    this.messages = [...this.messages, aiMsg];
    this.saveSession();
    this.emit(aiMsg);

    const deliver = async () => {
      this.activeSends += 1;
      this.emitState('connecting');
      try {
        const { collectPageContext } = await import('../context-collector');
        const payload = {
          message: content,
          context: collectPageContext(),
          session_id: this.sessionId,
          anonymous_id: this.anonymousId,
          device_identifier: this.deviceIdentifier,
          user_id: this.userId,
          user_email: this.userEmail,
          user_name: this.userName,
          page_url: `${window.location.origin}${window.location.pathname}`,
          attachments,
        };
        const res = await fetch(`${this.config.baseUrl}/conversations/chat`, {
          method: 'POST',
          headers: this.widgetHeaders(true),
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error(error.detail || error.message || `Failed to send message (${res.status})`);
        }
        if (!res.body) throw new Error('No response body');

        this.emitState('streaming');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() || '';
          for (const eventStr of events) this.parseEvent(eventStr, aiMsgId);
        }
        if (buffer.trim()) this.parseEvent(buffer, aiMsgId);
        this.emitState('idle');
        this.updateMessage(aiMsgId, (m) => ({ ...m, isStreaming: false }));
      } catch (e: any) {
        this.config.onError?.(e.message || 'Network error');
        this.emitState('idle');
        this.updateMessage(aiMsgId, (m) => ({ ...m, isStreaming: false, content: 'Error connecting to agent.' }));
      } finally {
        this.activeSends = Math.max(0, this.activeSends - 1);
        // The API persists its authoritative message IDs after the stream finishes.
        await this.syncSession();
      }
    };
    this.sendQueue = this.sendQueue.then(deliver, deliver);
    await this.sendQueue;
  }

  public startPolling(intervalMs: number = 3000) {
    if (this.pollingInterval || typeof window === 'undefined') return;
    this.pollingInterval = window.setInterval(() => {
      this.syncSession();
    }, intervalMs);
  }

  
  public startNewConversation() {
    this.sessionId = null;
    this.messages = [];
    this.saveSession();
    if (this.onMessage) {
      // Trigger a refresh/clear in the UI by passing a special null message or just let the UI react
    }
  }

  
  public startNewConversation() {
    this.sessionId = null;
    this.messages = [];
    this.saveSession();
    if (this.onMessage) {
      // Trigger a refresh/clear in the UI by passing a special null message or just let the UI react
    }
  }

  public stopPolling() {
    if (this.pollingInterval) {
      window.clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  public async syncSession() {
    if (!this.sessionId || this.activeSends > 0) return;
    
    // Find the last persisted message ID that is from the backend
    const lastBackendMsg = [...this.messages].reverse().find((m) => m.backendId);
    const afterParam = lastBackendMsg?.backendId ? `?after=${encodeURIComponent(lastBackendMsg.backendId)}` : '';
    
    try {
      const res = await fetch(`${this.config.baseUrl}/conversations/${this.sessionId}/sync${afterParam}`, {
        headers: this.widgetHeaders(),
      });
      if (!res.ok) return;
      
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        let hasNew = false;
        const matchedOptimisticIds = new Set<string>();
        for (const rawMessage of data.messages) {
          const message = this.fromServerMessage(rawMessage);
          if (this.messages.some((existing) => existing.backendId === message.backendId || existing.id === message.backendId)) continue;

          const optimisticIndex = this.messages.findIndex((existing) =>
            existing.id.startsWith('m_') &&
            !existing.id.startsWith('m_book_') &&
            !existing.id.startsWith('m_meet_') &&
            !existing.backendId &&
            !matchedOptimisticIds.has(existing.id) &&
            existing.role === message.role &&
            existing.content === message.content
          );
          if (optimisticIndex >= 0) {
            matchedOptimisticIds.add(this.messages[optimisticIndex].id);
            const reconciled = { ...message, id: this.messages[optimisticIndex].id };
            this.messages[optimisticIndex] = reconciled;
            this.emit(reconciled);
          } else {
            this.messages.push(message);
            this.emit(message);
          }
          hasNew = true;
        }

        if (hasNew) {
          this.saveSession();
        }
      }
    } catch (e) {
      console.warn('Failed to sync session', e);
    }
  }

  public refreshVisitor() {
    this.loadVisitorIdentity();
    void this.ping();
  }

  private fromServerMessage(raw: any): Message {
    const toolCalls = Array.isArray(raw.tool_calls) ? raw.tool_calls : [];
    const booking = raw.booking || raw.booking_card || toolCalls.find((tool: any) =>
      tool?.kind === 'booking_card' || Array.isArray(tool?.slots)
    );
    return {
      id: String(raw.id),
      backendId: String(raw.id),
      role: raw.role,
      content: String(raw.content || ''),
      citations: raw.citations || [],
      booking,
    };
  }

  private emit(msg: Message) {
    if (this.onMessage) this.onMessage(msg);
    else if (this.config.onMessage) this.config.onMessage(msg);
  }

  private emitState(state: 'idle' | 'connecting' | 'streaming') {
    if (this.onStateChange) this.onStateChange(state);
    else if (this.config.onStateChange) this.config.onStateChange(state);
  }

  private parseEvent(eventStr: string, msgId: string) {
    const lines = eventStr.split(/\r?\n/);
    let eventType = 'message';
    let data = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.substring(7).trim();
      } else if (line.startsWith('data: ')) {
        data = line.substring(6).trim();
      }
    }

    if (!data) return;

    try {
      const parsedData = JSON.parse(data);

      if (eventType === 'session' && parsedData.session_id) {
        this.sessionId = parsedData.session_id;
        this.saveSession();
      } else if (eventType === 'token' && parsedData.delta) {
        this.updateMessage(msgId, (m) => ({ ...m, content: m.content + parsedData.delta }));
      } else if (eventType === 'citations' && parsedData.citations) {
        this.updateMessage(msgId, (m) => ({ ...m, citations: parsedData.citations }));
      } else if (eventType === 'booking') {
        this.updateMessage(msgId, (m) => ({ ...m, booking: parsedData }));
      }
    } catch (e) {
      console.error('Failed to parse SSE JSON data:', data);
    }
  }

  private updateMessage(id: string, updater: (m: Message) => Message) {
    this.messages = this.messages.map((m) => (m.id === id ? updater(m) : m));
    this.saveSession();
    const updated = this.messages.find((m) => m.id === id);
    if (updated) this.emit(updated);
  }
}
