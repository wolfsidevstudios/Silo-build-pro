
import React, { useState, useEffect } from 'react';
import type { ProjectType } from '../App';

interface HomePageProps {
  onStartBuild: (prompt: string, projectType: ProjectType) => void;
  isLoading: boolean;
}

const BASIC_PROMPTS = [
  'A modern to-do list app',
  'A simple weather dashboard',
  'A pomodoro timer component',
  'A minimalist portfolio page',
];

const ADVANCED_PROMPTS = [
  'A real-time markdown editor with preview',
  'A simple blog with Supabase integration for posts',
  'A Trello-like board with draggable cards',
  'An e-commerce product page with a shopping cart',
  'A data dashboard visualizing sales with charts',
  'A recipe finder that uses a public API'
];


const CountdownUnit: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex flex-col items-center w-20">
    <span className="text-4xl md:text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">{String(value).padStart(2, '0')}</span>
    <span className="text-xs text-gray-500 uppercase tracking-widest mt-1">{label}</span>
  </div>
);

const CountdownTimer = () => {
  const calculateTimeLeft = () => {
    const year = new Date().getFullYear();
    // Use a UTC date to avoid timezone issues. Month is 0-indexed, so 9 is October.
    const launchDate = new Date(Date.UTC(year, 9, 17, 0, 0, 0)); 
    const difference = +launchDate - +new Date();
    
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isLive: false,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isLive: false,
      };
    } else {
        timeLeft.isLive = true;
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (timeLeft.isLive) {
      return (
        <div className="text-3xl font-bold text-green-400 animate-pulse">
            We Are Live!
        </div>
      )
  }

  return (
    <div className="flex items-center justify-center space-x-2 md:space-x-6">
      <CountdownUnit value={timeLeft.days} label="Days" />
      <CountdownUnit value={timeLeft.hours} label="Hours" />
      <CountdownUnit value={timeLeft.minutes} label="Minutes" />
      <CountdownUnit value={timeLeft.seconds} label="Seconds" />
    </div>
  );
};


export const HomePage: React.FC<HomePageProps> = ({ onStartBuild, isLoading }) => {
  const [prompt, setPrompt] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('multi');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStartBuild(prompt, projectType);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    onStartBuild(suggestion, projectType);
  };

  return (
    <div className="relative flex flex-col items-center justify-between h-full p-8 text-center bg-black overflow-y-auto">
      {/* Centered circular gradient blob */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-cyan-600/20 to-blue-600/20 rounded-full blur-[200px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center w-full pt-8 md:pt-16">
        <h1 className="text-6xl md:text-7xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white via-gray-300 to-gray-600">
          Build anything with Silo
        </h1>
        <p className="text-gray-400 text-lg mb-8 max-w-2xl">
          Describe the application or component you want to create, and watch it come to life in real-time.
        </p>

        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1">
               <button
                onClick={() => setProjectType('html')}
                disabled={isLoading}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    projectType === 'html' ? 'bg-white text-black' : 'text-gray-300 hover:bg-white/10'
                }`}
                >
                HTML/CSS/JS
              </button>
              <button
              onClick={() => setProjectType('single')}
              disabled={isLoading}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  projectType === 'single' ? 'bg-white text-black' : 'text-gray-300 hover:bg-white/10'
              }`}
              >
              React (Single File)
              </button>
              <button
              onClick={() => setProjectType('multi')}
              disabled={isLoading}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center justify-center ${
                  projectType === 'multi' ? 'bg-white text-black' : 'text-gray-300 hover:bg-white/10'
              }`}
              >
              React (Multi-File)
              <span className="ml-1.5 bg-yellow-400/20 text-yellow-300 text-xs font-mono px-1.5 py-0.5 rounded-full">
                Beta
              </span>
              </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-6">
          <div className="relative w-full">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., a real-time crypto price tracker with a dark theme"
              className="w-full p-5 pr-40 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all text-lg resize-none"
              rows={4}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="absolute bottom-4 right-4 px-6 py-2 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Building...' : 'Start Building'}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {BASIC_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-gray-300 hover:bg-white/20 hover:border-white/30 transition-colors text-sm disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
          {showAdvanced && ADVANCED_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-gray-300 hover:bg-white/20 hover:border-white/30 transition-colors text-sm disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
          <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isLoading}
              className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-gray-300 hover:bg-white/20 hover:border-white/30 transition-colors text-sm disabled:opacity-50 flex items-center space-x-2"
            >
              <span className="material-symbols-outlined text-base">
                {showAdvanced ? 'remove' : 'add'}
              </span>
              <span>{showAdvanced ? 'Show less' : 'More examples'}</span>
          </button>
        </div>
      </div>
      
      <div className="relative z-10 w-full max-w-4xl mt-8 pt-8 pb-4">
        <div className="bg-zinc-900/50 backdrop-blur-md border border-gray-700 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/30">
          <h2 className="text-2xl font-bold text-gray-200 mb-2">The Countdown Has Begun</h2>
          <p className="text-gray-400 mb-6">We're officially launching on October 17th. Get ready!</p>
          <CountdownTimer />
        </div>
      </div>
    </div>
  );
};
