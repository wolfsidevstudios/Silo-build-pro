import React, { useState, useEffect } from 'react';

const slides = [
  {
    icon: 'thought_bubble',
    title: 'From Idea to Reality',
    description: 'Describe your application in plain English, and watch as our AI architect plans and builds it for you.',
  },
  {
    icon: 'preview',
    title: 'Real-Time Previews',
    description: 'See your application come to life instantly. Every line of code generated is rendered live for immediate feedback.',
  },
  {
    icon: 'dns',
    title: 'One-Click Deployment',
    description: 'Publish your finished project to Netlify or Vercel directly from the workspace. Go from concept to live in minutes.',
  },
  {
    icon: 'hub',
    title: 'Powerful Integrations',
    description: 'Connect to services like Supabase, Neon, Stripe, and more. Build data-driven, feature-rich applications with ease.',
  },
];

export const FeatureSlideshow: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => (prevIndex + 1) % slides.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full bg-white flex flex-col items-center justify-center p-8 text-center overflow-hidden">
      <div className="relative w-full h-48 flex items-center justify-center">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute transition-opacity duration-1000 ease-in-out ${
              index === activeIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <span className="material-symbols-outlined text-6xl text-blue-500">
              {slide.icon}
            </span>
            <h2 className="text-3xl font-bold text-gray-800 mt-4">{slide.title}</h2>
            <p className="text-gray-600 mt-2 max-w-md mx-auto">{slide.description}</p>
          </div>
        ))}
      </div>
      <div className="flex-grow"></div>
      <p className="text-sm text-gray-500 mb-4">AI is building your project in the background...</p>
      <div className="flex space-x-2">
        {slides.map((_, index) => (
          <div
            key={index}
            className="h-1 rounded-full transition-all duration-[5000ms] linear"
            style={{ 
              width: index === activeIndex ? '2rem' : '0.5rem',
              backgroundColor: index === activeIndex ? '#3b82f6' : '#d1d5db'
             }}
          />
        ))}
      </div>
    </div>
  );
};
