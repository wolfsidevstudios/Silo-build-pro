import React, { useState } from 'react';

interface HomePageProps {
  onStartBuild: (prompt: string) => void;
  isLoading: boolean;
}

const PROMPT_SUGGESTIONS = [
  'A modern to-do list app',
  'A simple weather dashboard',
  'A pomodoro timer component',
  'A minimalist portfolio page',
];

export const HomePage: React.FC<HomePageProps> = ({ onStartBuild, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStartBuild(prompt);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    onStartBuild(suggestion);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-300 to-gray-600">
        Build anything with Silo
      </h1>
      <p className="text-gray-400 text-lg mb-10 max-w-2xl">
        Describe the application or component you want to create, and watch it come to life in real-time.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-6 flex flex-col items-center">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., a real-time crypto price tracker with a dark theme"
          className="w-full p-5 bg-zinc-900 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg resize-none mb-4"
          rows={3}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="px-8 py-3 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Building...' : 'Start Building'}
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => handleSuggestionClick(suggestion)}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-full text-gray-300 hover:bg-gray-800 hover:border-gray-600 transition-colors text-sm disabled:opacity-50"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};
