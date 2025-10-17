import React, { useEffect, useRef } from 'react';

export interface MaxThought {
  text: string;
  timestamp: number;
}

interface MaxAgentPanelProps {
  thoughts: MaxThought[];
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

export const MaxAgentPanel: React.FC<MaxAgentPanelProps> = ({ thoughts, isRunning, onStart, onStop }) => {
  const thoughtsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughts]);

  return (
    <div className="w-80 h-full bg-white/90 backdrop-blur-xl border-l border-gray-200 flex flex-col text-black shadow-2xl rounded-l-3xl">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Max AI Agent</h2>
        <p className="text-xs text-gray-500">Your autonomous development partner.</p>
      </div>
      
      {!isRunning && thoughts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <button
            onClick={onStart}
            className="px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
          >
            Start Agent
          </button>
        </div>
      )}

      { (isRunning || thoughts.length > 0) && (
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
          {thoughts.map((thought) => (
            <div key={thought.timestamp} className="bg-gray-100 p-2 rounded-lg text-gray-800">
              <p>{thought.text}</p>
            </div>
          ))}
           <div ref={thoughtsEndRef} />
        </div>
      )}

      {isRunning && (
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onStop}
            className="w-full py-2 bg-transparent border border-black text-black rounded-full font-semibold hover:bg-gray-100 transition-colors"
          >
            Stop Agent
          </button>
        </div>
      )}
    </div>
  );
};
