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

export interface Message {
  id: string;
  role: 'customer' | 'ai' | 'human_agent';
  content: string;
  citations?: any[];
  isStreaming?: boolean;
  booking?: BookingCard;
}

export interface KinClientConfig {
  widgetKey: string;
  baseUrl?: string;
  onMessage?: (message: Message) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'streaming') => void;
  onError?: (error: string) => void;
}

export class KinClient {
  private config: KinClientConfig;
  private sessionId: string | null = null;
  public messages: Message[] = [];
  public onMessage?: (message: Message) => void;
  public onStateChange?: (state: 'idle' | 'connecting' | 'streaming') => void;
  public userId?: string;
  public userEmail?: string;
  public userName?: string;
  public bottomTabs?: string[];
  public onConfigUpdate?: (tabs: string[]) => void;
  private pollingInterval?: number;

  constructor(config: KinClientConfig) {
    this.config = {
      baseUrl: 'http://localhost:8000/api/v1',
      ...config,
    };
    this.validateWidgetKey();
    this.loadSession();
  }

  private get storageKey() {
    return `kin_session_${this.config.widgetKey}`;
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
        this.bottomTabs = data.bottom_tabs;
        if (this.onConfigUpdate) {
          this.onConfigUpdate(this.bottomTabs);
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
      id: `m_${Date.now()}`,
      role: 'customer',
      content,
    };
    this.messages = [...this.messages, userMsg];
    this.saveSession();
    this.emit(userMsg);

    const aiMsgId = `m_${Date.now() + 1}`;
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'ai',
      content: '',
      isStreaming: true,
    };
    this.messages = [...this.messages, aiMsg];
    this.saveSession();
    this.emit(aiMsg);

    this.emitState('connecting');

    const { collectPageContext } = await import('../context-collector');
    const payload = {
      message: content,
      context: collectPageContext(),
      session_id: this.sessionId,
      attachments,
    };

    try {
      const res = await fetch(`${this.config.baseUrl}/conversations/chat`, {
        method: 'POST',
        headers: this.widgetHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to send message');
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

        for (const eventStr of events) {
          this.parseEvent(eventStr, aiMsgId);
        }
      }

      this.emitState('idle');
      this.updateMessage(aiMsgId, (m) => ({ ...m, isStreaming: false }));
    } catch (e: any) {
      this.config.onError?.(e.message || 'Network error');
      this.emitState('idle');
      this.updateMessage(aiMsgId, (m) => ({ ...m, isStreaming: false, content: 'Error connecting to agent.' }));
    }
  }

  public startPolling(intervalMs: number = 3000) {
    if (this.pollingInterval) return;
    this.pollingInterval = window.setInterval(() => {
      this.syncSession();
    }, intervalMs);
  }

  public stopPolling() {
    if (this.pollingInterval) {
      window.clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  public async syncSession() {
    if (!this.sessionId) return;
    
    // Find the last persisted message ID that is from the backend
    const lastBackendMsg = [...this.messages].reverse().find(m => m.id && !m.id.startsWith('m_book_') && !m.id.startsWith('m_'));
    const afterParam = lastBackendMsg ? `?after=${lastBackendMsg.id}` : '';
    
    try {
      const res = await fetch(`${this.config.baseUrl}/conversations/${this.sessionId}/sync${afterParam}`, {
        headers: this.widgetHeaders(),
      });
      if (!res.ok) return;
      
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        let hasNew = false;
        data.messages.forEach((newMsg: any) => {
          // Prevent duplicates
          if (!this.messages.some(m => m.id === newMsg.id)) {
            this.messages.push(newMsg);
            hasNew = true;
          }
        });
        
        if (hasNew) {
          this.saveSession();
          // Emit the last message to trigger an update, or we can just emit a state change
          // to simplify, we can emit the last received message
          this.emit(this.messages[this.messages.length - 1]);
        }
      }
    } catch (e) {
      console.warn('Failed to sync session', e);
    }
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
