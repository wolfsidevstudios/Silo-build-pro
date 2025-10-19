
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import type { Integration } from '../integrations';

declare const Prism: any;

const LOCAL_STORAGE_KEY = 'silo_custom_integrations';

type CustomIntegration = Omit<Integration, 'icon'> & { icon: string };

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
        "description": "Retrieves the details of a specific application by its unique name.",
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
                "schema": { "$ref": "#/components/schemas/CommunityApp" }
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
    const [myIntegrations, setMyIntegrations] = useState<CustomIntegration[]>([]);
    const [currentIntegration, setCurrentIntegration] = useState<CustomIntegration>(emptyIntegration);
    const [activeBuilderTab, setActiveBuilderTab] = useState<'manual' | 'ai' | 'github'>('manual');
    const [aiPrompt, setAiPrompt] = useState('');
    const [githubUrl, setGithubUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeMainTab, setActiveMainTab] = useState<'integrations' | 'api'>('integrations');
    const apiCodeRef = useRef<HTMLElement>(null);


    useEffect(() => {
        if (activeMainTab === 'api' && apiCodeRef.current && Prism) {
            Prism.highlightElement(apiCodeRef.current);
        }
    }, [activeMainTab]);


    useEffect(() => {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (saved) {
                setMyIntegrations(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load custom integrations from local storage", e);
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

    const handleSave = () => {
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
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedIntegrations));
        handleNew();
    };

    const handleNew = () => {
        setCurrentIntegration(emptyIntegration);
        setActiveBuilderTab('manual');
    };

    const handleEdit = (integration: CustomIntegration) => {
        setCurrentIntegration(integration);
        setActiveBuilderTab('manual');
    };
    
    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this integration draft?")) {
            const updated = myIntegrations.filter(i => i.id !== id);
            setMyIntegrations(updated);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        }
    };

    const handleInputChange = (field: keyof CustomIntegration, value: any) => {
        setCurrentIntegration(prev => ({ ...prev, [field]: value }));
    };
    
    const handleKeyChange = (index: number, field: 'name' | 'label', value: string) => {
        const newKeys = [...(currentIntegration.keys || [])];
        newKeys[index] = { ...newKeys[index], [field]: value };
        handleInputChange('keys', newKeys);
    };

    const addKey = () => {
        const newKeys = [...(currentIntegration.keys || []), { name: '', label: '' }];
        handleInputChange('keys', newKeys);
    };
    
    const removeKey = (index: number) => {
        const newKeys = (currentIntegration.keys || []).filter((_, i) => i !== index);
        handleInputChange('keys', newKeys);
    };

    const handleGenerateWithAI = async () => {
        if (!aiPrompt.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const ai = getAiClient();
            const generationPrompt = `
You are an expert at creating integration definitions for the Silo Build platform. Based on the user's request, generate a JSON object that defines a new integration.
The JSON object must follow the specified schema.
- For \`id\` and \`storageKey\`, create sensible, unique identifiers based on the integration name.
- For \`icon\`, try to find a simple, official SVG icon for the service. If not, use a relevant Material Symbols Outlined icon, e.g., '<span class="material-symbols-outlined text-4xl">icon_name</span>'.
- If the request doesn't mention specific API keys, create a generic one like 'apiKey'.
- Make the \`usageInstructions\` clear and concise for another AI to understand, using {{keyName}} placeholders.

User Request: "${aiPrompt}"

Respond with ONLY the valid JSON object. Do not include any other text or markdown.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: generationPrompt,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            icon: { type: Type.STRING },
                            description: { type: Type.STRING },
                            category: { type: Type.STRING },
                            storageKey: { type: Type.STRING },
                            keys: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { name: { type: Type.STRING }, label: { type: Type.STRING } },
                                    required: ['name', 'label'],
                                },
                            },
                            usageInstructions: { type: Type.STRING },
                        },
                        required: ['name', 'icon', 'description', 'category', 'storageKey', 'keys', 'usageInstructions'],
                    }
                }
            });

            const generatedJson = JSON.parse(response.text);
            setCurrentIntegration({ ...emptyIntegration, ...generatedJson, id: '' });
            setActiveBuilderTab('manual');
        } catch (err: any) {
            setError(`AI generation failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImportFromGitHub = async () => {
        if (!githubUrl.trim()) return;
        setIsLoading(true);
        setError(null);
        try {
            const urlMatch = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
            if (!urlMatch) throw new Error("Invalid GitHub repository URL. Format should be: https://github.com/owner/repo");
            const owner = urlMatch[1];
            const repo = urlMatch[2];
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/integration.json`;

            const response = await fetch(apiUrl, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });

            if (!response.ok) {
                throw new Error(`Could not fetch integration.json. Make sure the file exists at the root of the repository. Status: ${response.status}`);
            }

            const data = await response.json();
            if (data.encoding !== 'base64') throw new Error("File is not base64 encoded.");
            
            const content = atob(data.content);
            const integrationJson = JSON.parse(content);

            setCurrentIntegration({ ...emptyIntegration, ...integrationJson, id: '' });
            setActiveBuilderTab('manual');
        } catch (err: any) {
            setError(`GitHub import failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const aiPromptPreview = useMemo(() => {
        const { name, keys, usageInstructions } = currentIntegration;
        if (!name || !keys || keys.length === 0 || !usageInstructions) return "Fill out the form to see a preview.";
        
        let details = `- **${name} Integration:**`;
        keys.forEach(key => {
            details += `\n  - ${key.label}: "${`{{${key.name}}}`}"`;
        });
        details += `\n  - **Usage:** ${usageInstructions}`;
        
        return `**API Integrations:**\nThe user has connected the following APIs...\n${details}`;
    }, [currentIntegration]);
    
    const handleSubmitForReview = () => {
        const subject = encodeURIComponent(`New Integration Submission: ${currentIntegration.name}`);
        const body = encodeURIComponent(`
Hello Silo Build Team,

I've created a new integration and would like to submit it for review.

**Integration Name:** ${currentIntegration.name}

**JSON Definition:**
\`\`\`json
${JSON.stringify(currentIntegration, null, 2)}
\`\`\`

Thanks,
A Developer
        `);
        window.location.href = `mailto:survivalcreativeminecraftadven@gmail.com,rocio1976ramirezpena@gmail.com?subject=${subject}&body=${body}`;
    };

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
                    <p className="text-lg text-gray-600">Build, test, and submit your own integrations for Silo Build.</p>
                </header>
                
                <div className="border-b border-gray-300 mb-8 flex justify-center">
                    <button onClick={() => setActiveMainTab('integrations')} className={`px-6 py-3 text-lg font-semibold transition-colors ${activeMainTab === 'integrations' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}>
                        Integrations
                    </button>
                    <button onClick={() => setActiveMainTab('api')} className={`px-6 py-3 text-lg font-semibold transition-colors ${activeMainTab === 'api' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}>
                        API Documentation
                    </button>
                </div>

                {activeMainTab === 'integrations' && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Builder */}
                            <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-xl">
                                <div className="flex border-b border-gray-300 mb-4">
                                    {(['manual', 'ai', 'github'] as const).map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveBuilderTab(tab)}
                                            className={`px-4 py-2 text-sm font-semibold capitalize transition-colors ${activeBuilderTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-black'}`}
                                        >
                                            {tab === 'ai' ? 'AI Assistant' : tab === 'github' ? 'Import from GitHub' : 'Manual Builder'}
                                        </button>
                                    ))}
                                </div>

                                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

                                {activeBuilderTab === 'manual' && (
                                    <>
                                        <h2 className="text-2xl font-bold mb-4">Integration Builder</h2>
                                        <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-2">
                                            <input type="text" placeholder="Integration Name" value={currentIntegration.name} onChange={e => handleInputChange('name', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                                            <textarea placeholder="Description" value={currentIntegration.description} onChange={e => handleInputChange('description', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg h-20 resize-none" />
                                            <input type="text" placeholder="Category (e.g., AI & Developer Tools)" value={currentIntegration.category} onChange={e => handleInputChange('category', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                                            <textarea placeholder="Icon (paste SVG code)" value={currentIntegration.icon} onChange={e => handleInputChange('icon', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg h-24 resize-none font-mono" />
                                            
                                            <div>
                                                <h3 className="font-semibold mb-2">API Keys</h3>
                                                <div className="space-y-2">
                                                    {(currentIntegration.keys || []).map((key, index) => (
                                                        <div key={index} className="flex items-center space-x-2">
                                                            <input type="text" placeholder="Key Name (e.g., apiKey)" value={key.name} onChange={e => handleKeyChange(index, 'name', e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-lg" />
                                                            <input type="text" placeholder="Key Label (e.g., API Key)" value={key.label} onChange={e => handleKeyChange(index, 'label', e.target.value)} className="w-1/2 p-2 border border-gray-300 rounded-lg" />
                                                            <button onClick={() => removeKey(index)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><span className="material-symbols-outlined">delete</span></button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <button onClick={addKey} className="mt-2 text-sm text-blue-600 hover:underline">Add Key</button>
                                            </div>
                                            <textarea placeholder="Usage Instructions for AI (use {{keyName}} for placeholders)" value={currentIntegration.usageInstructions} onChange={e => handleInputChange('usageInstructions', e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg h-24 resize-none" />
                                        </div>
                                        <div className="flex space-x-2 mt-4">
                                        <button onClick={handleNew} className="w-full py-2 bg-gray-200 text-black rounded-lg font-semibold hover:bg-gray-300 transition-colors">New</button>
                                        <button onClick={handleSave} className="w-full py-2 bg-black text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors">Save to My Integrations</button>
                                        </div>
                                    </>
                                )}
                                
                                {activeBuilderTab === 'ai' && (
                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold">AI Assistant</h2>
                                        <p className="text-sm text-gray-600">Describe the integration you want to create, and the AI will generate the configuration for you.</p>
                                        <textarea placeholder="e.g., An integration for the Pexels API which provides free stock photos. It needs an API key." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg h-32 resize-none" />
                                        <button onClick={handleGenerateWithAI} disabled={isLoading} className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400">
                                            {isLoading ? 'Generating...' : 'Generate with AI'}
                                        </button>
                                    </div>
                                )}

                                {activeBuilderTab === 'github' && (
                                    <div className="space-y-4">
                                        <h2 className="text-2xl font-bold">Import from GitHub</h2>
                                        <p className="text-sm text-gray-600">Enter the URL of a public GitHub repository. We'll look for an `integration.json` file in the root directory.</p>
                                        <input type="url" placeholder="https://github.com/your-username/your-repo" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg" />
                                        <button onClick={handleImportFromGitHub} disabled={isLoading} className="w-full py-2 bg-black text-white rounded-lg font-semibold hover:bg-zinc-800 transition-colors disabled:bg-gray-400">
                                            {isLoading ? 'Importing...' : 'Import'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Preview */}
                            <div className="space-y-6">
                                <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-2xl font-bold mb-4">Live Preview</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                    <IntegrationCard integration={currentIntegration} />
                                    </div>
                                </div>
                                <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-xl">
                                    <h2 className="text-2xl font-bold mb-4">Test & Submit</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-semibold mb-2 text-sm">AI Prompt Preview</h3>
                                            <pre className="text-xs bg-gray-100 p-2 rounded-lg whitespace-pre-wrap font-mono">{aiPromptPreview}</pre>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold mb-2 text-sm">JSON Definition</h3>
                                            <pre className="text-xs bg-gray-100 p-2 rounded-lg whitespace-pre-wrap font-mono h-32 overflow-auto">{JSON.stringify(currentIntegration, null, 2)}</pre>
                                        </div>
                                        <button onClick={handleSubmitForReview} disabled={!currentIntegration.name} className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400">Submit for Review</button>
                                    </div>
                                </div>
                            </div>
                        </div>

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
                                                <button onClick={() => handleEdit(int)} className="p-2 hover:bg-gray-100 rounded-full"><span className="material-symbols-outlined">edit</span></button>
                                                <button onClick={() => handleDelete(int.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><span className="material-symbols-outlined">delete</span></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeMainTab === 'api' && (
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
            </div>
        </div>
    );
};
