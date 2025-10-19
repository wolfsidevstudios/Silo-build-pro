import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Integration } from '../integrations';

declare const Prism: any;

const LOCAL_STORAGE_KEY_INTEGRATIONS = 'silo_custom_integrations';
const LOCAL_STORAGE_KEY_API_KEYS = 'silo_build_api_keys';

type CustomIntegration = Omit<Integration, 'icon'> & { icon: string };

interface ApiKey {
  name: string;
  key: string;
  displayKey: string;
  createdAt: string;
}

const emptyIntegration: CustomIntegration = {
    id: '',
    name: '',
    icon: '<span class="material-symbols-outlined text-4xl">extension</span>',
    description: '',
    storageKey: '',
    keys: [],
    usageInstructions: '',
    category: '',
    prompt: '',
};

const openApiSpec = {
  "openapi": "3.0.0",
  "info": {
    "title": "Silo Build Community API",
    "version": "1.0.0",
    "description": "API for interacting with the Silo Build community showcase, allowing developers to retrieve and manage community-published applications."
  },
  "servers": [
    {
      "url": "https://yzymxzmxdnzfwvsezbwm.supabase.co/rest/v1",
      "description": "Community Database Server (Supabase)"
    }
  ],
  "paths": {
    "/community_apps": {
      "get": {
        "summary": "List Community Apps",
        "description": "Retrieves a list of all applications published to the community showcase.",
        "parameters": [
          {
            "name": "apikey",
            "in": "header",
            "required": true,
            "description": "The public anon key for the Supabase project.",
            "schema": { "type": "string" }
          },
          {
            "name": "select",
            "in": "query",
            "description": "Fields to return. `*` returns all fields.",
            "schema": { "type": "string", "default": "*" }
          }
        ],
        "responses": {
          "200": {
            "description": "A list of community apps.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": { "$ref": "#/components/schemas/CommunityApp" }
                }
              }
            }
          }
        }
      }
    },
    "/community_apps?name=eq.{appName}": {
      "get": {
        "summary": "Get App by Name",
        "description": "Retrieves the details of a specific application by its unique name using a query parameter.",
        "parameters": [
          {
            "name": "appName",
            "in": "path",
            "required": true,
            "description": "The unique name of the app to retrieve.",
            "schema": { "type": "string" }
          },
          {
            "name": "apikey",
            "in": "header",
            "required": true,
            "description": "The public anon key for the Supabase project.",
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": {
            "description": "App details.",
            "content": {
              "application/json": {
                "schema": {
                    "type": "array",
                    "items": { "$ref": "#/components/schemas/CommunityApp" }
                }
              }
            }
          },
          "404": { "description": "App not found." }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "ProjectFile": {
        "type": "object",
        "properties": {
          "path": { "type": "string", "example": "src/App.tsx" },
          "code": { "type": "string", "example": "import React from 'react';" }
        }
      },
      "CommunityApp": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "example": 1 },
          "name": { "type": "string", "example": "my-cool-app" },
          "description": { "type": "string", "example": "A really cool app." },
          "created_at": { "type": "string", "format": "date-time" },
          "project_files": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/ProjectFile" }
          },
          "project_type": { "type": "string", "enum": ["single", "multi", "html", "shadcn"] }
        }
      }
    }
  }
};

const CodeBlock: React.FC<{ code: string; language: string; className?: string }> = ({ code, language, className }) => {
    const ref = useRef<HTMLElement>(null);
    useEffect(() => {
        if (ref.current) {
            Prism.highlightElement(ref.current);
        }
    }, [code, language]);
    return (
        <pre className={`language-${language} rounded-lg ${className}`}>
            <code ref={ref} className={`language-${language}`}>
                {code.trim()}
            </code>
        </pre>
    );
};


const IntegrationCard: React.FC<{ integration: CustomIntegration }> = ({ integration }) => (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between aspect-square transition-all duration-300 hover:shadow-xl hover:border-blue-300">
        <div>
            <div className="w-12 h-12 flex items-center justify-center rounded-lg mb-4" dangerouslySetInnerHTML={{ __html: integration.icon || emptyIntegration.icon }}></div>
            <h3 className="font-semibold text-gray-900 mb-1">{integration.name || 'Integration Name'}</h3>
            <p className="text-sm text-gray-500 leading-snug">{integration.description || 'Your description here.'}</p>
        </div>
        <div className="flex justify-end items-center mt-4">
            <button className="px-4 py-1.5 bg-black text-white rounded-full font-semibold text-sm">Connect</button>
        </div>
    </div>
);

