'use client';

import { useState, useRef, useEffect } from 'react';
import main from './agent';

export default function Home() {
  const [messages, setMessages] = useState<{ text: string | undefined; isUser: boolean; timestamp: Date }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsTyping(true);

    // Add user message
    setMessages(prev => [...prev, { 
      text: userMessage, 
      isUser: true,
      timestamp: new Date()
    }]);
    
    //This is where we would call the main function from the agent.ts file
    let AIresponse : string | undefined = await main(userMessage)
    await new Promise(resolve => setTimeout(resolve, 1000));
    

    setMessages(prev => [...prev, { 
      text: AIresponse, 
      isUser: false,
      timestamp: new Date()
    }]);
    
    setIsTyping(false);
    inputRef.current?.focus();
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
            Text to Fireproof AI Agent
          </h2>
        </div>
        
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 h-[600px] overflow-y-auto custom-scrollbar border border-emerald-500/20">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-emerald-100/80">
                <div className="text-6xl mb-4">🤖</div>
                <p className="text-lg font-medium">Start a conversation with the AI</p>
                <p className="text-sm mt-2 text-emerald-200/60">Your messages will appear here</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`animate-fade-in ${
                    message.isUser ? 'flex justify-end' : 'flex justify-start'
                  }`}
                >
                  <div className="max-w-[80%]">
                    <div
                      className={`p-4 rounded-2xl ${
                        message.isUser
                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-br-none'
                          : 'bg-black/40 text-emerald-100 rounded-bl-none border border-emerald-500/20'
                      } shadow-lg`}
                    >
                      {message.text}
                    </div>
                    <div className={`text-xs text-emerald-200/60 mt-1 ${message.isUser ? 'text-right' : 'text-left'}`}>
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-black/40 text-emerald-100 p-4 rounded-2xl rounded-bl-none shadow-lg border border-emerald-500/20">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-4 bg-black/20 backdrop-blur-lg border-2 border-emerald-500/20 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-200 text-emerald-100 placeholder-emerald-200/40"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-white px-6 py-4 rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:shadow-lg"
          >
            Send
          </button>
        </form>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(16, 185, 129, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(16, 185, 129, 0.5);
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}