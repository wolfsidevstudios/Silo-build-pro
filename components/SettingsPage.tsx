import React, { useState, useEffect } from 'react';
import type { GeminiModel, SupabaseConfig, PreviewMode } from '../App';

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const NETLIFY_TOKEN_STORAGE_KEY = 'silo_netlify_token';
const VERCEL_TOKEN_STORAGE_KEY = 'silo_vercel_token';
const GITHUB_TOKEN_STORAGE_KEY = 'silo_github_token';
const EXPO_TOKEN_STORAGE_KEY = 'silo_expo_token';
const FIREBASE_CONFIG_STORAGE_KEY = 'silo_firebase_config';

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
    helpLink?: { href: string; text: string };
}> = ({ id, label, placeholder, storageKey, helpText, helpLink }) => {
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
            <p className="text-xs text-gray-500 mt-3">
                {helpText}
                {helpLink && (
                    <a href={helpLink.href} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-400 hover:text-blue-300 hover:underline">
                        {helpLink.text}
                    </a>
                )}
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
  isFirebaseInitialized: boolean;
  onFirebaseConfigChange: () => void;
}

const SupabaseSettings: React.FC<Omit<SettingsPageProps, 'selectedModel' | 'onModelChange' | 'previewMode' | 'onPreviewModeChange' | 'isFirebaseInitialized' | 'onFirebaseConfigChange'>> = ({
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

// FIX: Destructure props to correctly access `isFirebaseInitialized` and `onConfigChange`.
const FirebaseSettings: React.FC<{ isFirebaseInitialized: boolean; onConfigChange: () => void }> = ({ isFirebaseInitialized, onConfigChange }) => {
    const [config, setConfig] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    useEffect(() => {
        const savedConfig = localStorage.getItem(FIREBASE_CONFIG_STORAGE_KEY);
        if (savedConfig) {
            try {
                // Pretty-print for display
                setConfig(JSON.stringify(JSON.parse(savedConfig), null, 2));
            } catch {
                setConfig(savedConfig);
            }
        }
    }, []);

    const handleSave = () => {
        try {
            // Validate and minify before saving
            const parsedConfig = JSON.parse(config);
            localStorage.setItem(FIREBASE_CONFIG_STORAGE_KEY, JSON.stringify(parsedConfig));
            onConfigChange();
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error("Failed to save Firebase config:", error);
            setSaveStatus('error');
        }
    };

    return (
        <div className="bg-zinc-900 border border-gray-700 rounded-lg p-4">
             <div className="flex items-center justify-between mb-4">
                 <p className="text-sm">Status: 
                     <span className={isFirebaseInitialized ? 'text-green-400' : 'text-yellow-400'}>
                         {isFirebaseInitialized ? ' Connected' : ' Not Connected'}
                     </span>
                 </p>
                 <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline">
                     Go to Firebase Console
                 </a>
            </div>
            <label htmlFor="firebase-config" className="block text-sm font-medium text-gray-400 mb-2">
                Firebase Web App Config (JSON)
            </label>
            <textarea
                id="firebase-config"
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                placeholder='{\n  "apiKey": "...",\n  "authDomain": "...",\n  ...\n}'
                rows={8}
                className="w-full p-3 bg-zinc-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
             <button
                onClick={handleSave}
                className="mt-3 w-full py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
            >
                {saveStatus === 'saved' ? 'Saved!' : 'Save Config'}
            </button>
             {saveStatus === 'error' && <p className="text-red-400 text-sm mt-2 text-center">Invalid JSON. Please check your config.</p>}
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
                                helpText="Required for all AI code generation features."
                                helpLink={{ href: 'https://aistudio.google.com/app/apikey', text: 'Get your key' }}
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
                        <SettingSection title="Netlify" description="Publish your projects to Netlify. Your token is stored in local storage.">
                           <TokenInput 
                                id="netlify-token" 
                                label="Netlify Personal Access Token" 
                                placeholder="Enter your Netlify token" 
                                storageKey={NETLIFY_TOKEN_STORAGE_KEY} 
                                helpText=""
                                helpLink={{ href: 'https://app.netlify.com/user/applications#personal-access-tokens', text: 'Create a token' }}
                           />
                        </SettingSection>
                        <SettingSection title="Vercel" description="Publish your projects to Vercel. Your token is stored in local storage.">
                            <TokenInput 
                                id="vercel-token" 
                                label="Vercel Access Token" 
                                placeholder="Enter your Vercel token" 
                                storageKey={VERCEL_TOKEN_STORAGE_KEY} 
                                helpText="" 
                                helpLink={{ href: 'https://vercel.com/account/tokens', text: 'Create a token' }}
                            />
                        </SettingSection>
                    </>
                )}
                 {activeTab === 'integrations' && (
                    <>
                        <SettingSection title="GitHub" description="Save projects to GitHub. Create a classic token with `repo` scope.">
                           <TokenInput 
                                id="github-token" 
                                label="GitHub Personal Access Token" 
                                placeholder="Enter your GitHub PAT" 
                                storageKey={GITHUB_TOKEN_STORAGE_KEY} 
                                helpText=""
                                helpLink={{ href: 'https://github.com/settings/tokens/new?scopes=repo&description=Silo%20Build%20Access', text: 'Create a token' }}
                           />
                        </SettingSection>
                         <SettingSection title="Supabase" description="Connect your Supabase account to enable backend features for all projects.">
                            <SupabaseSettings {...props} />
                        </SettingSection>
                         <SettingSection title="Firebase" description="Connect your Firebase project to enable one-click App Store submissions.">
                            <FirebaseSettings isFirebaseInitialized={props.isFirebaseInitialized} onConfigChange={props.onFirebaseConfigChange} />
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
                                helpText="This token authenticates you with Expo Application Services (EAS)."
                                helpLink={{ href: 'https://expo.dev/settings/access-tokens', text: 'Create a token' }}
                            />
                        </SettingSection>
                    </>
                )}
            </SettingsContent>
        </SettingsCard>
    );
};