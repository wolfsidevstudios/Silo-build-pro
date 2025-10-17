import React, { useState, useEffect } from 'react';
import type { Integration } from '../integrations';

interface IntegrationModalProps {
    integration: Integration;
    onClose: () => void;
    onSave: (integrationId: string, storageKey: string, keys: Record<string, string>) => void;
}

export const IntegrationModal: React.FC<IntegrationModalProps> = ({ integration, onClose, onSave }) => {
    const [keys, setKeys] = useState<Record<string, string>>({});

    useEffect(() => {
        const initialKeys: Record<string, string> = {};
        integration.keys.forEach(keyInfo => {
            initialKeys[keyInfo.name] = '';
        });
        setKeys(initialKeys);
    }, [integration]);

    const handleInputChange = (keyName: string, value: string) => {
        setKeys(prev => ({ ...prev, [keyName]: value }));
    };

    const handleSaveClick = () => {
        onSave(integration.id, integration.storageKey, keys);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md relative text-black" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors">
                    <span className="material-symbols-outlined">close</span>
                </button>

                <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 flex items-center justify-center rounded-lg">{integration.icon}</div>
                    <div>
                        <h2 className="text-xl font-bold">Connect {integration.name}</h2>
                        <p className="text-sm text-gray-600">Your keys are stored securely in your browser.</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    {integration.keys.map(keyInfo => (
                        <div key={keyInfo.name}>
                            <label className="block text-sm text-gray-600 mb-1">{keyInfo.label}</label>
                            <input
                                type="password"
                                value={keys[keyInfo.name] || ''}
                                onChange={(e) => handleInputChange(keyInfo.name, e.target.value)}
                                placeholder={`Enter your ${keyInfo.label}`}
                                className="w-full p-3 bg-white border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-100 text-black rounded-full font-semibold hover:bg-gray-200 transition-colors">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveClick} 
                        className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-500"
                        // FIX: Explicitly type `k` as `string` to resolve 'property does not exist on type unknown' error.
                        disabled={Object.values(keys).some((k: string) => !k.trim())}
                    >
                        Save & Connect
                    </button>
                </div>
            </div>
        </div>
    );
};