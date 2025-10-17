import React from 'react';

export const PricingPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center pt-20">
      <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-12 shadow-xl max-w-2xl">
        <h1 className="text-5xl font-bold text-black mb-4">
          Completely Free.
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          Silo Build is free to use for everyone. Just bring your own Gemini API key and start building without limits. You only pay for what you use on the underlying services.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#/settings"
            className="w-full sm:w-auto px-8 py-3 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors"
          >
            Add Your API Key
          </a>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3 bg-transparent border-2 border-black text-black rounded-full font-semibold hover:bg-black hover:text-white transition-colors"
          >
            Get a Gemini Key
          </a>
        </div>
      </div>
    </div>
  );
};
