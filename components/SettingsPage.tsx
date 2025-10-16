

import React, { useState, useEffect } from 'react';
import type { GeminiModel, SupabaseConfig, PreviewMode } from '../App';

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const NETLIFY_TOKEN_STORAGE_KEY = 'silo_netlify_token';
const VERCEL_TOKEN_STORAGE_KEY = 'silo_vercel_token';


const NetlifySettings: React.FC = () => {
    const [token, setToken] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    useEffect(() => {
        const savedToken = localStorage.getItem(NETLIFY_TOKEN_STORAGE_KEY);
        if (savedToken) {
            setToken(savedToken);
        }
    }, []);

    const handleSave = () => {
        try {
            localStorage.setItem(NETLIFY_TOKEN_STORAGE_KEY, token);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save Netlify token:", error);
            setSaveStatus('error');
        }
    };

    return (
        <div>
            <label htmlFor="netlify-token" className="block text-sm font-medium text-gray-400 mb-2">
                Netlify Personal Access Token
            </label>
            <div className="relative w-full">
                <input
                    id="netlify-token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter your Netlify token"
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
                <p className="text-green-400 text-sm mt-2 text-center">Netlify Token saved!</p>
            )}
            {saveStatus === 'error' && (
                <p className="text-red-400 text-sm mt-2 text-center">Failed to save token.</p>
            )}
            <p className="text-xs text-gray-500 mt-3">
                Required for publishing your projects. Your token is stored in local storage.
            </p>
        </div>
    );
};

const VercelSettings: React.FC = () => {
    const [token, setToken] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    useEffect(() => {
        const savedToken = localStorage.getItem(VERCEL_TOKEN_STORAGE_KEY);
        if (savedToken) {
            setToken(savedToken);
        }
    }, []);

    const handleSave = () => {
        try {
            localStorage.setItem(VERCEL_TOKEN_STORAGE_KEY, token);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save Vercel token:", error);
            setSaveStatus('error');
        }
    };

    return (
        <div>
            <label htmlFor="vercel-token" className="block text-sm font-medium text-gray-400 mb-2">
                Vercel Access Token
            </label>
            <div className="relative w-full">
                <input
                    id="vercel-token"
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter your Vercel token"
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
                <p className="text-green-400 text-sm mt-2 text-center">Vercel Token saved!</p>
            )}
            {saveStatus === 'error' && (
                <p className="text-red-400 text-sm mt-2 text-center">Failed to save token.</p>
            )}
            <p className="text-xs text-gray-500 mt-3">
                Required for publishing your projects. Your token is stored in local storage.
            </p>
        </div>
    );
};


interface SettingsPageProps {
  selectedModel: GeminiModel;
  onModelChange: (model: GeminiModel) => void;
  supabaseConfig: SupabaseConfig | null;
  onSupabaseAuthorize: () => void;
  onSupabaseManualConnect: (url: string, anonKey: string) => void;
  onSupabaseDisconnect: () => void;
  isLoading: boolean;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
}

const SupabaseSettings: React.FC<Omit<SettingsPageProps, 'selectedModel' | 'onModelChange' | 'previewMode' | 'onPreviewModeChange'>> = ({
  supabaseConfig,
  onSupabaseAuthorize,
  onSupabaseManualConnect,
  onSupabaseDisconnect,
  isLoading,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [activeTab, setActiveTab] = useState<'auto' | 'manual'>('auto');
  
  const handleManualSubmit = () => {
    if (url.trim() && anonKey.trim()) {
      onSupabaseManualConnect(url.trim(), anonKey.trim());
    }
  };

  if (supabaseConfig) {
    return (
       <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Supabase Connection
        </label>
        <div className="bg-zinc-900 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
            <div>
                <p className="font-semibold text-green-400">Connected</p>
                <p className="text-xs text-gray-500">Project: {supabaseConfig.projectRef}</p>
            </div>
            <button onClick={onSupabaseDisconnect} className="px-4 py-1.5 bg-red-600/80 text-white rounded-full text-xs font-semibold hover:bg-red-600 transition-colors">
                Disconnect
            </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-400 mb-2">
        Supabase Connection
      </label>
      <div className="bg-zinc-900 border border-gray-700 rounded-lg p-4">
        <p className="text-center text-sm text-gray-400 mb-4">Connect your Supabase account to enable backend features for all projects.</p>
        <div className="flex justify-center mb-4">
          <div className="flex items-center space-x-1 bg-black border border-gray-600 rounded-full p-1">
            <button
              onClick={() => setActiveTab('auto')}
              className={`w-28 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'auto' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'
              }`}
            >
              Authorize
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`w-28 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeTab === 'manual' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'
              }`}
            >
              Manual
            </button>
          </div>
        </div>
        
        {activeTab === 'auto' && (
           <div className="text-center p-4 bg-zinc-800/50 rounded-lg">
             <h3 className="text-md font-semibold mb-1">Authorize with Supabase</h3>
             <p className="text-gray-500 mb-4 text-xs">
                The recommended and most secure method.
             </p>
             <button
                onClick={onSupabaseAuthorize}
                className="w-full max-w-xs mx-auto py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
              >
                Connect with Supabase
             </button>
           </div>
        )}

        {activeTab === 'manual' && (
           <div className="space-y-4">
             <div>
              <label htmlFor="supabase-url" className="block text-xs font-medium text-gray-400 mb-1">
                Project URL
              </label>
              <input
                id="supabase-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-project-ref.supabase.co"
                className="w-full p-2 bg-zinc-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
              />
            </div>
             <div>
              <label htmlFor="supabase-key" className="block text-xs font-medium text-gray-400 mb-1">
                Anon (Public) Key
              </label>
              <input
                id="supabase-key"
                type="text"
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="ey..."
                className="w-full p-2 bg-zinc-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 text-sm"
              />
            </div>
             <button
              onClick={handleManualSubmit}
              disabled={!url.trim() || !anonKey.trim() || isLoading}
              className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
           </div>
        )}
      </div>
    </div>
  );
};


export const SettingsPage: React.FC<SettingsPageProps> = (props) => {
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
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error("Failed to save API key:", error);
      setSaveStatus('error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 overflow-y-auto">
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
              onClick={() => props.onModelChange('gemini-2.5-flash')}
              className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${
                props.selectedModel === 'gemini-2.5-flash'
                  ? 'bg-white text-black'
                  : 'text-gray-300 hover:bg-zinc-800'
              }`}
            >
              Flash
            </button>
            <button
              onClick={() => props.onModelChange('gemini-2.5-pro')}
              className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${
                props.selectedModel === 'gemini-2.5-pro'
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

        <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
                Preview Mode
            </label>
            <div className="flex items-center space-x-2 bg-zinc-900 border border-gray-700 rounded-full p-1">
                <button
                onClick={() => props.onPreviewModeChange('iframe')}
                className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${
                    props.previewMode === 'iframe'
                    ? 'bg-white text-black'
                    : 'text-gray-300 hover:bg-zinc-800'
                }`}
                >
                Iframe (Secure)
                </button>
                <button
                onClick={() => props.onPreviewModeChange('service-worker')}
                className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${
                    props.previewMode === 'service-worker'
                    ? 'bg-white text-black'
                    : 'text-gray-300 hover:bg-zinc-800'
                }`}
                >
                Service Worker
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
                Iframe mode is sandboxed and secure. Service Worker mode offers faster reloads.
            </p>
        </div>
        <div className="border-t border-gray-800 my-4"></div>
        <NetlifySettings />
        <VercelSettings />
        <SupabaseSettings {...props} />
      </div>
    </div>
  );
};
