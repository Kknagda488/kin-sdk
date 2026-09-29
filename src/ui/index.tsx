import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, X, MoreHorizontal, ChevronDown, ChevronLeft, Paperclip, Smile, Image as ImageIcon, Mic, Calendar, Home, HelpCircle, Megaphone, Search, Bot, ChevronRight, Phone, ExternalLink } from 'lucide-react';
import { KinClient, Message, MessengerArticle, MessengerWidgetContent, ProductTour } from '../core';
import { BookingCard } from './BookingCard';
import { ProductTourOverlay } from './ProductTourOverlay';
import '../globals.css';

// --- Components ---

function FinLogo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="4" height="4" rx="2" fill="currentColor"/>
      <rect x="10" y="3" width="4" height="4" rx="2" fill="currentColor"/>
      <rect x="17" y="3" width="4" height="4" rx="2" fill="currentColor"/>
      
      <rect x="3" y="10" width="4" height="4" rx="2" fill="currentColor"/>
      <rect x="10" y="10" width="4" height="4" rx="2" fill="currentColor"/>
      <rect x="17" y="10" width="4" height="4" rx="2" fill="currentColor"/>
      
      <rect x="3" y="17" width="4" height="4" rx="2" fill="currentColor"/>
      <rect x="10" y="17" width="4" height="4" rx="2" fill="currentColor"/>
      <rect x="17" y="17" width="4" height="4" rx="2" fill="currentColor"/>
    </svg>
  );
}

