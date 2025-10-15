import React, { useState, useEffect } from 'react';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000); // Hide message after 2 seconds
    } catch (error) {
      console.error("Failed to save API key:", error);
      setSaveStatus('error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="text-center mb-12">
        <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">
          settings
        </span>
        <h1 className="text-4xl font-bold text-gray-300">Settings</h1>
        <p className="text-gray-500 mt-2">Manage your application settings.</p>
      </div>

      <div className="w-full max-w-md">
        <label htmlFor="api-key" className="block text-sm font-medium text-gray-400 mb-2">
          Gemini API Key
        </label>
        <div className="flex items-center gap-3">
          <input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API Key"
            className="flex-grow p-3 bg-zinc-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          <button
            onClick={handleSave}
            className="px-6 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Save
          </button>
        </div>
        {saveStatus === 'saved' && (
          <p className="text-green-400 text-sm mt-2 text-center">API Key saved successfully!</p>
        )}
         {saveStatus === 'error' && (
          <p className="text-red-400 text-sm mt-2 text-center">Failed to save API Key.</p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Your API key is stored securely in your browser's local storage and is never sent to our servers.
        </p>
      </div>
    </div>
  );
};
