import React from 'react';

export const DocsPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center pt-20">
      <div className="max-w-3xl">
        <h1 className="text-5xl font-bold text-black mb-4">
          Documentation
        </h1>
        <p className="text-lg text-gray-700 mb-12">
          Our documentation is currently under construction. Here's a quick guide to get you started.
        </p>
        
        <div className="text-left space-y-8 bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-8 shadow-xl">
          <div>
            <h2 className="text-2xl font-semibold text-black mb-2">1. Get Your API Key</h2>
            <p className="text-gray-600">
              Silo Build uses the Google Gemini API to generate code. You'll need your own API key to use the app. You can get one for free from Google AI Studio.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-blue-600 font-semibold hover:underline"
            >
              Get a Gemini API Key &rarr;
            </a>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-black mb-2">2. Add Key to Settings</h2>
            <p className="text-gray-600">
              Navigate to the Settings page in Silo Build, find the "Gemini API Key" section, paste your key, and click save. The app will securely store it in your browser.
            </p>
             <a
              href="#/settings"
              className="mt-3 inline-block text-blue-600 font-semibold hover:underline"
            >
              Go to Settings &rarr;
            </a>
          </div>
           <div>
            <h2 className="text-2xl font-semibold text-black mb-2">3. Start Building</h2>
            <p className="text-gray-600">
              That's it! Go back to the Home page and describe the app or website you want to build. The AI will take care of the rest.
            </p>
             <a
              href="#/home"
              className="mt-3 inline-block text-blue-600 font-semibold hover:underline"
            >
              Start Building Now &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
