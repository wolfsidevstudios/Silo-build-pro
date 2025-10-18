import React, { useEffect, useRef } from 'react';
import type { Message } from '../App';

interface ChatPanelProps {
  messages: Message[];
  userInput: string;
  onUserInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  buildTime: number;
  onToggleMaxAgent: () => void;
}

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const baseStyle = "p-3 rounded-xl max-w-lg mb-2 shadow-lg";
  const userStyle = "bg-blue-600 text-white self-end";
  const aiStyle = "bg-white/70 backdrop-blur-lg border border-gray-200/50 text-gray-800 self-start";
  const systemStyle = "bg-white/50 backdrop-blur-md border border-gray-200/30 text-gray-600 self-center text-sm italic w-full text-center";

  if (message.plan || message.files_to_generate) {
    return (
      <div className="self-start bg-white/50 backdrop-blur-md border border-gray-200 rounded-2xl p-4 max-w-lg mb-2 text-gray-800 shadow-lg">
        <p className="font-semibold mb-2">{message.text}</p>
        {message.plan && (
            <ul className="space-y-1 list-disc list-inside text-sm text-gray-600">
            {message.plan.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
        )}
        {message.files_to_generate && (
            <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="font-semibold text-sm mb-2 text-gray-500">File Checklist:</p>
                <ul className="space-y-1.5 text-sm">
                {message.files_to_generate.map((file, i) => {
                    const isGenerated = message.generated_files?.includes(file.path);
                    return (
                    <li key={i} className={`flex items-center justify-between transition-colors duration-300 ${isGenerated ? 'text-green-600' : 'text-gray-500'}`}>
                        <div className="flex items-center">
                            <span className="material-symbols-outlined text-base mr-2">
                                {isGenerated ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            <span className="font-mono">{file.path}</span>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            file.status === 'added' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                            {file.status}
                        </span>
                    </li>
                    );
                })}
                </ul>
            </div>
        )}
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

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, userInput, onUserInput, onSend, isLoading, buildTime, onToggleMaxAgent }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };
  
  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 p-4 overflow-y-auto flex flex-col">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        
        {isLoading && (
            <div className="self-center flex flex-col items-center mt-2">
                {!messages.some(m => m.files_to_generate) && (
                  <div className="bg-white/70 backdrop-blur-lg border border-gray-200/50 p-3 rounded-lg flex items-center space-x-2 shadow-lg mb-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  </div>
                )}
                <div className="text-xs text-gray-500 font-mono">
                    Time building: {formatTime(buildTime)}
                </div>
            </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      <div className="p-4">
        <div className="relative bg-white/70 backdrop-blur-lg border border-gray-200/50 rounded-3xl shadow-xl">
          <textarea
            id="prompt-input"
            value={userInput}
            onChange={(e) => onUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={"a real-time crypto price\ntracker"}
            className="w-full bg-transparent text-black placeholder-gray-500 border-none outline-none resize-none p-5 pr-20"
            style={{ minHeight: '6.5rem', maxHeight: '15rem' }}
            rows={3}
            disabled={isLoading}
          />
          <div className="absolute left-4 bottom-4 hidden md:block">
            <button
                onClick={onToggleMaxAgent}
                className="px-4 py-2 bg-white/50 backdrop-blur-sm text-black rounded-full font-semibold border border-white/80 hover:bg-white/90 transition-colors text-sm shadow-sm"
            >
                MAX
            </button>
          </div>
          <button
            id="send-button"
            onClick={onSend}
            disabled={isLoading || !userInput.trim()}
            className="absolute right-4 bottom-4 w-12 h-12 flex items-center justify-center rounded-full bg-black text-white disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <span className="material-symbols-outlined text-2xl">arrow_upward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
