

import React, { useState, useEffect, useRef } from 'react';
import type { ProjectType } from '../App';
import { ProductHuntIcon, PexelsIcon } from './icons';

interface HomePageProps {
  onStartBuild: (prompt: string, projectType: ProjectType, screenshot: string | null) => void;
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
    const year = 2025;
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
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  const banners = [
    {
      id: 'pexels',
      icon: <PexelsIcon />,
      title: 'Silo Build x Pexels',
      description: 'Product of the Week: Access free stock photos.',
      link: '#/integrations',
      linkLabel: 'Add Integration',
    },
    {
      id: 'product-hunt',
      icon: <ProductHuntIcon />,
      title: 'We are live on Product Hunt!',
      badgeHtml: `<a href="https://www.producthunt.com/products/silo-build?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-silo-build" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1027607&theme=light&t=1760711966482" alt="Silo Build - Create apps and websites by chatting with AI. | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>`,
    },
  ];

  useEffect(() => {
    const bannerInterval = setInterval(() => {
      setCurrentBannerIndex(prevIndex => (prevIndex + 1) % banners.length);
    }, 5000); // Slide every 5 seconds

    return () => clearInterval(bannerInterval);
  }, [banners.length]);

  useEffect(() => {
    const suggestedPrompt = sessionStorage.getItem('silo_prompt_suggestion');
    if (suggestedPrompt) {
        setPrompt(suggestedPrompt);
        sessionStorage.removeItem('silo_prompt_suggestion');
        textareaRef.current?.focus();
        textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  const handleCaptureClick = async () => {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Wait for the next frame to be painted
                requestAnimationFrame(() => {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    setScreenshot(dataUrl);
                    stream.getTracks().forEach(track => track.stop());
                });
            } else {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    } catch (err) {
        console.error("Error capturing screen:", err);
        // Optionally, inform the user that permission was denied or an error occurred.
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStartBuild(prompt, defaultStack, screenshot);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    onStartBuild(suggestion, defaultStack, null);
  };

  return (
    <div className="relative flex flex-col items-center justify-between h-full p-8 text-center bg-white">
      <div className="relative z-10 flex flex-col items-center justify-center w-full pt-20 md:pt-16 flex-grow">
        <div className="w-full max-w-4xl mx-auto mb-8 h-24">
            <div className="relative w-full h-full overflow-hidden rounded-2xl">
                {banners.map((banner, index) => (
                    <div
                        key={banner.id}
                        className="absolute w-full h-full transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(${(index - currentBannerIndex) * 100}%)` }}
                    >
                        <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 w-full h-full">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 bg-white rounded-xl p-2 flex items-center justify-center shadow flex-shrink-0">
                                    {banner.icon}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-black text-left">{banner.title}</h3>
                                    {banner.description && (
                                        <p className="text-sm text-gray-600 text-left">{banner.description}</p>
                                    )}
                                </div>
                            </div>
                            {banner.linkLabel && (
                                <div className="flex-shrink-0">
                                    <div className="bg-white rounded-xl p-1 shadow-inner">
                                        <a href={banner.link} className="block px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap">
                                            {banner.linkLabel}
                                        </a>
                                    </div>
                                </div>
                            )}
                            {banner.badgeHtml && (
                                <div className="flex-shrink-0" dangerouslySetInnerHTML={{ __html: banner.badgeHtml }} />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-black">
          Build anything with Silo
        </h1>
        <p className="text-gray-600 text-lg mb-8 max-w-2xl">
          Create apps and websites by chatting with AI.
        </p>
        
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mb-6">
          <div className="relative w-full bg-white border border-gray-300 rounded-2xl shadow-lg p-2">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., a real-time crypto price tracker with a dark theme"
              className="w-full p-3 pr-16 bg-transparent text-black placeholder-gray-500 focus:outline-none transition-all text-lg resize-none"
              rows={4}
              disabled={isLoading}
            />
             {screenshot && (
              <div className="absolute top-3 left-3 group">
                <img src={screenshot} alt="Screenshot preview" className="w-20 h-auto rounded-lg border-2 border-blue-500" />
                <button
                  type="button"
                  onClick={() => setScreenshot(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove screenshot"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            )}
            <div className="absolute bottom-4 left-4 flex items-center">
                 <button
                    type="button"
                    onClick={handleCaptureClick}
                    disabled={isLoading}
                    className="p-2 bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                    aria-label="Capture screenshot"
                    title="Capture Screenshot"
                >
                    <span className="material-symbols-outlined">photo_camera</span>
                </button>
            </div>
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