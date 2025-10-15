import React, { useEffect, useRef } from 'react';
import type { Message } from '../App';

interface ChatPanelProps {
  messages: Message[];
  userInput: string;
  onUserInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  progress: number | null;
}

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const baseStyle = "p-3 rounded-xl max-w-lg mb-2";
  const userStyle = "bg-blue-600 text-white self-end";
  const aiStyle = "bg-gray-800 text-gray-200 self-start";
  const systemStyle = "bg-gray-900 text-gray-400 self-center text-sm italic w-full text-center";

  if (message.plan) {
    return (
      <div className="self-start bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 max-w-lg mb-2 text-gray-200 shadow-lg">
        <p className="font-semibold mb-2">{message.text}</p>
        <ul className="space-y-1 list-disc list-inside text-sm text-gray-300">
          {message.plan.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    );
  }

  const getStyle = () => {
    switch (message.actor) {
      case 'user': return `${baseStyle} ${userStyle}`;
      case 'ai': return `${baseStyle} ${aiStyle}`;
      case 'system': return `${baseStyle} ${systemStyle}`;
    }
  };

  return <div className={getStyle()}>{message.text}</div>;
};

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-800 rounded-full h-1.5 my-2">
    <div 
      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-linear" 
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, userInput, onUserInput, onSend, isLoading, progress }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, progress]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="flex-1 p-4 overflow-y-auto flex flex-col">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        
        {/* Shows spinner while waiting for the plan */}
        {isLoading && progress === null && (
          <div className="self-start bg-gray-800 p-3 rounded-lg flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
          </div>
        )}

        {/* Shows progress bar while generating code */}
        {progress !== null && (
          <div className="self-start w-full max-w-lg">
            <ProgressBar progress={progress} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-900">
        <div className="relative bg-zinc-900 rounded-3xl">
          <textarea
            value={userInput}
            onChange={(e) => onUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={"a real-time crypto price\ntracker"}
            className="w-full bg-transparent text-gray-200 border-none outline-none resize-none p-5 pr-20"
            style={{ minHeight: '5.5rem', maxHeight: '15rem' }}
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={onSend}
            disabled={isLoading || !userInput.trim()}
            className="absolute right-4 bottom-4 w-12 h-12 flex items-center justify-center rounded-full bg-white text-black disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <span className="material-symbols-outlined text-2xl">arrow_upward</span>
          </button>
        </div>
      </div>
    </div>
  );
};