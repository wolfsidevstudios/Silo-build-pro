
import React, { useEffect, useRef } from 'react';

export interface MaxThought {
  type: 'thought' | 'action' | 'system';
  text: string;
  timestamp: number;
}

interface MaxAgentPanelProps {
  thoughts: MaxThought[];
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
}

const ThoughtBubble: React.FC<{ thought: MaxThought }> = ({ thought }) => {
    const icons = {
        thought: 'psychology',
        action: 'play_arrow',
        system: 'settings_suggest',
    };
    const colors = {
        thought: 'bg-gray-100 text-gray-800',
        action: 'bg-blue-50 border border-blue-200 text-blue-800',
        system: 'bg-transparent text-gray-500 italic text-center text-xs',
    };
    const iconColors = {
        thought: 'text-gray-500',
        action: 'text-blue-500',
        system: 'text-gray-400',
    };

    return (
        <div className={`p-2 rounded-lg flex items-start space-x-2 ${colors[thought.type]}`}>
            <span className={`material-symbols-outlined text-base mt-0.5 ${iconColors[thought.type]}`}>
                {icons[thought.type]}
            </span>
            <p className="flex-1">{thought.text}</p>
        </div>
    );
};


export const MaxAgentPanel: React.FC<MaxAgentPanelProps> = ({ thoughts, isRunning, onStart, onStop }) => {
  const thoughtsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    thoughtsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thoughts]);

  return (
    <div className="w-80 h-full bg-white/90 backdrop-blur-xl border-l border-gray-200 flex flex-col text-black shadow-2xl rounded-l-3xl">
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-900">Max AI Agent 1.5</h2>
        <p className="text-xs text-gray-500">Your autonomous development partner.</p>
      </div>
      
      {!isRunning && thoughts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <p className="text-sm text-gray-600 mb-4">Activate Max to have it analyze your project, propose new features, and even fix bugs for you.</p>
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
            <ThoughtBubble key={thought.timestamp} thought={thought} />
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
