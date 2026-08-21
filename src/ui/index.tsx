import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageSquare, X, Send, MoreHorizontal, ChevronDown, ChevronLeft, Paperclip, Smile, Image as ImageIcon, Mic } from 'lucide-react';
import { KinClient, Message } from '../core';
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

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'customer';
  return (
    <div className={`kintw:flex kintw:w-full kintw:mb-6 kintw:flex-col ${isUser ? 'kintw:items-end' : 'kintw:items-start'}`}>
      <div 
        className={`kintw:max-w-[85%] kintw:px-4 kintw:py-3 kintw:text-[15px] kintw:leading-relaxed ${
          isUser 
            ? 'kintw:bg-kin-300 kintw:text-white kintw:rounded-2xl kintw:rounded-tr-sm' 
            : 'kintw:bg-kin-200 kintw:text-kin-900 kintw:rounded-2xl kintw:rounded-tl-sm'
        }`}
      >
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
  client, 
  messages 
}: { 
  onClose: () => void; 
  client: KinClient;
  messages: Message[];
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
      data: a.dataUrl.split(',')[1]
    }));
    
    client.sendMessage(input, apiAttachments);
    setInput('');
    setAttachments([]);
  };

  return (
    <div className="kintw:fixed kintw:bottom-20 kintw:right-6 kintw:w-[400px] kintw:h-[650px] kintw:max-h-[85vh] kintw:bg-kin-50 kintw:rounded-[24px] kintw:shadow-2xl kintw:flex kintw:flex-col kintw:overflow-hidden kintw:border kintw:border-kin-300 kin-agent-ui kintw:z-[999999]">
      {/* Header */}
      <div className="kintw:bg-kin-50 kintw:text-kin-900 kintw:p-4 kintw:flex kintw:items-center kintw:justify-between kintw:border-b kintw:border-kin-200">
        <div className="kintw:flex kintw:items-center kintw:gap-3">
          <button className="kintw:text-kin-600 hover:kintw:text-kin-900 kintw:transition-colors kintw:bg-transparent kintw:border-none kintw:cursor-pointer kintw:p-1">
            <ChevronLeft size={24} />
          </button>
          <div className="kintw:text-kin-900">
            <FinLogo />
          </div>
          <div>
            <h3 className="kintw:font-semibold kintw:text-base kintw:m-0">Kin</h3>
            <p className="kintw:text-xs kintw:text-kin-500 kintw:m-0">The team can also help</p>
          </div>
        </div>
        <div className="kintw:flex kintw:items-center kintw:gap-1">
          <button className="kintw:text-kin-600 hover:kintw:text-kin-900 kintw:transition-colors kintw:p-2 kintw:rounded-full hover:kintw:bg-kin-200 kintw:border-none kintw:bg-transparent kintw:cursor-pointer">
            <MoreHorizontal size={20} />
          </button>
          <button onClick={onClose} className="kintw:text-kin-600 hover:kintw:text-kin-900 kintw:transition-colors kintw:p-2 kintw:rounded-full hover:kintw:bg-kin-200 kintw:border-none kintw:bg-transparent kintw:cursor-pointer">
            <X size={20} />
          </button>
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
          messages.map(m => <MessageBubble key={m.id} message={m} />)
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
    </div>
  );
}

// --- Main Widget Wrapper ---

export interface KinWidgetProps {
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
  client?: KinClient | null;
}

export function KinWidget({ isOpen = false, setIsOpen, client }: KinWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    if (client) {
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

  return (
    <>
      {isOpen && client && (
        <ChatPanel 
          onClose={() => setIsOpen?.(false)} 
          client={client}
          messages={messages}
        />
      )}
      
      <button
        onClick={() => setIsOpen?.(!isOpen)}
        className="kintw:fixed kintw:bottom-6 kintw:right-6 kintw:w-14 kintw:h-14 kintw:bg-kin-accent kintw:text-white kintw:rounded-full kintw:shadow-xl hover:kintw:shadow-2xl hover:kintw:-translate-y-1 kintw:transition-all kintw:duration-200 kintw:flex kintw:items-center kintw:justify-center kintw:z-[999999] kintw:border-none kintw:cursor-pointer"
        aria-label="Toggle chat"
      >
        {isOpen ? <ChevronDown size={28} /> : <MessageSquare size={26} />}
      </button>
    </>
  );
}
