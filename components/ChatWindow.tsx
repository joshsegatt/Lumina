import React, { useState, useRef, useEffect, FormEvent } from 'react';
import type { Conversation, ChatMessage } from '../types';
import { llmService } from '../services/llmService';

const BackArrowIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

const SendIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
);

interface ChatWindowProps {
  conversation: Conversation;
  onBack: () => void;
  onMessagesUpdate: (messages: ChatMessage[]) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onBack, onMessagesUpdate }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(conversation.messages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Sync local state if conversation prop changes
    setMessages(conversation.messages);
  }, [conversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages); // Optimistically update UI

    const currentInput = input;
    setInput('');
    setIsLoading(true);

    // Add placeholder for streaming
    setMessages(prev => [...prev, { role: 'model', text: '' }]);

    await llmService.generateStream(
      conversation.feature.systemInstruction,
      currentInput,
      (chunk) => {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1].text = chunk;
          return updated;
        });
      },
      () => {
        setIsLoading(false);
        // Persist final messages after stream finishes
        setMessages(prev => {
            onMessagesUpdate(prev);
            return prev;
        });
      }
    );
  };

  return (
    <div className="flex flex-col w-full py-4 min-h-screen-minus-header">
      <header className="flex-shrink-0 flex items-center mb-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <BackArrowIcon className="w-6 h-6 text-slate-500 dark:text-slate-400" />
        </button>
        <div className="ml-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{conversation.feature.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{conversation.feature.description}</p>
        </div>
      </header>

      <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-6 py-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center shrink-0 border border-slate-300 dark:border-slate-600">
                <conversation.feature.icon className="w-5 h-5 text-violet-500 dark:text-violet-400" />
              </div>
            )}
            <div
              className={`max-w-xs md:max-w-md lg:max-w-2xl px-4 py-3 rounded-2xl whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-lg'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg'
              }`}
            >
              {msg.text}
              {index === messages.length - 1 && isLoading && msg.role === 'model' && (
                  <span className="inline-block w-0.5 h-5 bg-slate-500 dark:bg-slate-400 ml-1 animate-pulse" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex-shrink-0 pt-4 mt-auto">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={conversation.feature.placeholder}
            disabled={isLoading}
            rows={1}
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl py-3 pl-5 pr-14 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-all duration-300 resize-none overflow-y-hidden"
            style={{paddingTop: '0.8rem', paddingBottom: '0.8rem', lineHeight: '1.5rem', maxHeight: '120px'}}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-violet-600 text-white disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed hover:bg-violet-500 transition-colors"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};