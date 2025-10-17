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
    <div className="w-80 h-full bg-zinc-900/80 backdrop-blur-xl border-l border-gray-700 flex flex-col text-white shadow-2xl">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">Max AI Agent</h2>
        <p className="text-xs text-gray-400">Your autonomous development partner.</p>
      </div>
      
      {!isRunning && thoughts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <button
            onClick={onStart}
            className="px-6 py-3 bg-green-600 text-white rounded-full font-semibold hover:bg-green-700 transition-colors"
          >
            Start Agent
          </button>
        </div>
      )}

      { (isRunning || thoughts.length > 0) && (
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-sm">
          {thoughts.map((thought) => (
            <div key={thought.timestamp} className="bg-white/5 p-2 rounded-lg animate-fade-in">
              <p>{thought.text}</p>
            </div>
          ))}
           <div ref={thoughtsEndRef} />
        </div>
      )}

      {isRunning && (
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onStop}
            className="w-full py-2 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors"
          >
            Stop Agent
          </button>
        </div>
      )}
    </div>
  );
};
