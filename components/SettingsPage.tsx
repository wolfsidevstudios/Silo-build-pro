import React, { useState, useEffect } from 'react';
import type { GeminiModel } from '../App';

const API_KEY_STORAGE_KEY = 'gemini_api_key';

interface SettingsPageProps {
  selectedModel: GeminiModel;
  onModelChange: (model: GeminiModel) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ selectedModel, onModelChange }) => {
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

      <div className="w-full max-w-md space-y-8">
        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-400 mb-2">
            Gemini API Key
          </label>
          <div className="relative w-full">
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Gemini API Key"
              className="w-full p-3 pl-5 pr-28 bg-zinc-900 border border-gray-700 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <button
              onClick={handleSave}
              className="absolute top-1/2 right-2 transform -translate-y-1/2 px-6 py-1.5 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
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
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Model Selection
          </label>
          <div className="flex items-center space-x-2 bg-zinc-900 border border-gray-700 rounded-full p-1">
            <button
              onClick={() => onModelChange('gemini-2.5-flash')}
              className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedModel === 'gemini-2.5-flash'
                  ? 'bg-white text-black'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}
            >
              Flash
            </button>
            <button
              onClick={() => onModelChange('gemini-2.5-pro')}
              className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedModel === 'gemini-2.5-pro'
                  ? 'bg-white text-black'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}
            >
              Pro
            </button>
          </div>
           <p className="text-xs text-gray-500 mt-3 text-center">
            Flash is faster and great for simple tasks. Pro is more powerful for complex requests.
          </p>
        </div>
      </div>
    </div>
  );
};