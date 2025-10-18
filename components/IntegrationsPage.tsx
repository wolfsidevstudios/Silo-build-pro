import React, { useState, useEffect, useMemo } from 'react';
import { IntegrationModal } from './IntegrationModal';
import { Integration, ALL_INTEGRATIONS, INTEGRATION_DEFINITIONS } from '../integrations';

export const IntegrationsPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [connectedIntegrations, setConnectedIntegrations] = useState<Set<string>>(new Set());
    const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

    useEffect(() => {
        const checkConnections = () => {
            const newConnected = new Set<string>();
            INTEGRATION_DEFINITIONS.forEach(integration => {
                if (integration.storageKey && localStorage.getItem(integration.storageKey)) {
                    newConnected.add(integration.id);
                }
            });
            setConnectedIntegrations(newConnected);
        };
        checkConnections();
        // Listen for storage changes to update UI in real-time if modal in another tab saves data
        window.addEventListener('storage', checkConnections);
        return () => window.removeEventListener('storage', checkConnections);
    }, []);

    const filteredIntegrations = useMemo(() => {
        if (!searchQuery) {
            return ALL_INTEGRATIONS;
        }
        return ALL_INTEGRATIONS.filter(integration =>
            integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            integration.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery]);
    
    const groupedIntegrations = useMemo(() => {
        const groups: { [key: string]: Integration[] } = {};
        
        const sortedIntegrations = [...filteredIntegrations].sort((a, b) => {
            const categoryA = a.category || 'Z'; // Push items without a category to the end
            const categoryB = b.category || 'Z';
            return categoryA.localeCompare(categoryB);
        });

        for (const integration of sortedIntegrations) {
            const category = integration.category || 'Other Integrations';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(integration);
        }
        return groups;
    }, [filteredIntegrations]);

    const handleSaveKeys = (integrationId: string, storageKey: string, keys: Record<string, string>) => {
        localStorage.setItem(storageKey, JSON.stringify(keys));
        setConnectedIntegrations(prev => new Set(prev).add(integrationId));
        setSelectedIntegration(null);
    };
    
    const handleDisconnect = (integration: Integration) => {
        if (integration.storageKey && window.confirm(`Are you sure you want to disconnect ${integration.name}? This will remove your stored API keys.`)) {
            localStorage.removeItem(integration.storageKey);
            setConnectedIntegrations(prev => {
                const newSet = new Set(prev);
                newSet.delete(integration.id);
                return newSet;
            });
        }
    };
    
    const handleUseClick = (prompt: string | undefined) => {
        if (!prompt) return;
        sessionStorage.setItem('silo_prompt_suggestion', prompt);
        window.location.hash = '/home';
    };


    return (
        <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto">
            <div className="w-full max-w-5xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-black mb-2">Integrations Marketplace</h1>
                    <p className="text-lg text-gray-600">Connect your favorite tools and browser APIs to build powerful apps.</p>
                </header>

                <div className="sticky top-20 z-10 py-6">
                    <div className="relative max-w-2xl mx-auto">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search integrations..."
                            className="w-full p-3 pl-12 bg-white border border-gray-300 rounded-full text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                        />
                    </div>
                </div>

                <div className="space-y-12">
                    {Object.entries(groupedIntegrations).map(([category, integrations]) => (
                        <section key={category}>
                            <h2 className="text-2xl font-bold text-black mb-6">{category}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {(integrations as Integration[]).map(integration => {
                                    const isKeyBased = integration.keys && integration.keys.length > 0;
                                    const isConnected = isKeyBased && connectedIntegrations.has(integration.id);

                                    return (
                                        <div key={integration.id} className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between aspect-square transition-all duration-300 hover:shadow-xl hover:border-blue-300">
                                            <div>
                                                <div className="w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                                                    {integration.icon}
                                                </div>
                                                <h3 className="font-semibold text-gray-900 mb-1">{integration.name}</h3>
                                                <p className="text-sm text-gray-500 leading-snug">{integration.description}</p>
                                            </div>
                                            <div className="flex justify-end items-center mt-4">
                                                {isKeyBased ? (
                                                    isConnected ? (
                                                        <button onClick={() => handleDisconnect(integration)} className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full font-semibold hover:bg-red-200 transition-colors text-sm">
                                                            Disconnect
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => setSelectedIntegration(integration)} className="px-4 py-1.5 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors text-sm">
                                                            Connect
                                                        </button>
                                                    )
                                                ) : (
                                                    <button onClick={() => handleUseClick(integration.prompt)} className="px-4 py-1.5 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors text-sm">
                                                        Use
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="text-center mt-16 py-8 border-t border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Can't find the integration you need?</h3>
                    <p className="text-gray-600 mb-6">Let us know what you'd like to see next!</p>
                    <a
                        href="https://form.typeform.com/to/OnoAqhYw"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-black text-white rounded-full font-semibold hover:bg-zinc-800 transition-colors"
                    >
                        Request an Integration
                    </a>
                </div>
            </div>
            {selectedIntegration && (
                <IntegrationModal
                    integration={selectedIntegration}
                    onClose={() => setSelectedIntegration(null)}
                    onSave={handleSaveKeys}
                />
            )}
        </div>
    );
};