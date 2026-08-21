import { PageContext, collectPageContext } from '../context-collector';
import { getOrCreateVisitorId } from '../identity';

export interface Message {
  id: string;
  role: 'customer' | 'ai' | 'human_agent';
  content: string;
  citations?: any[];
  isStreaming?: boolean;
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
  private eventSource: EventSource | null = null;
  public messages: Message[] = [];
  public onMessage?: (message: Message) => void;
  public onStateChange?: (state: 'idle' | 'connecting' | 'streaming') => void;
  
  constructor(config: KinClientConfig) {
    this.config = {
      baseUrl: 'http://localhost:8000/api/v1', // default local backend
      ...config,
    };
    
    // Attempt to validate widget key immediately
    this.validateWidgetKey();
  }

  private async validateWidgetKey() {
    try {
      const res = await fetch(`${this.config.baseUrl}/gateway/validate`, {
        method: 'POST',
        headers: {
          'X-Kin-Widget-Key': this.config.widgetKey,
        },
      });
      if (!res.ok) {
        throw new Error('Invalid widget key or rate limited');
      }
    } catch (e: any) {
      this.config.onError?.(e.message || 'Validation failed');
    }
  }

  public async sendMessage(content: string, attachments?: { type: string; data: string }[]) {
    // We allow sending if there's content OR attachments
    if (!content.trim() && (!attachments || attachments.length === 0)) return;

    // 1. Optimistically add the user message
    const userMsg: Message = {
      id: `m_${Date.now()}`,
      role: 'customer',
      content,
    };
    this.messages = [...this.messages, userMsg];
    if (this.onMessage) this.onMessage(userMsg);
    else if (this.config.onMessage) this.config.onMessage(userMsg);
    
    // 2. Add an empty streaming AI message
    const aiMsgId = `m_${Date.now() + 1}`;
    const aiMsg: Message = {
      id: aiMsgId,
      role: 'ai',
      content: '',
      isStreaming: true,
    };
    this.messages = [...this.messages, aiMsg];
    if (this.onMessage) this.onMessage(aiMsg);
    else if (this.config.onMessage) this.config.onMessage(aiMsg);
    
    if (this.onStateChange) this.onStateChange('connecting');
    else if (this.config.onStateChange) this.config.onStateChange('connecting');

    // 3. Prepare payload
    const context = collectPageContext();
    const payload = {
      message: content,
      context,
      session_id: this.sessionId,
      attachments,
    };

    try {
      // We use fetch to initiate the request. The backend returns a SSE stream.
      // Standard EventSource only supports GET, so we use fetch to POST, 
      // but if the backend uses standard EventSource, we'd need a polyfill (like @microsoft/fetch-event-source).
      // For simplicity in this demo phase, let's assume we can fetch the stream.
      
      const res = await fetch(`${this.config.baseUrl}/conversations/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Kin-Widget-Key': this.config.widgetKey,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to send message');
      if (!res.body) throw new Error('No response body');

      if (this.onStateChange) this.onStateChange('streaming');
      else if (this.config.onStateChange) this.config.onStateChange('streaming');

      // Simple manual stream parsing (for demo purposes)
      // In production, use a robust library like eventsource-parser
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        // Split by double newline (SSE event boundary)
        const events = buffer.split(/\r?\n\r?\n/);
        buffer = events.pop() || ''; // Keep the incomplete event in the buffer
        
        for (const eventStr of events) {
          this.parseEvent(eventStr, aiMsgId);
        }
      }
      
      if (this.onStateChange) this.onStateChange('idle');
      else if (this.config.onStateChange) this.config.onStateChange('idle');
      
      // Update message to not streaming
      this.updateMessage(aiMsgId, (m) => ({ ...m, isStreaming: false }));

    } catch (e: any) {
      this.config.onError?.(e.message || 'Network error');
      if (this.onStateChange) this.onStateChange('idle');
      else if (this.config.onStateChange) this.config.onStateChange('idle');
      this.updateMessage(aiMsgId, (m) => ({ ...m, isStreaming: false, content: 'Error connecting to agent.' }));
    }
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
      
      if (eventType === 'token' && parsedData.delta) {
        this.updateMessage(msgId, (m) => ({ ...m, content: m.content + parsedData.delta }));
      } else if (eventType === 'citations' && parsedData.citations) {
        this.updateMessage(msgId, (m) => ({ ...m, citations: parsedData.citations }));
      } else if (eventType === 'handoff') {
        // Handle escalation
      }
    } catch (e) {
      console.error('Failed to parse SSE JSON data:', data);
    }
  }
  
  private updateMessage(id: string, updater: (m: Message) => Message) {
    this.messages = this.messages.map((m) => m.id === id ? updater(m) : m);
    // Find and re-trigger onMessage with the updated reference so UI renders
    const updated = this.messages.find(m => m.id === id);
    if (updated) {
      if (this.onMessage) this.onMessage(updated);
      else if (this.config.onMessage) this.config.onMessage(updated);
    }
  }
}
