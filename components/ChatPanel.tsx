import React, { useEffect, useRef } from 'react';
import type { Message } from '../App';

interface ChatPanelProps {
  messages: Message[];
  userInput: string;
  onUserInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  progress: number | null;
  onToggleMaxAgent: () => void;
}

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const baseStyle = "p-3 rounded-xl max-w-lg mb-2";
  const userStyle = "bg-blue-600 text-white self-end";
  const aiStyle = "bg-gray-100 text-gray-800 self-start";
  const systemStyle = "bg-gray-200 text-gray-600 self-center text-sm italic w-full text-center";

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
                    const isGenerated = message.generated_files?.includes(file);
                    return (
                    <li key={i} className={`flex items-center transition-colors duration-300 ${isGenerated ? 'text-green-600' : 'text-gray-500'}`}>
                        <span className="material-symbols-outlined text-base mr-2">
                        {isGenerated ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span className="font-mono">{file}</span>
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

const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="w-full bg-gray-200 rounded-full h-1.5 my-2">
    <div 
      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-linear" 
      style={{ width: `${progress}%` }}
    ></div>
  </div>
);

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, userInput, onUserInput, onSend, isLoading, progress, onToggleMaxAgent }) => {
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
    <div className="flex flex-col h-full bg-transparent">
      <div className="flex-1 p-4 overflow-y-auto flex flex-col">
        {messages.map((msg, index) => (
          <ChatMessage key={index} message={msg} />
        ))}
        
        {isLoading && progress === null && !messages.some(m => m.files_to_generate) && (
          <div className="self-start bg-gray-100 p-3 rounded-lg flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
          </div>
        )}

        {progress !== null && (
          <div className="self-start w-full max-w-lg">
            <ProgressBar progress={progress} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-200">
        <div className="relative bg-white border border-gray-300 rounded-2xl shadow-md">
          <textarea
            id="prompt-input"
            value={userInput}
            onChange={(e) => onUserInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={"a real-time crypto price\ntracker"}
            className="w-full bg-transparent text-black placeholder-gray-500 border-none outline-none resize-none p-5 pr-20"
            style={{ minHeight: '5.5rem', maxHeight: '15rem' }}
            rows={2}
            disabled={isLoading}
          />
          <div className="absolute left-4 bottom-4 hidden md:block">
            <button
                onClick={onToggleMaxAgent}
                className="px-4 py-2 bg-white text-black rounded-full font-semibold border border-gray-300 hover:bg-gray-200 transition-colors text-sm shadow-sm"
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