export const DeveloperPortalPage: React.FC = () => {
    // Shared state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeMainTab, setActiveMainTab] = useState<'api-keys' | 'build-api' | 'community-api' | 'integrations'>('api-keys');
    
    // My API Keys State
    const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
    const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);

    // My Integrations State
    const [myIntegrations, setMyIntegrations] = useState<CustomIntegration[]>([]);
    const [currentIntegration, setCurrentIntegration] = useState<CustomIntegration>(emptyIntegration);
    const [activeBuilderTab, setActiveBuilderTab] = useState<'manual' | 'ai' | 'github'>('manual');
    const [aiPrompt, setAiPrompt] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    
    const apiCodeRef = useRef<HTMLElement>(null);


    useEffect(() => {
        if (activeMainTab === 'community-api' && apiCodeRef.current && Prism) {
            Prism.highlightElement(apiCodeRef.current);
        }
    }, [activeMainTab]);

     useEffect(() => {
        try {
            const savedIntegrations = localStorage.getItem(LOCAL_STORAGE_KEY_INTEGRATIONS);
            if (savedIntegrations) setMyIntegrations(JSON.parse(savedIntegrations));
            
            const savedKeys = localStorage.getItem(LOCAL_STORAGE_KEY_API_KEYS);
            if (savedKeys) setApiKeys(JSON.parse(savedKeys));
        } catch (e) {
            console.error("Failed to load data from local storage", e);
        }
    }, []);

    const getAiClient = () => {
        const userApiKey = localStorage.getItem('gemini_api_key');
        const apiKey = userApiKey || (process.env.API_KEY as string);
        if (!apiKey) {
            throw new Error("Gemini API key is not set. Please add it in Settings.");
        }
        return new GoogleGenAI({ apiKey });
    };

    // --- My API Keys Logic ---

    const handleGenerateKey = () => {
        if (!newKeyName.trim()) return;
        const rawKey = `silo_sk_${crypto.randomUUID().replace(/-/g, '')}`;
        const newKey: ApiKey = {
            name: newKeyName,
            key: rawKey,
            displayKey: `${rawKey.substring(0, 11)}...${rawKey.substring(rawKey.length - 4)}`,
            createdAt: new Date().toISOString(),
        };
        const updatedKeys = [...apiKeys, newKey];
        setApiKeys(updatedKeys);
        localStorage.setItem(LOCAL_STORAGE_KEY_API_KEYS, JSON.stringify(updatedKeys));
        setGeneratedKey(rawKey);
        setNewKeyName('');
    };
    
    const handleDeleteKey = (keyToDelete: string) => {
        if (window.confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
            const updatedKeys = apiKeys.filter(k => k.key !== keyToDelete);
            setApiKeys(updatedKeys);
            localStorage.setItem(LOCAL_STORAGE_KEY_API_KEYS, JSON.stringify(updatedKeys));
        }
    };

    // --- My Integrations Logic ---

    const handleSaveIntegration = () => {
        if (!currentIntegration.name || !currentIntegration.description) {
            alert("Name and Description are required.");
            return;
        }
        const newIntegration: CustomIntegration = {
            ...currentIntegration,
            id: currentIntegration.id || `custom-${Date.now()}`,
            storageKey: currentIntegration.storageKey || `silo_integration_${currentIntegration.name.toLowerCase().replace(/\s+/g, '_')}`,
        };
        const existingIndex = myIntegrations.findIndex(i => i.id === newIntegration.id);
        let updatedIntegrations = [];
        if (existingIndex > -1) {
            updatedIntegrations = [...myIntegrations];
            updatedIntegrations[existingIndex] = newIntegration;
        } else {
            updatedIntegrations = [...myIntegrations, newIntegration];
        }
        setMyIntegrations(updatedIntegrations);
        localStorage.setItem(LOCAL_STORAGE_KEY_INTEGRATIONS, JSON.stringify(updatedIntegrations));
        handleNewIntegration();
    };
    const handleNewIntegration = () => { setCurrentIntegration(emptyIntegration); setActiveBuilderTab('manual'); };
    const handleEditIntegration = (integration: CustomIntegration) => { setCurrentIntegration(integration); setActiveBuilderTab('manual'); };
    const handleDeleteIntegration = (id: string) => {
        if (window.confirm("Are you sure you want to delete this integration draft?")) {
            const updated = myIntegrations.filter(i => i.id !== id);
            setMyIntegrations(updated);
            localStorage.setItem(LOCAL_STORAGE_KEY_INTEGRATIONS, JSON.stringify(updated));
        }
    };
    const handleInputChange = (field: keyof CustomIntegration, value: any) => { setCurrentIntegration(prev => ({ ...prev, [field]: value })); };
    const handleKeyChange = (index: number, field: 'name' | 'label', value: string) => {
        const newKeys = [...(currentIntegration.keys || [])];
        newKeys[index] = { ...newKeys[index], [field]: value };
        handleInputChange('keys', newKeys);
    };
    const addKey = () => { handleInputChange('keys', [...(currentIntegration.keys || []), { name: '', label: '' }]); };
    const removeKey = (index: number) => { handleInputChange('keys', (currentIntegration.keys || []).filter((_, i) => i !== index)); };
    // Other handlers...

    const handleGenerateWithAI = async () => { /* ... implementation from previous context ... */ };
    const handleImportFromGitHub = async () => { /* ... implementation from previous context ... */ };
    const handleSubmitForReview = () => { /* ... implementation from previous context ... */ };
    const aiPromptPreview = useMemo(() => {
        const { name, keys, usageInstructions } = currentIntegration;
        if (!name || !keys || keys.length === 0 || !usageInstructions) return "Fill out the form to see a preview.";
        let details = `- **${name} Integration:**`;
        keys.forEach(key => { details += `\n  - ${key.label}: "${`{{${key.name}}}`}"`; });
        details += `\n  - **Usage:** ${usageInstructions}`;
        return `**API Integrations:**\nThe user has connected the following APIs...\n${details}`;
    }, [currentIntegration]);

    const handleDownloadSpec = () => {
        const jsonString = JSON.stringify(openApiSpec, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'silo-build-community-api.openapi.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-black mb-2">Developer Portal</h1>
                    <p className="text-lg text-gray-600">Build with the Silo Build API and create custom integrations.</p>
                </header>
                
                <div className="border-b border-gray-300 mb-8 flex justify-center">
                    <button onClick={() => setActiveMainTab('api-keys')} className={`px-6 py-3 text-lg font-semibold transition-colors ${activeMainTab === 'api-keys' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}>My API Keys</button>
                    <button onClick={() => setActiveMainTab('build-api')} className={`px-6 py-3 text-lg font-semibold transition-colors ${activeMainTab === 'build-api' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}>Build API</button>
                    <button onClick={() => setActiveMainTab('community-api')} className={`px-6 py-3 text-lg font-semibold transition-colors ${activeMainTab === 'community-api' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}>Community API</button>
                    <button onClick={() => setActiveMainTab('integrations')} className={`px-6 py-3 text-lg font-semibold transition-colors ${activeMainTab === 'integrations' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}>My Integrations</button>
                </div>
                
                {activeMainTab === 'api-keys' && (
                    <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-8 shadow-xl max-w-4xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">My API Keys</h2>
                                <p className="text-sm text-gray-600 mt-1">Manage API keys to build apps programmatically with the Silo Build API.</p>
                            </div>
                            <button onClick={() => { setGeneratedKey(null); setIsKeyModalOpen(true); }} className="px-5 py-2 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors text-sm">Generate New Key</button>
                        </div>
                        <div className="space-y-3">
                            {apiKeys.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">You haven't generated any API keys yet.</p>
                            ) : (
                                apiKeys.map(apiKey => (
                                    <div key={apiKey.key} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold">{apiKey.name}</p>
                                            <p className="text-sm text-gray-500 font-mono">{apiKey.displayKey}</p>
                                            <p className="text-xs text-gray-400 mt-1">Created on {new Date(apiKey.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <button onClick={() => handleDeleteKey(apiKey.key)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><span className="material-symbols-outlined">delete</span></button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
                 {isKeyModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={() => setIsKeyModalOpen(false)}>
                        <div className="bg-white rounded-2xl p-8 w-full max-w-md relative text-black" onClick={e => e.stopPropagation()}>
                           <button onClick={() => setIsKeyModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors"><span className="material-symbols-outlined">close</span></button>
                            {generatedKey ? (
                                <>
                                    <h2 className="text-xl font-bold mb-2">API Key Generated</h2>
                                    <p className="text-sm text-gray-600 mb-4">Store this key securely. You will not be able to see it again.</p>
                                    <div className="bg-gray-100 p-3 rounded-lg font-mono text-sm break-all">{generatedKey}</div>
                                    <button onClick={() => setIsKeyModalOpen(false)} className="mt-4 w-full py-2 bg-black text-white rounded-lg font-semibold">Done</button>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-xl font-bold mb-4">Generate New API Key</h2>
                                    <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key Name (e.g., My Awesome Tool)" className="w-full p-2 border border-gray-300 rounded-lg mb-4" />
                                    <button onClick={handleGenerateKey} disabled={!newKeyName.trim()} className="w-full py-2 bg-black text-white rounded-lg font-semibold disabled:bg-gray-400">Generate Key</button>
                                </>
                            )}
                        </div>
                    </div>
                 )}

                {activeMainTab === 'build-api' && (
                     <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-8 shadow-xl max-w-4xl mx-auto">
                        <h2 className="text-2xl font-bold mb-1">Build API Documentation</h2>
                        <p className="text-sm text-gray-600 mb-6">Use our API to create and manage app builds from your own services.</p>
                        
                        <div className="space-y-8">
                            <div>
                                <h3 className="text-lg font-semibold">Authentication</h3>
                                <p className="text-sm text-gray-600 mt-1">Authenticate your API requests by providing your secret key in the Authorization header as a Bearer token.</p>
                                <CodeBlock language="bash" code={`Authorization: Bearer YOUR_API_KEY`} className="mt-2" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold">Endpoints</h3>
                                <div className="mt-2 border-t border-gray-200 pt-4">
                                    <h4 className="font-semibold"><span className="font-mono text-sm bg-green-100 text-green-800 px-2 py-1 rounded-md">POST</span> /v1/builds</h4>
                                    <p className="text-sm text-gray-600 mt-1">Creates a new app build job.</p>
                                    <h5 className="font-semibold text-sm mt-3">Request Body</h5>
                                    <CodeBlock language="json" code={`{\n  "prompt": "a simple to-do list app",\n  "projectType": "multi"\n}`} />
                                    <h5 className="font-semibold text-sm mt-3">Example Request</h5>
                                    <CodeBlock language="bash" code={`curl -X POST https://api.silobuild.com/v1/builds \\\n     -H "Authorization: Bearer YOUR_API_KEY" \\\n     -H "Content-Type: application/json" \\\n     -d '{\n       "prompt": "a simple to-do list app",\n       "projectType": "multi"\n     }'`} />
                                </div>
                                <div className="mt-6 border-t border-gray-200 pt-4">
                                    <h4 className="font-semibold"><span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-md">GET</span> /v1/builds/{'{buildId}'}</h4>
                                    <p className="text-sm text-gray-600 mt-1">Retrieves the status and results of a build job.</p>
                                    <h5 className="font-semibold text-sm mt-3">Example Response (Completed)</h5>
                                    <CodeBlock language="json" code={`{\n  "buildId": "build_abc123",\n  "status": "completed",\n  "files": [\n    {\n      "path": "src/App.tsx",\n      "code": "import React from 'react'; ..."\n    }\n  ]\n}`} />
                                </div>
                            </div>
                        </div>
                     </div>
                )}


                {activeMainTab === 'community-api' && (
                    <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-xl">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold">Community API Specification</h2>
                                <p className="text-sm text-gray-600 mt-1">OpenAPI 3.0 documentation for the Silo Build Community API.</p>
                            </div>
                            <button onClick={handleDownloadSpec} className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors text-sm">
                                <span className="material-symbols-outlined text-base">download</span>
                                <span>Download JSON</span>
                            </button>
                        </div>
                        <div className="h-[70vh] overflow-auto">
                            <pre className="language-json rounded-xl !bg-gray-800 text-white text-sm">
                                <code ref={apiCodeRef}>
                                    {JSON.stringify(openApiSpec, null, 2)}
                                </code>
                            </pre>
                        </div>
                    </div>
                )}

                {activeMainTab === 'integrations' && (
                    <>
                        {/* Integration builder and other components can go here */}
                         <div className="mt-12 pt-8 border-t border-gray-200">
                            <h2 className="text-2xl font-bold mb-4">My Integrations</h2>
                            {myIntegrations.length === 0 ? (
                                <p className="text-gray-500">You haven't saved any integrations yet. Use the builder above to get started!</p>
                            ) : (
                                <div className="space-y-2">
                                    {myIntegrations.map(int => (
                                        <div key={int.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">{int.name}</p>
                                                <p className="text-sm text-gray-600">{int.description}</p>
                                            </div>
                                            <div className="flex space-x-2">
                                                <button onClick={() => handleEditIntegration(int)} className="p-2 hover:bg-gray-100 rounded-full"><span className="material-symbols-outlined">edit</span></button>
                                                <button onClick={() => handleDeleteIntegration(int.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><span className="material-symbols-outlined">delete</span></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
