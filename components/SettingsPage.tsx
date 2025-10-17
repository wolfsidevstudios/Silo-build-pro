import React, { useState, useEffect, useRef } from 'react';
import type { GeminiModel, SupabaseConfig, PreviewMode, ApiSecret, ProjectType } from '../App';

const API_KEY_STORAGE_KEY = 'gemini_api_key';
const NETLIFY_TOKEN_STORAGE_KEY = 'silo_netlify_token';
const VERCEL_TOKEN_STORAGE_KEY = 'silo_vercel_token';
const GITHUB_TOKEN_STORAGE_KEY = 'silo_github_token';
const EXPO_TOKEN_STORAGE_KEY = 'silo_expo_token';

type SettingsTab = 'general' | 'appearance' | 'deployments' | 'developer' | 'appstore' | 'safety' | 'about';

const SettingsCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="flex h-full items-center justify-center p-8">
        <div className="w-full max-w-5xl h-[75vh] min-h-[600px] bg-black border border-gray-800 rounded-3xl flex overflow-hidden shadow-2xl shadow-black/30">
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
                <NavItem tab="appearance" icon="palette" label="Appearance" />
                <NavItem tab="deployments" icon="dns" label="Deployments" />
                <NavItem tab="developer" icon="terminal" label="Developer" />
                <NavItem tab="appstore" icon="storefront" label="App Store" />
                <NavItem tab="safety" icon="shield" label="Safety" />
                <NavItem tab="about" icon="info" label="About" />
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
  defaultStack: ProjectType;
  onDefaultStackChange: (stack: ProjectType) => void;
  supabaseConfig: SupabaseConfig | null;
  onSupabaseAuthorize: () => void;
  onSupabaseManualConnect: (url: string, anonKey: string) => void;
  onSupabaseDisconnect: () => void;
  isLoading: boolean;
  previewMode: PreviewMode;
  onPreviewModeChange: (mode: PreviewMode) => void;
  apiSecrets: ApiSecret[];
  onApiSecretsChange: (secrets: ApiSecret[]) => void;
}

