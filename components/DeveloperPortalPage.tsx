import React, { useState, useEffect, useMemo } from 'react';
import type { Integration } from '../integrations';

const LOCAL_STORAGE_KEY = 'silo_custom_integrations';

const emptyIntegration: Omit<Integration, 'icon'> & { icon: string } = {
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

const IntegrationCard: React.FC<{ integration: Omit<Integration, 'icon'> & { icon: string } }> = ({ integration }) => (
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
    const [myIntegrations, setMyIntegrations] = useState<Integration[]>([]);
    const [currentIntegration, setCurrentIntegration] = useState<Omit<Integration, 'icon'> & { icon: string }>(emptyIntegration);

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

    const handleSave = () => {
        if (!currentIntegration.name || !currentIntegration.description) {
            alert("Name and Description are required.");
            return;
        }

        const newIntegration: Integration = {
            ...currentIntegration,
            id: currentIntegration.id || `custom-${Date.now()}`,
            storageKey: currentIntegration.storageKey || `silo_integration_${currentIntegration.name.toLowerCase().replace(/\s+/g, '_')}`,
            icon: <div dangerouslySetInnerHTML={{ __html: currentIntegration.icon }} />
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
    };

    const handleEdit = (integration: Integration) => {
        setCurrentIntegration({
            ...integration,
            // This is a simplified way; a real-world scenario might need a better way to serialize ReactNode
            icon: typeof integration.icon === 'string' ? integration.icon : emptyIntegration.icon, 
        });
    };
    
    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this integration draft?")) {
            const updated = myIntegrations.filter(i => i.id !== id);
            setMyIntegrations(updated);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        }
    };

    const handleInputChange = (field: keyof typeof currentIntegration, value: any) => {
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

    return (
        <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto">
            <div className="w-full max-w-7xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-black mb-2">Developer Portal</h1>
                    <p className="text-lg text-gray-600">Build, test, and submit your own integrations for Silo Build.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Builder */}
                    <div className="bg-white/50 backdrop-blur-lg border border-gray-200 rounded-2xl p-6 shadow-xl">
                        <h2 className="text-2xl font-bold mb-4">Integration Builder</h2>
                        <div className="space-y-4 text-sm">
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
                                 <button onClick={handleSubmitForReview} className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Submit for Review</button>
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
            </div>
        </div>
    );
};