function BottomNav({ tabs = ['home', 'messages', 'help'], current, onSelect }: { tabs?: string[], current: string, onSelect: (tab: string) => void }) {
  const getIcon = (tab: string, active: boolean) => {
    const size = 22;
    const className = active ? 'kintw:text-kin-accent' : 'kintw:text-kin-500 group-hover:kintw:text-kin-900';
    switch (tab) {
      case 'home': return <Home size={size} className={className} />;
      case 'messages': return <MessageSquare size={size} className={className} />;
      case 'help': return <HelpCircle size={size} className={className} />;
      case 'news': return <Megaphone size={size} className={className} />;
      default: return null;
    }
  };

  const getLabel = (tab: string) => {
    switch (tab) {
      case 'home': return 'Home';
      case 'messages': return 'Messages';
      case 'help': return 'Help';
      case 'news': return 'News';
      default: return '';
    }
  };

  return (
    <div className="kintw:shrink-0 kintw:flex kintw:items-center kintw:justify-around kintw:p-4 kintw:border-t kintw:border-kin-300 kintw:bg-kin-100">
      {tabs.map(tab => {
        const active = current === tab || (current === 'chat' && tab === 'messages');
        return (
          <button 
            key={tab}
            onClick={() => onSelect(tab)}
            className="kintw:flex kintw:flex-col kintw:items-center kintw:gap-1 kintw:bg-transparent kintw:border-none kintw:cursor-pointer kintw:group"
          >
            {getIcon(tab, active)}
            <span className={`kintw:text-[11px] kintw:font-medium ${active ? 'kintw:text-kin-900' : 'kintw:text-kin-500 group-hover:kintw:text-kin-900'}`}>
              {getLabel(tab)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function MessageBubble({ message, client }: { message: Message; client: KinClient }) {
  const isUser = message.role === 'customer';
  return (
    <div className={`kintw:flex kintw:w-full kintw:mb-6 kintw:flex-col ${isUser ? 'kintw:items-end' : 'kintw:items-start'}`}>
      <div 
        className={`kintw:max-w-[85%] kintw:px-4 kintw:py-3 kintw:text-[15px] kintw:leading-relaxed ${
          isUser 
            ? 'kintw:bg-kin-300 kintw:text-white kintw:rounded-2xl kintw:rounded-tr-sm' 
            : message.role === 'human_agent'
            ? 'kintw:bg-blue-50 kintw:text-kin-900 kintw:rounded-2xl kintw:rounded-tl-sm kintw:border kintw:border-blue-100'
            : 'kintw:bg-kin-200 kintw:text-kin-900 kintw:rounded-2xl kintw:rounded-tl-sm'
        }`}
      >
        {!isUser && message.role === 'human_agent' && (
          <div className="kintw:text-xs kintw:font-medium kintw:text-blue-600 kintw:mb-1 kintw:flex kintw:items-center kintw:gap-1">
            <span className="kintw:w-2 kintw:h-2 kintw:rounded-full kintw:bg-blue-500"></span> Teammate
          </div>
        )}
        {isUser ? (
          <div className="kintw:whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div className="kintw:prose kintw:prose-sm kintw:prose-invert kintw:max-w-none prose-p:kintw:my-1 prose-a:kintw:text-kin-accent">
            {message.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            ) : (
              <div className="kintw:flex kintw:space-x-1 kintw:items-center kintw:h-6">
                <div className="kintw:w-1.5 kintw:h-1.5 kintw:bg-kin-500 kintw:rounded-full kintw:animate-bounce" />
                <div className="kintw:w-1.5 kintw:h-1.5 kintw:bg-kin-500 kintw:rounded-full kintw:animate-bounce kintw:delay-100" />
                <div className="kintw:w-1.5 kintw:h-1.5 kintw:bg-kin-500 kintw:rounded-full kintw:animate-bounce kintw:delay-200" />
              </div>
            )}
            
            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="kintw:mt-3 kintw:pt-2 kintw:border-t kintw:border-kin-400">
                <span className="kintw:text-xs kintw:font-medium kintw:text-kin-600 kintw:block kintw:mb-1">Sources</span>
                <div className="kintw:flex kintw:flex-wrap kintw:gap-1.5">
                  {message.citations.map((cit, i) => (
                    <a 
                      key={cit.id} 
                      href={cit.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="kintw:text-[11px] kintw:bg-kin-300 kintw:text-kin-800 kintw:border kintw:border-kin-400 kintw:px-1.5 kintw:py-0.5 kintw:rounded hover:kintw:bg-kin-400 kintw:transition-colors kintw:no-underline"
                    >
                      [{i + 1}] {cit.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {!isUser && message.booking && <BookingCard card={message.booking} client={client} />}
      </div>
      {!isUser && (
        <span className="kintw:text-[11px] kintw:text-kin-600 kintw:mt-1.5 kintw:ml-1">
          Kin • AI Agent • Just now
        </span>
      )}
    </div>
  );
}


function ChatPanel({ 
  onClose, 
  onBack,
  client, 
  messages,
  bottomNav,
  isInline = false,
  panelStyle,
  subtitle = 'The team can also help',
}: { 
  onClose: () => void;
  onBack?: () => void;
  client: KinClient;
  messages: Message[];
  bottomNav?: React.ReactNode;
  isInline?: boolean;
  panelStyle?: React.CSSProperties;
  subtitle?: string;
}) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{type: string, file?: File | Blob, dataUrl: string}[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            setAttachments(prev => [...prev, { type: file.type, file, dataUrl: ev.target!.result as string }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleRecording = async () => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        
        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onload = (ev) => {
            if (ev.target?.result) {
              setAttachments(prev => [...prev, { type: 'audio/webm', file: blob, dataUrl: ev.target!.result as string }]);
            }
          };
          reader.readAsDataURL(blob);
          stream.getTracks().forEach(t => t.stop());
        };
        
        mediaRecorder.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Mic access denied", e);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    
    const apiAttachments = attachments.map(a => ({
      type: a.type,
      // OpenAI compatible image inputs need the complete data URL, not raw base64.
      data: a.dataUrl
    }));
    
    client.sendMessage(input, apiAttachments);
    setInput('');
    setAttachments([]);
  };

  return (
    <div style={panelStyle} className={
      isInline 
        ? "kintw:relative kintw:w-full kintw:h-full kintw:bg-kin-50 kintw:rounded-[24px] kintw:flex kintw:flex-col kintw:overflow-hidden kin-agent-ui" 
        : "kintw:fixed kintw:bottom-20 kintw:right-6 kintw:w-[400px] kintw:h-[650px] kintw:max-h-[85vh] kintw:bg-kin-50 kintw:rounded-[24px] kintw:shadow-2xl kintw:flex kintw:flex-col kintw:overflow-hidden kintw:border kintw:border-kin-300 kin-agent-ui kintw:z-[999999]"
    }>
      {/* Header */}
      <div className="kintw:bg-kin-50 kintw:text-kin-900 kintw:p-4 kintw:flex kintw:items-center kintw:justify-between kintw:border-b kintw:border-kin-200">
        <div className="kintw:flex kintw:items-center kintw:gap-3">
          <button onClick={onBack || onClose} className="kintw:text-kin-600 hover:kintw:text-kin-900 kintw:transition-colors kintw:bg-transparent kintw:border-none kintw:cursor-pointer kintw:p-1">
            <ChevronLeft size={24} />
          </button>
          <div className="kintw:text-kin-900">
            <FinLogo />
          </div>
          <div>
            <h3 className="kintw:font-semibold kintw:text-base kintw:m-0">Kin</h3>
            <p className="kintw:text-xs kintw:text-kin-500 kintw:m-0">{subtitle}</p>
          </div>
        </div>
        <div className="kintw:flex kintw:items-center kintw:gap-1">
          <button className="kintw:text-kin-600 hover:kintw:text-kin-900 kintw:transition-colors kintw:p-2 kintw:rounded-full hover:kintw:bg-kin-200 kintw:border-none kintw:bg-transparent kintw:cursor-pointer">
            <MoreHorizontal size={20} />
          </button>
          {!isInline && (
            <button onClick={onClose} className="kintw:text-kin-600 hover:kintw:text-kin-900 kintw:transition-colors kintw:p-2 kintw:rounded-full hover:kintw:bg-kin-200 kintw:border-none kintw:bg-transparent kintw:cursor-pointer">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="kintw:flex-1 kintw:overflow-y-auto kintw:p-5 kintw:bg-kin-50">
        {messages.length === 0 ? (
          <div className="kintw:h-full kintw:flex kintw:flex-col kintw:items-center kintw:justify-center kintw:text-center kintw:px-6">
            <div className="kintw:text-kin-500 kintw:mb-4">
              <FinLogo />
            </div>
            <h4 className="kintw:font-semibold kintw:text-kin-900 kintw:mb-2 kintw:text-lg">Hi there! 👋</h4>
            <p className="kintw:text-sm kintw:text-kin-600">Ask a question or share your feedback.</p>
          </div>
        ) : (
          messages.map(m => <MessageBubble key={m.id} message={m} client={client} />)
        )}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div className="kintw:p-5 kintw:bg-kin-50 kintw:border-t kintw:border-kin-200">
        <form onSubmit={handleSend} className="kintw:relative kintw:bg-kin-50 kintw:border kintw:border-kin-300 focus-within:kintw:border-kin-500 kintw:transition-colors kintw:rounded-[20px] kintw:p-3">
          
          {/* Attachments Preview */}
          {attachments.length > 0 && (
            <div className="kintw:flex kintw:flex-wrap kintw:gap-2 kintw:mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="kintw:relative kintw:w-12 kintw:h-12 kintw:rounded kintw:bg-kin-200 kintw:flex kintw:items-center kintw:justify-center kintw:border kintw:border-kin-300 kintw:group">
                  {att.type.startsWith('image/') ? (
                    <img src={att.dataUrl} alt="preview" className="kintw:w-full kintw:h-full kintw:object-cover kintw:rounded" />
                  ) : att.type.startsWith('audio/') ? (
                    <Mic size={16} className="kintw:text-kin-500" />
                  ) : (
                    <Paperclip size={16} className="kintw:text-kin-500" />
                  )}
                  <button type="button" onClick={() => removeAttachment(i)} className="kintw:absolute -kintw:top-1.5 -kintw:right-1.5 kintw:bg-kin-400 kintw:text-white kintw:rounded-full kintw:p-0.5 kintw:hidden group-hover:kintw:block kintw:border-none kintw:cursor-pointer">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Ask a question..."
            rows={2}
            className="kintw:w-full kintw:bg-transparent kintw:resize-none kintw:text-[15px] kintw:text-kin-900 placeholder:kintw:text-kin-500 focus:kintw:outline-none kintw:mb-2"
          />
          <div className="kintw:flex kintw:items-center kintw:justify-between">
            <div className="kintw:flex kintw:items-center kintw:gap-3 kintw:text-kin-500">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="kintw:hidden" 
                multiple 
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="kintw:bg-transparent kintw:border-none kintw:cursor-pointer hover:kintw:text-kin-700 kintw:transition-colors">
                <Paperclip size={18} />
              </button>
              <button type="button" className="kintw:bg-transparent kintw:border-none kintw:cursor-pointer hover:kintw:text-kin-700 kintw:transition-colors">
                <Smile size={18} />
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="kintw:bg-transparent kintw:border-none kintw:cursor-pointer hover:kintw:text-kin-700 kintw:transition-colors">
                <ImageIcon size={18} />
              </button>
              <button type="button" onClick={toggleRecording} className={`kintw:bg-transparent kintw:border-none kintw:cursor-pointer hover:kintw:text-kin-700 kintw:transition-colors ${isRecording ? 'kintw:text-red-500 hover:kintw:text-red-600 kintw:animate-pulse' : ''}`}>
                <Mic size={18} />
              </button>
            </div>
            <button 
              type="submit" 
              disabled={!input.trim() && attachments.length === 0}
              className="kintw:bg-kin-accent kintw:text-[#000000] kintw:rounded-full kintw:px-4 kintw:py-2.5 kintw:text-[13px] kintw:font-semibold kintw:flex kintw:items-center kintw:gap-2 disabled:kintw:opacity-50 disabled:kintw:cursor-not-allowed kintw:transition-all hover:kintw:opacity-90 kintw:border-none kintw:cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5v14M7 5v14M22 10v4M2 10v4"/></svg>
              {(input.trim() || attachments.length > 0) ? "Send Message" : "Speak to Kin"}
            </button>
          </div>
        </form>
        <div className="kintw:text-center kintw:mt-4">
          <span className="kintw:text-[11px] kintw:text-kin-500">By chatting with us, you agree to our <a href="#" className="kintw:text-kin-600 kintw:underline">Privacy Policy</a></span>
        </div>
      </div>
      {bottomNav}
    </div>
  );
}

// --- Main Widget Wrapper ---

export interface KinWidgetProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  client?: KinClient | null;
  hideDefaultLauncher?: boolean;
  bottomTabs?: ('home' | 'messages' | 'help' | 'news')[];
  isInline?: boolean;
}

export function KinWidget({ isOpen = false, setIsOpen, client, hideDefaultLauncher = false, bottomTabs, isInline = false }: KinWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<'home' | 'messages' | 'chat' | 'help' | 'article' | 'news'>('home');
  const [helpQuery, setHelpQuery] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<MessengerArticle | null>(null);
  const [widgetContent, setWidgetContent] = useState<MessengerWidgetContent>({
    messenger: { spaces: { home: true, messages: true, help: false, news: false }, greeting: 'Ask us anything, or share your feedback.', intro: 'As soon as we can', primaryColor: '#9be35c', backgroundStyle: 'dark', showLauncher: true },
    articles: [],
    product_tours_enabled: false,
    product_tours: [],
  });
  const [activeTour, setActiveTour] = useState<ProductTour | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [backendTabs, setBackendTabs] = useState<string[] | undefined>(client?.bottomTabs);
  
  useEffect(() => {
    if (client) {
      setMessages([...client.messages]);
      setBackendTabs(client.bottomTabs);
      client.onConfigUpdate = (tabs) => setBackendTabs(tabs);
      setContentLoading(true);
      client.fetchWidgetContent().then((content) => {
        setWidgetContent(content);
        const enabledTabs = Object.entries(content.messenger.spaces).filter(([, enabled]) => enabled).map(([name]) => name);
        if (enabledTabs.length && !content.messenger.spaces.home) setView(enabledTabs[0] as any);
        client.onWidgetContentUpdate = setWidgetContent;
      }).catch(() => undefined).finally(() => setContentLoading(false));
      
      client.onMessage = (msg) => {
        setMessages(prev => {
          const exists = prev.findIndex(m => m.id === msg.id);
          if (exists >= 0) {
            const next = [...prev];
            next[exists] = msg;
            return next;
          }
          return [...prev, msg];
        });
      };
    }
  }, [client]);

  useEffect(() => {
    if (!widgetContent.product_tours_enabled) return;
    const startRouteTour = () => {
      const tour = widgetContent.product_tours.find(
        (candidate) => candidate.trigger_path !== '*' && candidate.trigger_path === window.location.pathname,
      );
      if (!tour || sessionStorage.getItem(`kin-tour-seen:${tour.id}`)) return;
      sessionStorage.setItem(`kin-tour-seen:${tour.id}`, '1');
      setActiveTour(tour);
    };
    startRouteTour();
    window.addEventListener('popstate', startRouteTour);
    // Also notice client-side router transitions that update history without popstate.
    const routeWatcher = window.setInterval(startRouteTour, 800);
    return () => {
      window.removeEventListener('popstate', startRouteTour);
      window.clearInterval(routeWatcher);
    };
  }, [widgetContent.product_tours_enabled, widgetContent.product_tours]);

  useEffect(() => {
    const handler = (event: Event) => {
      const tourId = (event as CustomEvent<{ tourId?: string }>).detail?.tourId;
      if (!widgetContent.product_tours_enabled) return;
      const tour = widgetContent.product_tours.find((candidate) => !tourId || candidate.id === tourId);
      if (tour) setActiveTour(tour);
    };
    window.addEventListener('kin:start-tour', handler);
    return () => window.removeEventListener('kin:start-tour', handler);
  }, [widgetContent.product_tours, widgetContent.product_tours_enabled]);

  useEffect(() => {
    if (client) {
      if (isOpen && view === 'chat') {
        client.startPolling();
      } else {
        client.stopPolling();
      }
    }
  }, [isOpen, view, client]);

  const startBooking = async () => {
    if (!client) return;
    setView('chat');
    try {
      const card = await client.fetchSlots();
      const intro: Message = {
        id: `m_meet_${Date.now()}`,
        role: 'ai',
        content: 'Let’s book a 30-minute intro call. Tap a day, then a time — I’ll send a Google Meet link.',
        booking: card,
      };
      client.messages = [...client.messages, intro];
      setMessages(prev => [...prev, intro]);
    } catch {
      client.sendMessage('I would like to book a meeting');
    }
  };

  const recentMessages = [...messages].filter((message) => message.role !== 'customer').slice(-1).reverse();
  const helpArticles = widgetContent.articles.filter((article) => `${article.title} ${article.description} ${article.content}`.toLowerCase().includes(helpQuery.toLowerCase()));
  const switchConfig = widgetContent.messenger.switch;
  const phoneDigits = (switchConfig?.phone_number || '').replace(/[^\d+]/g, '');
  const phoneHref = /^\+?\d{7,15}$/.test(phoneDigits) ? `tel:${phoneDigits}` : '';
  let destinationUrl = '';
  try {
    const parsed = new URL(switchConfig?.destination_url || '');
    if (parsed.protocol === 'https:') destinationUrl = parsed.href;
  } catch { /* unset or invalid legacy destination */ }

  const openSupport = (question?: string) => {
    setView('chat');
    if (question && client) client.sendMessage(question);
  };

  const startProductTour = (tour: ProductTour) => {
    if (widgetContent.product_tours_enabled) setActiveTour(tour);
  };

  const panelClass = isInline
    ? 'kintw:relative kintw:w-full kintw:h-full kintw:bg-kin-50 kintw:rounded-[28px] kintw:flex kintw:flex-col kintw:overflow-hidden kin-agent-ui'
    : 'kintw:fixed kintw:bottom-20 kintw:right-6 kintw:w-[min(400px,calc(100vw-32px))] kintw:h-[min(680px,calc(100dvh-110px))] kintw:bg-kin-50 kintw:rounded-[28px] kintw:shadow-2xl kintw:flex kintw:flex-col kintw:overflow-hidden kintw:border kintw:border-kin-300 kin-agent-ui kintw:z-[999999]';

  const closeButton = !isInline && <button onClick={() => setIsOpen?.(false)} aria-label="Close chat" className="kintw:absolute kintw:top-5 kintw:right-5 kintw:z-10 kintw:bg-transparent kintw:border-none kintw:text-kin-500 kintw:cursor-pointer"><X size={22} /></button>;
  const configuredTabs = Object.entries(widgetContent.messenger.spaces).filter(([, enabled]) => enabled).map(([name]) => name);
  const nav = <BottomNav tabs={(configuredTabs.length ? configuredTabs : (backendTabs || bottomTabs || ['home', 'messages', 'help'])) as string[]} current={view} onSelect={(next) => setView(next as any)} />;
  const panelStyle: React.CSSProperties = {
    '--color-kin-accent': widgetContent.messenger.primaryColor,
    ...(widgetContent.messenger.backgroundStyle === 'light' ? {
      '--color-kin-50': '#ffffff', '--color-kin-100': '#f6f7f9', '--color-kin-200': '#eef0f3', '--color-kin-300': '#d9dde3', '--color-kin-400': '#c5cad2', '--color-kin-500': '#737b87', '--color-kin-600': '#59616d', '--color-kin-700': '#343a43', '--color-kin-800': '#20252c', '--color-kin-900': '#11151a',
    } : {}),
  } as React.CSSProperties;

  return (
    <>
      {isOpen && client && view !== 'chat' && (
        <div className={panelClass} style={panelStyle}>
          {closeButton}
          {view === 'home' && <>
            <div className="kintw:bg-gradient-to-br kintw:from-emerald-600 kintw:to-sky-700 kintw:px-8 kintw:pt-16 kintw:pb-8">
              <div className="kintw:flex kintw:items-center kintw:gap-3 kintw:mb-12"><div className="kintw:rounded-full kintw:bg-white/20 kintw:p-3"><FinLogo /></div><span className="kintw:text-sm kintw:text-white/80">KIN SUPPORT</span></div>
              <h2 className="kintw:text-3xl kintw:font-bold kintw:text-white kintw:m-0">Hi there 👋<br />{widgetContent.messenger.greeting}</h2>
            </div>
            <div className="kintw:flex-1 kintw:overflow-y-auto kintw:p-4 kintw:space-y-3 kintw:-kintw:mt-1">
              {recentMessages.length > 0 && <button onClick={() => setView('messages')} className="kintw:w-full kintw:text-left kintw:rounded-2xl kintw:border kintw:border-kin-300 kintw:bg-kin-100 kintw:p-4 kintw:text-kin-900 kintw:cursor-pointer"><div className="kintw:font-semibold kintw:mb-3">Recent message</div>{recentMessages.map((message) => <div key={message.id} className="kintw:flex kintw:items-center kintw:gap-3"><Bot size={24} className="kintw:text-kin-accent" /><div className="kintw:min-w-0 kintw:flex-1"><div className="kintw:truncate">{message.content || 'New conversation'}</div><div className="kintw:text-sm kintw:text-kin-500 kintw:truncate">If you still need help, continue your conversation</div></div><ChevronRight size={18} className="kintw:text-kin-500" /></div>)}</button>}
              {widgetContent.product_tours_enabled && widgetContent.product_tours.map((tour) => <button key={tour.id} onClick={() => startProductTour(tour)} className="kintw:w-full kintw:text-left kintw:rounded-2xl kintw:border kintw:border-kin-300 kintw:bg-kin-100 kintw:p-4 kintw:text-kin-900 kintw:cursor-pointer"><div className="kintw:flex kintw:items-center kintw:justify-between kintw:gap-3"><span className="kintw:font-semibold">{tour.name}</span><span className="kintw:rounded-lg kintw:bg-kin-accent kintw:px-3 kintw:py-2 kintw:text-sm kintw:font-semibold kintw:text-[#15200e]">Start tour</span></div><p className="kintw:mb-0 kintw:text-sm kintw:text-kin-600">{tour.description || `Take a ${tour.steps.length}-step guided tour.`}</p></button>)}
              <button onClick={startBooking} className="kintw:w-full kintw:text-left kintw:rounded-2xl kintw:border kintw:border-kin-300 kintw:bg-kin-100 kintw:p-4 kintw:text-kin-900 kintw:cursor-pointer"><div className="kintw:font-semibold kintw:mb-2">Schedule a demo</div><p className="kintw:text-sm kintw:leading-relaxed kintw:text-kin-600 kintw:my-0 kintw:mb-4">We’d love to show you how Kin can help. Choose a time that works for you.</p><span className="kintw:block kintw:rounded-xl kintw:bg-kin-accent kintw:px-4 kintw:py-3 kintw:text-center kintw:font-semibold kintw:text-[#15200e]">Pick a time</span></button>
              {switchConfig?.enabled && (phoneHref || destinationUrl) && <section className="kintw:rounded-2xl kintw:border kintw:border-kin-300 kintw:bg-kin-100 kintw:p-4 kintw:text-kin-900"><div className="kintw:font-semibold kintw:mb-2">More ways to reach us</div><div className="kintw:flex kintw:flex-wrap kintw:gap-2">{phoneHref && <a href={phoneHref} className="kintw:inline-flex kintw:items-center kintw:gap-2 kintw:rounded-xl kintw:bg-kin-200 kintw:px-3 kintw:py-2.5 kintw:text-sm kintw:text-kin-800 kintw:no-underline"><Phone size={16} />Call the team</a>}{destinationUrl && <a href={destinationUrl} target="_blank" rel="noopener noreferrer" className="kintw:inline-flex kintw:items-center kintw:gap-2 kintw:rounded-xl kintw:bg-kin-200 kintw:px-3 kintw:py-2.5 kintw:text-sm kintw:text-kin-800 kintw:no-underline">Continue to booking or call<ExternalLink size={15} /></a>}</div></section>}
              <button onClick={() => openSupport()} className="kintw:w-full kintw:flex kintw:items-center kintw:gap-3 kintw:rounded-2xl kintw:border kintw:border-kin-300 kintw:bg-kin-100 kintw:p-4 kintw:text-left kintw:text-kin-900 kintw:cursor-pointer"><MessageSquare className="kintw:text-kin-accent" /><span><b className="kintw:block">Ask a question</b><small className="kintw:text-kin-500">AI agent and team can help</small></span></button>
              {widgetContent.messenger.spaces.help && widgetContent.articles.slice(0, 3).map((article) => <button key={article.id} onClick={() => { setSelectedArticle(article); setView('article'); }} className="kintw:w-full kintw:flex kintw:items-center kintw:justify-between kintw:gap-3 kintw:rounded-xl kintw:bg-kin-100 kintw:px-4 kintw:py-3 kintw:text-left kintw:text-sm kintw:text-kin-800 kintw:cursor-pointer">{article.title}<ChevronRight size={16} className="kintw:shrink-0 kintw:text-kin-accent" /></button>)}
              {widgetContent.messenger.spaces.help && <div className="kintw:flex kintw:items-center kintw:gap-2 kintw:rounded-xl kintw:bg-kin-200 kintw:px-4"><Search size={18} className="kintw:text-kin-accent" /><input value={helpQuery} onChange={(e) => { setHelpQuery(e.target.value); setView('help'); }} placeholder="Search for help" className="kintw:w-full kintw:bg-transparent kintw:py-4 kintw:text-kin-900 placeholder:kintw:text-kin-500 kintw:outline-none" /></div>}
            </div>
          </>}
          {view === 'messages' && <>
            <header className="kintw:relative kintw:border-b kintw:border-kin-300 kintw:px-5 kintw:py-5 kintw:text-center kintw:text-xl kintw:font-semibold kintw:text-kin-900">Messages</header>
            <div className="kintw:flex-1 kintw:overflow-y-auto kintw:px-5 kintw:py-2">
              {recentMessages.length ? recentMessages.map((message) => <button key={message.id} onClick={() => setView('chat')} className="kintw:flex kintw:w-full kintw:items-center kintw:gap-4 kintw:border-b kintw:border-kin-300 kintw:bg-transparent kintw:px-2 kintw:py-5 kintw:text-left kintw:text-kin-900 kintw:cursor-pointer"><Bot size={25} className="kintw:shrink-0 kintw:text-kin-accent" /><span className="kintw:min-w-0 kintw:flex-1"><span className="kintw:block kintw:truncate">{message.content || 'New conversation'}</span><span className="kintw:mt-1 kintw:block kintw:truncate kintw:text-sm kintw:text-kin-500">If you still need help, continue your conversation</span></span><span className="kintw:text-sm kintw:text-kin-500">now</span></button>) : <div className="kintw:py-12 kintw:text-center kintw:text-sm kintw:text-kin-500">Your conversations will appear here.</div>}
            </div>
            <div className="kintw:border-t kintw:border-kin-300 kintw:bg-gradient-to-b kintw:from-kin-50 kintw:to-[#090b12] kintw:p-6 kintw:text-center"><button onClick={() => openSupport()} className="kintw:rounded-2xl kintw:bg-kin-accent kintw:px-6 kintw:py-3 kintw:font-semibold kintw:text-[#15200e] kintw:cursor-pointer">Ask a question <HelpCircle size={17} className="kintw:ml-2 kintw:inline" /></button></div>
          </>}
          {view === 'help' && <>
            <header className="kintw:relative kintw:border-b kintw:border-kin-300 kintw:px-5 kintw:py-5 kintw:text-center kintw:text-xl kintw:font-semibold kintw:text-kin-900">Help</header>
            <div className="kintw:flex kintw:items-center kintw:gap-2 kintw:border-b kintw:border-kin-300 kintw:px-5 kintw:py-3"><input value={helpQuery} onChange={(e) => setHelpQuery(e.target.value)} placeholder="Search for help" className="kintw:flex-1 kintw:rounded-xl kintw:bg-kin-200 kintw:px-4 kintw:py-3 kintw:text-kin-900 placeholder:kintw:text-kin-500 kintw:outline-none" /><Search size={20} className="kintw:text-kin-accent" /></div>
            <div className="kintw:flex-1 kintw:overflow-y-auto kintw:px-5"><h2 className="kintw:py-4 kintw:text-xl kintw:font-semibold kintw:text-kin-900">{helpQuery ? 'Search results' : 'Collections'}</h2>{helpArticles.length ? helpArticles.map((article) => <button key={article.id} onClick={() => { setSelectedArticle(article); setView('article'); }} className="kintw:w-full kintw:border-t kintw:border-kin-300 kintw:bg-transparent kintw:py-5 kintw:text-left kintw:text-kin-900 kintw:cursor-pointer"><span className="kintw:flex kintw:items-center kintw:justify-between kintw:gap-3 kintw:font-semibold">{article.title}<ChevronRight size={18} className="kintw:shrink-0 kintw:text-kin-accent" /></span><span className="kintw:mt-2 kintw:block kintw:text-sm kintw:leading-relaxed kintw:text-kin-600">{article.description || article.content.slice(0, 180)}</span><span className="kintw:mt-3 kintw:block kintw:text-sm kintw:text-kin-500">{article.category}</span></button>) : <p className="kintw:py-6 kintw:text-sm kintw:text-kin-500">{contentLoading ? 'Loading published help articles…' : 'No published help articles yet. Ask Kin and we’ll help you find an answer.'}</p>}</div>
          </>}
          {view === 'article' && selectedArticle && <>
            <header className="kintw:flex kintw:items-center kintw:gap-3 kintw:border-b kintw:border-kin-300 kintw:px-5 kintw:py-4 kintw:text-lg kintw:font-semibold kintw:text-kin-900"><button onClick={() => setView('help')} aria-label="Back to Help" className="kintw:border-none kintw:bg-transparent kintw:text-kin-500 kintw:cursor-pointer"><ChevronLeft /></button><span className="kintw:flex-1">{selectedArticle.title}</span></header>
            <article className="kintw:flex-1 kintw:overflow-y-auto kintw:px-5 kintw:py-5 kintw:text-sm kintw:leading-relaxed kintw:text-kin-700 kintw:whitespace-pre-wrap">{selectedArticle.content || selectedArticle.description}</article>
            <div className="kintw:border-t kintw:border-kin-300 kintw:p-4 kintw:text-center"><button onClick={() => openSupport(`I need help with: ${selectedArticle.title}`)} className="kintw:rounded-xl kintw:bg-kin-accent kintw:px-5 kintw:py-3 kintw:font-semibold kintw:text-[#15200e]">Ask us about this</button></div>
          </>}
          {view === 'news' && <>
            <header className="kintw:border-b kintw:border-kin-300 kintw:px-5 kintw:py-5 kintw:text-center kintw:text-xl kintw:font-semibold kintw:text-kin-900">News</header>
            <div className="kintw:flex-1 kintw:overflow-y-auto kintw:px-5"><h2 className="kintw:py-4 kintw:text-xl kintw:font-semibold kintw:text-kin-900">Latest updates</h2>{widgetContent.articles.length ? widgetContent.articles.map((article) => <button key={article.id} onClick={() => { setSelectedArticle(article); setView('article'); }} className="kintw:w-full kintw:border-t kintw:border-kin-300 kintw:bg-transparent kintw:py-5 kintw:text-left kintw:text-kin-900 kintw:cursor-pointer"><span className="kintw:block kintw:font-semibold">{article.title}</span><span className="kintw:mt-2 kintw:block kintw:text-sm kintw:text-kin-600">{article.description || article.content.slice(0, 180)}</span></button>) : <p className="kintw:py-6 kintw:text-sm kintw:text-kin-500">{contentLoading ? 'Loading updates…' : 'No published updates yet.'}</p>}</div>
          </>}
          {nav}
        </div>
      )}

      {isOpen && client && view === 'chat' && (
        <ChatPanel 
          onClose={() => setIsOpen?.(false)}
          onBack={() => setView('home')}
          client={client}
          messages={messages}
          bottomNav={nav}
          isInline={isInline}
          panelStyle={panelStyle}
          subtitle={widgetContent.messenger.intro}
        />
      )}
      {activeTour && <ProductTourOverlay tour={activeTour} onClose={() => setActiveTour(null)} />}
      
      {!hideDefaultLauncher && !isInline && widgetContent.messenger.showLauncher && (
      <button
        onClick={() => setIsOpen?.(!isOpen)}
        className="kintw:fixed kintw:bottom-6 kintw:right-6 kintw:w-14 kintw:h-14 kintw:bg-kin-accent kintw:text-[#15200e] kintw:rounded-full kintw:shadow-xl hover:kintw:shadow-2xl hover:kintw:-translate-y-1 kintw:transition-all kintw:duration-200 kintw:flex kintw:items-center kintw:justify-center kintw:z-[999999] kintw:border-none kintw:cursor-pointer"
        aria-label="Toggle chat"
      >
        {isOpen ? <ChevronDown size={28} /> : <MessageSquare size={26} />}
      </button>
      )}
    </>
  );
}