const ApiSecretsSettings: React.FC<{
    apiSecrets: ApiSecret[];
    onApiSecretsChange: (secrets: ApiSecret[]) => void;
}> = ({ apiSecrets, onApiSecretsChange }) => {
    const [newKey, setNewKey] = useState('');
    const [newValue, setNewValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleAdd = () => {
        setError(null);
        if (!newKey.trim() || !newValue.trim()) {
            setError('Both key and value are required.');
            return;
        }
        if (!/^[A-Z_][A-Z0-9_]*$/.test(newKey.trim())) {
            setError('Key should be in SCREAMING_SNAKE_CASE format (e.g., MY_API_KEY).');
            return;
        }
        if (apiSecrets.some(s => s.key === newKey.trim())) {
            setError('A secret with this key already exists.');
            return;
        }
        onApiSecretsChange([...apiSecrets, { key: newKey.trim(), value: newValue.trim() }]);
        setNewKey('');
        setNewValue('');
    };

    const handleDelete = (keyToDelete: string) => {
        onApiSecretsChange(apiSecrets.filter(s => s.key !== keyToDelete));
    };

    const maskValue = (value: string) => {
        if (value.length <= 8) return '••••••••';
        return `${value.substring(0, 4)}••••${value.substring(value.length - 4)}`;
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {apiSecrets.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4">No secrets added yet.</p>
                )}
                {apiSecrets.map(secret => (
                    <div key={secret.key} className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-lg text-sm">
                        <div className="font-mono flex-1 truncate">
                            <span className="text-gray-400">{secret.key}</span>
                            <span className="text-gray-600 mx-2">=</span>
                            <span className="text-gray-300">{maskValue(secret.value)}</span>
                        </div>
                        <button onClick={() => handleDelete(secret.key)} className="p-1 rounded-full text-red-500 hover:bg-red-900/50" aria-label={`Delete ${secret.key}`}>
                            <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                    </div>
                ))}
            </div>
            
            <div className="bg-zinc-800/50 p-3 rounded-lg border border-gray-700 space-y-3">
                <div className="flex space-x-2">
                    <input
                        type="text"
                        value={newKey}
                        onChange={e => setNewKey(e.target.value)}
                        placeholder="SECRET_NAME"
                        className="w-1/2 p-2 bg-zinc-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                        type="password"
                        value={newValue}
                        onChange={e => setNewValue(e.target.value)}
                        placeholder="Secret Value"
                        className="w-1/2 p-2 bg-zinc-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                </div>
                {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                <button
                    onClick={handleAdd}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-sm"
                >
                    Add Secret
                </button>
            </div>
        </div>
    );
};

export const SettingsPage: React.FC<SettingsPageProps> = (props) => {
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [editorFontSize, setEditorFontSize] = useState(() => localStorage.getItem('silo_editor_font_size') || '14');
    const importFileInputRef = useRef<HTMLInputElement>(null);

    const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const size = e.target.value;
        setEditorFontSize(size);
        localStorage.setItem('silo_editor_font_size', size);
        // Note: Applying this would require a way to communicate the change to the CodeEditor instances.
        // For now, it's saved and will apply on next reload.
    };

    const handleExportData = () => {
        try {
            const keysToBackup = [
                'silo_projects', 'silo_supabase_config', 'silo_api_secrets',
                'gemini_api_key', 'silo_netlify_token', 'silo_vercel_token', 'silo_github_token',
                'gemini_model', 'silo_preview_mode', 'silo_editor_font_size', 'silo_product_hunt_token',
                'silo_default_stack'
            ];
            const backupData: { [key: string]: any } = { version: 1 };
            keysToBackup.forEach(key => {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    try {
                        backupData[key] = JSON.parse(value);
                    } catch {
                        backupData[key] = value;
                    }
                }
            });
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            a.download = `silo-build-backup-${timestamp}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to export data:", error);
            alert("An error occurred while exporting your data.");
        }
    };
    
    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File is not readable.");
                const data = JSON.parse(text);

                if (!data.silo_projects || !Array.isArray(data.silo_projects)) {
                    throw new Error("Invalid backup file: 'silo_projects' key is missing or not an array.");
                }

                if (window.confirm("This will overwrite all current projects and settings. Are you sure you want to proceed?")) {
                    Object.keys(data).forEach(key => {
                        const value = data[key];
                        localStorage.setItem(key, typeof value === 'object' ? JSON.stringify(value) : value);
                    });
                    alert("Import successful! The application will now reload.");
                    window.location.reload();
                }
            } catch (error: any) {
                alert(`Import failed: ${error.message}`);
            } finally {
                if (event.target) event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleClearData = () => {
        if (window.confirm("DANGER: This will permanently delete ALL projects, settings, and API keys from your browser. This action cannot be undone. Are you absolutely sure?")) {
            localStorage.clear();
            alert("All data has been cleared. The application will now reload.");
            window.location.reload();
        }
    };

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
                         <SettingSection title="Default Stack Mode" description="Choose the default project type for new builds.">
                            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 bg-zinc-900 border border-gray-700 rounded-full p-1">
                                <button
                                    onClick={() => props.onDefaultStackChange('html')}
                                    className={`w-full sm:w-1/3 py-2 rounded-full text-sm font-semibold transition-colors ${props.defaultStack === 'html' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'}`}
                                >
                                    HTML/JS
                                </button>
                                <button
                                    onClick={() => props.onDefaultStackChange('single')}
                                    className={`w-full sm:w-1/3 py-2 rounded-full text-sm font-semibold transition-colors ${props.defaultStack === 'single' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'}`}
                                >
                                    React (Single)
                                </button>
                                 <button
                                    onClick={() => props.onDefaultStackChange('multi')}
                                    className={`w-full sm:w-1/3 py-2 rounded-full text-sm font-semibold transition-colors ${props.defaultStack === 'multi' ? 'bg-white text-black' : 'text-gray-300 hover:bg-zinc-800'}`}
                                >
                                    React (Multi)
                                </button>
                            </div>
                        </SettingSection>
                    </>
                )}
                {activeTab === 'appearance' && (
                     <>
                        <SettingSection title="Theme" description="Choose the look and feel of the interface.">
                             <div className="flex items-center space-x-2 bg-zinc-900 border border-gray-700 rounded-full p-1">
                                <button
                                    disabled
                                    className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors text-gray-500 cursor-not-allowed`}
                                >
                                    Light
                                </button>
                                <button
                                    className={`w-1/2 py-2 rounded-full text-sm font-semibold transition-colors bg-white text-black`}
                                >
                                    Dark
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">Light theme is coming soon.</p>
                        </SettingSection>
                        <SettingSection title="Editor Font Size" description="Customize the font size in the code editor.">
                             <div className="flex items-center space-x-4">
                                <input
                                    type="range"
                                    min="10"
                                    max="20"
                                    step="1"
                                    value={editorFontSize}
                                    onChange={handleFontSizeChange}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                                <span className="text-sm font-mono bg-zinc-800 px-3 py-1 rounded-md">{editorFontSize}px</span>
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
                {activeTab === 'developer' && (
                    <>
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
                        <SettingSection title="Project API Secrets" description="Add secrets for external services. The AI can use these when generating code. Stored in local storage.">
                            <ApiSecretsSettings 
                                apiSecrets={props.apiSecrets}
                                onApiSecretsChange={props.onApiSecretsChange}
                            />
                        </SettingSection>
                        <SettingSection title="Backup & Restore" description="Export all projects and settings to a JSON file, or import from a backup.">
                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                                <button onClick={handleExportData} className="w-full py-2 bg-zinc-800 border border-gray-700 text-white rounded-lg font-semibold hover:bg-zinc-700 transition-colors text-sm">
                                    Export Backup
                                </button>
                                <input type="file" accept=".json" onChange={handleImportData} ref={importFileInputRef} className="hidden" />
                                <button onClick={() => importFileInputRef.current?.click()} className="w-full py-2 bg-zinc-800 border border-gray-700 text-white rounded-lg font-semibold hover:bg-zinc-700 transition-colors text-sm">
                                    Import Backup
                                </button>
                            </div>
                        </SettingSection>
                        <SettingSection title="Danger Zone" description="These actions are permanent and cannot be undone. Proceed with caution.">
                            <button onClick={handleClearData} className="w-full py-2 bg-red-800/80 border border-red-600/50 text-white rounded-lg font-semibold hover:bg-red-800 transition-colors text-sm">
                                Clear All Local Data
                            </button>
                        </SettingSection>
                    </>
                )}
                 {activeTab === 'appstore' && (
                    <>
                        <SettingSection title="App Store Publishing" description="Publish your React Native apps directly to the Apple App Store.">
                            <div className="text-center p-8 bg-zinc-800/50 rounded-lg border border-dashed border-gray-700">
                                <h3 className="text-xl font-semibold text-gray-300">Coming Soon!</h3>
                                <p className="text-gray-500 mt-2">
                                    We're working hard to bring you a seamless App Store publishing experience.
                                </p>
                            </div>
                        </SettingSection>
                    </>
                )}
                {activeTab === 'safety' && (
                    <>
                        <SettingSection title="Privacy Policy" description="How we handle your data.">
                            <div className="text-gray-400 text-sm space-y-4 bg-zinc-800/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                                <p><strong>Last Updated: [Date]</strong></p>
                                <p>Your privacy is important to us. It is Silo Build's policy to respect your privacy regarding any information we may collect from you across our website, and other sites we own and operate.</p>
                                <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
                                <p>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.</p>
                                <p>We don’t share any personally identifying information publicly or with third-parties, except when required to by law.</p>
                                <p>Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.</p>
                                <p>You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services.</p>
                                <p>Your continued use of our website will be regarded as acceptance of our practices around privacy and personal information. If you have any questions about how we handle user data and personal information, feel free to contact us.</p>
                            </div>
                        </SettingSection>
                        <SettingSection title="Terms of Service" description="The rules for using our application.">
                           <div className="text-gray-400 text-sm space-y-4 bg-zinc-800/50 p-4 rounded-lg max-h-60 overflow-y-auto">
                                <p><strong>1. Terms</strong></p>
                                <p>By accessing the website at Silo Build, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.</p>
                                <p><strong>2. Use License</strong></p>
                                <p>Permission is granted to temporarily download one copy of the materials (information or software) on Silo Build's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not: modify or copy the materials; use the materials for any commercial purpose, or for any public display (commercial or non-commercial); attempt to decompile or reverse engineer any software contained on Silo Build's website; remove any copyright or other proprietary notations from the materials; or transfer the materials to another person or "mirror" the materials on any other server. This license shall automatically terminate if you violate any of these restrictions and may be terminated by Silo Build at any time.</p>
                                <p><strong>3. Disclaimer</strong></p>
                                <p>The materials on Silo Build's website are provided on an 'as is' basis. Silo Build makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
                            </div>
                        </SettingSection>
                    </>
                )}
                {activeTab === 'about' && (
                    <>
                        <SettingSection title="About Silo Build" description="Building applications with the power of AI.">
                            <div className="text-gray-400 text-sm space-y-4 bg-zinc-800/50 p-4 rounded-lg">
                                <p>Silo Build is a powerful in-browser IDE that transpiles and renders React TSX code in real-time. Write your components using TypeScript and JSX, and see the live preview instantly.</p>
                                <p>This project leverages the capabilities of Google's Gemini API to assist in code generation, planning, and debugging, enabling rapid application development directly from natural language prompts.</p>
                            </div>
                        </SettingSection>
                        <SettingSection title="Contact Information" description="For support, feedback, or inquiries, please reach out to our team.">
                            <div className="text-gray-400 text-sm space-y-2 bg-zinc-800/50 p-4 rounded-lg">
                                <p>
                                    <a href="mailto:survivalcreativeminecraftadven@gmail.com" className="text-blue-400 hover:underline">survivalcreativeminecraftadven@gmail.com</a>
                                </p>
                                <p>
                                    <a href="mailto:rocio1976ramirezpena@gmail.com" className="text-blue-400 hover:underline">rocio1976ramirezpena@gmail.com</a>
                                </p>
                            </div>
                        </SettingSection>
                    </>
                )}
            </SettingsContent>
        </SettingsCard>
    );
};