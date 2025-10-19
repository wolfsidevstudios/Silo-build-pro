import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { ALL_INTEGRATIONS, Integration } from '../integrations';

// --- Type Definitions ---
interface Message {
    actor: 'user' | 'ai' | 'app';
    text?: string;
    appId?: string;
    results?: any; // Structured results from an app
}

interface PexelsImage {
    id: string;
    src: string;
    photographer: string;
    alt: string;
}

// --- Helper Components ---
const PexelsResultsPanel: React.FC<{ results: { images: PexelsImage[] } }> = ({ results }) => {
    if (!results || !results.images) return null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {results.images.map(image => (
                <div key={image.id} className="bg-gray-200 rounded-lg overflow-hidden group relative aspect-square">
                    <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="font-bold truncate">{image.alt}</p>
                        <p>by {image.photographer}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
    const baseStyle = "p-3 rounded-xl max-w-lg mb-4 shadow-sm";
    const userStyle = "bg-blue-600 text-white self-end";
    const aiStyle = "bg-white border border-gray-200 text-gray-800 self-start";
    const appStyle = "bg-transparent self-start w-full max-w-2xl";

    if (message.actor === 'user') {
        return <div className={`${baseStyle} ${userStyle}`}>{message.text}</div>;
    }

    if (message.actor === 'ai') {
        return <div className={`${baseStyle} ${aiStyle}`}>{message.text}</div>;
    }

    if (message.actor === 'app' && message.appId === 'pexels') {
        return (
            <div className={`${baseStyle} ${appStyle}`}>
                <p className="text-sm font-semibold mb-2 text-gray-700">Here are some images from Pexels:</p>
                <PexelsResultsPanel results={message.results} />
            </div>
        );
    }
    
    // Fallback for other app panels
    if (message.actor === 'app') {
        return (
             <div className={`${baseStyle} ${aiStyle}`}>
                <p className="font-bold mb-2">Data from {message.appId}</p>
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(message.results, null, 2)}</pre>
             </div>
        )
    }

    return null;
};


// --- Main Component ---
export const SiloAiPage: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { actor: 'ai', text: "Welcome to Silo AI! Type '/' to select a connected app and start chatting." }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isAppPanelOpen, setIsAppPanelOpen] = useState(false);
    const [activeApp, setActiveApp] = useState<Integration | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const connectedIntegrations = useMemo(() => {
        return ALL_INTEGRATIONS.filter(integration =>
            integration.storageKey && typeof window !== 'undefined' && localStorage.getItem(integration.storageKey)
        );
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const getAiClient = () => {
        const userApiKey = localStorage.getItem('gemini_api_key');
        if (!userApiKey) {
            throw new Error("Gemini API key is not set. Please add it in Settings.");
        }
        return new GoogleGenAI({ apiKey: userApiKey });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        if (value === '/') {
            setIsAppPanelOpen(true);
        } else if (!value.startsWith('/')) {
            setIsAppPanelOpen(false);
        }
        setUserInput(value);
    };

    const handleSelectApp = (integration: Integration) => {
        setActiveApp(integration);
        setIsAppPanelOpen(false);
        setUserInput('');
        inputRef.current?.focus();
        setMessages(prev => [...prev, { actor: 'ai', text: `Connected to ${integration.name}. What would you like to do?` }]);
    };

    const handleSend = async () => {
        const trimmedInput = userInput.trim();
        if (!trimmedInput || isLoading) return;

        setMessages(prev => [...prev, { actor: 'user', text: trimmedInput }]);
        setUserInput('');
        setIsLoading(true);
        setError(null);

        try {
            if (!activeApp) {
                setMessages(prev => [...prev, { actor: 'ai', text: "Please select an app by typing '/' to begin." }]);
                return;
            }
            
            const ai = getAiClient();
            
            // App-specific logic
            if (activeApp.id === 'pexels') {
                const pexelsSchema = {
                  type: Type.OBJECT,
                  properties: {
                    images: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          src: { type: Type.STRING, description: "A realistic-looking image URL from 'images.pexels.com', e.g., 'https://images.pexels.com/photos/12345/pexels-photo-12345.jpeg?auto=compress&cs=tinysrgb&w=600'" },
                          photographer: { type: Type.STRING },
                          alt: { type: Type.STRING }
                        },
                        required: ['id', 'src', 'photographer', 'alt']
                      }
                    }
                  },
                  required: ['images']
                };

                const prompt = `You are an AI assistant that interfaces with the Pexels API.
                    User's request: "${trimmedInput}"
                    Your task is to act as if you queried the Pexels API and return a JSON object with realistic-looking data that matches the user's request and the provided schema. Generate 6 image results.
                    Your response MUST be ONLY the JSON object.`;
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                    config: { responseMimeType: 'application/json', responseSchema: pexelsSchema }
                });

                const results = JSON.parse(response.text);
                setMessages(prev => [...prev, { actor: 'app', appId: 'pexels', results }]);
            } else {
                 setMessages(prev => [...prev, { actor: 'ai', text: `I'm ready to chat with ${activeApp.name}, but my developer hasn't built my special panel for it yet!` }]);
            }

        } catch (e: any) {
            const errorMessage = `An error occurred: ${e.message}`;
            setError(errorMessage);
            setMessages(prev => [...prev, { actor: 'ai', text: errorMessage }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="flex flex-col h-full bg-white text-black">
            <main className="flex-1 flex flex-col items-center p-4 pt-20 overflow-y-auto">
                <div className="w-full max-w-3xl">
                    {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                    
                    {isLoading && (
                         <div className="self-start bg-white border border-gray-200 p-3 rounded-xl flex items-center space-x-2 shadow-sm mb-4">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="w-full max-w-3xl mx-auto p-4 sticky bottom-0">
                {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
                
                {isAppPanelOpen && (
                    <div className="mb-2 bg-white border border-gray-300 rounded-xl shadow-lg p-2 max-h-60 overflow-y-auto">
                        {connectedIntegrations.length > 0 ? (
                            connectedIntegrations.map(int => (
                                <button key={int.id} onClick={() => handleSelectApp(int)} className="w-full text-left p-2 rounded-lg hover:bg-gray-100 flex items-center space-x-3">
                                    <div className="w-8 h-8 flex-shrink-0">{int.icon}</div>
                                    <div>
                                        <p className="font-semibold text-sm">{int.name}</p>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <p className="text-center text-sm text-gray-500 p-4">No apps connected. Go to <a href="#/integrations" className="text-blue-600 underline">Integrations</a> to connect some.</p>
                        )}
                    </div>
                )}
                
                <div className="relative bg-white border border-gray-300 rounded-3xl shadow-lg p-2">
                    {activeApp && (
                        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium animate-fade-in">
                            <div className="w-5 h-5 flex items-center justify-center">{activeApp.icon}</div>
                            <span className="font-semibold">{activeApp.name}</span>
                            <button onClick={() => setActiveApp(null)} className="p-1 -mr-1 rounded-full hover:bg-blue-200"><span className="material-symbols-outlined text-base">close</span></button>
                        </div>
                    )}
                    <textarea
                        ref={inputRef}
                        value={userInput}
                        onChange={handleInputChange}
                        onKeyDown={e => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                        placeholder={activeApp ? `Chat with ${activeApp.name}...` : "Type '/' to select an app..."}
                        className={`w-full p-3 bg-transparent placeholder-gray-500 focus:outline-none resize-none text-lg ${activeApp ? 'pl-40' : 'pl-4'}`}
                        rows={1}
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading || !userInput.trim()} className="absolute bottom-4 right-4 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center disabled:bg-gray-400 hover:bg-zinc-800 transition-colors">
                        <span className="material-symbols-outlined">arrow_upward</span>
                    </button>
                </div>
            </footer>
        </div>
    );
};
