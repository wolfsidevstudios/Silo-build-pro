import React, { useState, useEffect, useRef } from 'react';
import type { ProjectType } from '../App';
import { ProductHuntIcon } from './icons';

interface HomePageProps {
  onStartBuild: (prompt: string, projectType: ProjectType) => void;
  isLoading: boolean;
  defaultStack: ProjectType;
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
    <span className="text-4xl md:text-5xl font-mono font-bold text-transparent bg-clip-text bg-gradient-to-br from-zinc-800 to-zinc-500">{String(value).padStart(2, '0')}</span>
    <span className="text-xs text-zinc-500 uppercase tracking-widest mt-1">{label}</span>
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
        <div className="text-3xl font-bold text-green-500 animate-pulse">
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

export const HomePage: React.FC<HomePageProps> = ({ onStartBuild, isLoading, defaultStack }) => {
  const [prompt, setPrompt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStartBuild(prompt, defaultStack);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    onStartBuild(suggestion, defaultStack);
  };

  return (
    <div className="relative flex flex-col items-center justify-between h-full p-8 text-center">
      <div className="relative z-10 flex flex-col items-center justify-center w-full pt-20 md:pt-16 flex-grow">
        <div className="w-full max-w-4xl mx-auto mb-8">
            <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white rounded-xl p-2 flex items-center justify-center shadow">
                        <ProductHuntIcon />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-black text-left">Silo Build <span className="font-sans font-normal text-gray-600">x</span> Product Hunt</h3>
                        <p className="text-sm text-gray-600 text-left">Integration of the Day: Fetch data from Product Hunt.</p>
                    </div>
                </div>
                <div className="flex-shrink-0">
                    <div className="bg-white rounded-xl p-1 shadow-inner">
                        <a href="#/integrations" className="block px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap">
                            Add Integration
                        </a>
                    </div>
                </div>
            </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-black">
          Build anything with Silo
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl">
          Create apps and websites by chatting with AI.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-6">
          <div className="relative w-full">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., a real-time crypto price tracker with a dark theme"
              className="w-full p-5 pr-20 bg-white border border-gray-300 rounded-2xl text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg resize-none shadow-lg"
              rows={4}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="absolute bottom-4 right-4 w-12 h-12 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-all duration-300 ease-in-out disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:scale-105 active:scale-100"
              aria-label="Start Building"
            >
              {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <span className="material-symbols-outlined text-2xl">arrow_upward</span>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {BASIC_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-full text-black hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
          {showAdvanced && ADVANCED_PROMPTS.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-full text-black hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
          <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 rounded-full text-black hover:bg-gray-200 transition-colors text-sm disabled:opacity-50 flex items-center space-x-2"
            >
              <span className="material-symbols-outlined text-base">
                {showAdvanced ? 'remove' : 'add'}
              </span>
              <span>{showAdvanced ? 'Show less' : 'More examples'}</span>
          </button>
        </div>
      </div>
      
      <div className="relative z-10 w-full max-w-4xl mt-8 pt-8 pb-4">
        <div className="bg-white/30 backdrop-blur-lg border border-white/50 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/5">
          <h2 className="text-2xl font-bold text-zinc-800 mb-2">The Countdown Has Begun</h2>
          <p className="text-zinc-600 mb-6">We're officially launching on October 17th. Get ready!</p>
          <CountdownTimer />
        </div>
      </div>
    </div>
  );
};