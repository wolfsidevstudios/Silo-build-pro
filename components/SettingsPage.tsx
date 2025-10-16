
import React, { useState, useEffect } from 'react';
import type { GeminiModel, SupabaseConfig, PreviewMode } from '../App';

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const NETLIFY_TOKEN_STORAGE_KEY = 'silo_netlify_token';
const VERCEL_TOKEN_STORAGE_KEY = 'silo_vercel_token';
const GITHUB_TOKEN_STORAGE_KEY = 'silo_github_token';
const EXPO_TOKEN_STORAGE_KEY = 'silo_expo_token';

type SettingsTab = 'general' | 'deployments' | 'integrations' | 'appstore';

const SettingsCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-5xl h-[75vh] min-h-[600px] bg-zinc-900/50 backdrop-blur-xl border border-gray-700 rounded-3xl flex overflow-hidden shadow-2xl shadow-black/30">
            {children}
        </div>
    </div>
);

const SettingsSidebar: React.FC<{ activeTab: SettingsTab; onTabChange: (tab: SettingsTab) => void }> = ({ activeTab, onTabChange }) => {
    const NavItem: React.FC<{ tab: SettingsTab; icon: string; label: string }> = ({ tab, icon, label }) => (
        <button
            onClick={() => onTabChange(tab)}
            className={`flex items-center space-x-3 w-full text-left p-3 rounded-xl transition-all duration-200 ${
                activeTab === tab
                    ? 'bg-white/10 text-white font-semibold'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
        >
            <span className="material-symbols-outlined">{icon}</span>
            <span>{label}</span>
        </button>
    );

    return (
        <nav className="w-64 bg-black/30 p-4 border-r border-gray-800 flex flex-col">
            <div className="text-left mb-10 p-2">
                <h2 className="text-2xl font-bold text-gray-200">Settings</h2>
                <p className="text-sm text-gray-500">Manage your workspace</p>
            </div>
            <div className="space-y-2">
                <NavItem tab="general" icon="tune" label="General" />
                <NavItem tab="deployments" icon="dns" label="Deployments" />
                <NavItem tab="integrations" icon="integration_instructions" label="Integrations" />
                <NavItem tab="appstore" icon="storefront" label="App Store" />
            </div>
        </nav>
    );
};

const SettingsContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex-1 p-8 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto space-y-10">
            {children}
        </div>
    </div>
);

const SettingSection: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ title, description, children }) => (
    <div>
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
        {children}
    </div>
);

const TokenInput: React.FC<{
    id: string;
    label: string;
    placeholder: string;
    storageKey: string;
    helpText: string;
}> = ({ id, label, placeholder, storageKey, helpText }) => {
    const [token, setToken] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    useEffect(() => {
        const savedToken = localStorage.getItem(storageKey);
        if (savedToken) setToken(savedToken);
    }, [storageKey]);

    const handleSave = () => {
        try {
            localStorage.setItem(storageKey, token);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error(`Failed to save token for ${label}:`, error);
            setSaveStatus('error');
        }
    };

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-2">
                {label}
            </label>
            <div className="relative w-full">
                <input
                    id={id}
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={placeholder}
                    className="w-full p-3 pl-5 pr-28 bg-zinc-900 border border-gray-700 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                    onClick={handleSave}
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 px-6 py-1.5 bg-white text-black rounded-full font-semibold hover:bg-gray-200 transition-colors"
                >
                    {saveStatus === 'saved' ? 'Saved!' : 'Save'}
                </button>
            </div>
            {saveStatus === 'error' && <p className="text-red-400 text-sm mt-2 text-center">Failed to save token.</p>}
            <p className="text-xs text-gray-500 mt-3">{helpText}</p>
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
        <div className="bg-zinc-900 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
            <div>
                <p className="font-semibold text-green-400">Connected</p>
                <p className="text-xs text-gray-500">Project: {supabaseConfig.projectRef}</p>
            </div>
            <button onClick={onSupabaseDisconnect} className="px-4 py-1.5 bg-red-600/80 text-white rounded-full text-xs font-semibold hover:bg-red-600 transition-colors">
                Disconnect
            </button>
        </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-gray-700 rounded-lg p-4">
        <p className="text-center text-sm text-gray-400 mb-4">Connect your Supabase account to enable backend features.</p>
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
              <label htmlFor="supabase-url" className="block text-xs font-medium text-gray-400 mb-1">Project URL</label>
              <input id="supabase-url" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-project-ref.supabase.co" className="w-full p-2 bg-zinc-800 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
             <div>
              <label htmlFor="supabase-key" className="block text-xs font-medium text-gray-400 mb-1">Anon (Public) Key</label>
              <input id="supabase-key" type="text" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} placeholder="ey..." className="w-full p-2 bg-zinc-800 border border-gray-600 rounded-lg text-white text-sm" />
            </div>
             <button
              onClick={handleManualSubmit}
              disabled={!url.trim() || !anonKey.trim() || isLoading}
              className="w-full py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
            >
              {isLoading ? 'Connecting...' : 'Connect'}
            </button>
           </div>
        )}
      </div>
  );
};

export const SettingsPage: React.FC<SettingsPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    return (
        <SettingsCard>
            <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
            <SettingsContent>
                {activeTab === 'general' && (
                    <>
                        <SettingSection title="Gemini API Key" description="Your API key is stored securely in your browser's local storage and is never sent to our servers.">
                            <TokenInput
                                id="gemini-api-key"
                                label=""
                                placeholder="Enter your Gemini API Key"
                                storageKey={API_KEY_STORAGE_KEY}
                                helpText=""
                            />
                        </SettingSection>
                        <SettingSection title="Model Selection" description="Flash is faster and great for simple tasks. Pro is more powerful for complex requests.">
                            <div className="flex items-center space-x-2 bg-zinc-900 border border-gray-700 rounded-full p-1">
                                <button
                                    onClick={() => props.onModelChange('gemini-2.5-flash')}
                                    className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${props.selectedModel === 'gemini-2.5-flash' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'}`}
                                >
                                    Flash
                                </button>
                                <button
                                    onClick={() => props.onModelChange('gemini-2.5-pro')}
                                    className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${props.selectedModel === 'gemini-2.5-pro' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'}`}
                                >
                                    Pro
                                </button>
                            </div>
                        </SettingSection>
                        <SettingSection title="Preview Mode" description="Iframe mode is sandboxed and secure. Service Worker mode offers faster reloads.">
                            <div className="flex items-center space-x-2 bg-zinc-900 border border-gray-700 rounded-full p-1">
                                <button
                                    onClick={() => props.onPreviewModeChange('iframe')}
                                    className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${props.previewMode === 'iframe' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'}`}
                                >
                                    Iframe (Secure)
                                </button>
                                <button
                                    onClick={() => props.onPreviewModeChange('service-worker')}
                                    className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors ${props.previewMode === 'service-worker' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'}`}
                                >
                                    Service Worker
                                </button>
                            </div>
                        </SettingSection>
                    </>
                )}
                {activeTab === 'deployments' && (
                    <>
                        <SettingSection title="Netlify" description="Required for publishing your projects to Netlify. Your token is stored in local storage.">
                           <TokenInput id="netlify-token" label="Netlify Personal Access Token" placeholder="Enter your Netlify token" storageKey={NETLIFY_TOKEN_STORAGE_KEY} helpText="" />
                        </SettingSection>
                        <SettingSection title="Vercel" description="Required for publishing your projects to Vercel. Your token is stored in local storage.">
                            <TokenInput id="vercel-token" label="Vercel Access Token" placeholder="Enter your Vercel token" storageKey={VERCEL_TOKEN_STORAGE_KEY} helpText="" />
                        </SettingSection>
                    </>
                )}
                 {activeTab === 'integrations' && (
                    <>
                        <SettingSection title="GitHub" description="Required to save projects to GitHub. Create a token with `repo` scope. Your token is stored in local storage.">
                           <TokenInput id="github-token" label="GitHub Personal Access Token" placeholder="Enter your GitHub PAT" storageKey={GITHUB_TOKEN_STORAGE_KEY} helpText="" />
                        </SettingSection>
                         <SettingSection title="Supabase" description="Connect your Supabase account to enable backend features for all projects.">
                            <SupabaseSettings {...props} />
                        </SettingSection>
                    </>
                )}
                 {activeTab === 'appstore' && (
                    <>
                        <SettingSection title="App Store Publishing" description="Configure your Expo account to enable publishing to the Apple App Store.">
                           <TokenInput 
                                id="expo-token" 
                                label="Expo Access Token" 
                                placeholder="Enter your Expo token" 
                                storageKey={EXPO_TOKEN_STORAGE_KEY}
                                helpText="This token is used by the Expo Application Services (EAS) CLI to authenticate you."
                            />
                        </SettingSection>
                    </>
                )}
            </SettingsContent>
        </SettingsCard>
    );
};
