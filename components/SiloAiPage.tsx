import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { ALL_INTEGRATIONS, Integration } from '../integrations';

// --- Type Definitions ---
interface Message {
    actor: 'user' | 'ai' | 'app';
    text?: string;
    appId?: string;
    appName?: string;
    results?: any; // Structured results from an app
}

interface PexelsImage {
    id: string;
    src: string;
    photographer: string;
    alt: string;
}

interface SpotifyTrack {
    id: string;
    name: string;
    artist: string;
    albumArtUrl: string;
    trackUrl: string;
}

interface YouTubeVideo {
    id: string;
    title: string;
    channel: string;
    thumbnailUrl: string;
    videoUrl: string;
}

interface FinnhubQuote {
    symbol: string;
    price: number;
    change: number;
    percentChange: number;
    status: 'up' | 'down' | 'neutral';
}

interface GoogleMapPlace {
    placeId: string;
    name: string;
    address: string;
    rating: number;
    mapsUrl: string;
}

interface GiphyGif {
    id: string;
    title: string;
    url: string;
    pageUrl: string;
}

interface UnsplashPhoto {
    id: string;
    url: string;
    photographer: string;
    description: string | null;
    userProfileUrl: string;
}

interface SoundCloudTrack {
    id: string;
    title: string;
    user: string;
    artworkUrl: string;
    trackUrl: string;
}


// --- UI Panel Components ---

const PexelsResultsPanel: React.FC<{ results: { images: PexelsImage[] } }> = ({ results }) => {
    if (!results || !results.images) return null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {results.images.map(image => (
                <div key={image.id} className="bg-gray-200 rounded-lg overflow-hidden group relative aspect-square">
                    <img src={image.src} alt={image.alt} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="font-bold truncate">{image.alt}</p>
                        <p>by {image.photographer}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const SpotifyResultsPanel: React.FC<{ results: { tracks: SpotifyTrack[] } }> = ({ results }) => {
    if (!results || !results.tracks) return null;
    return (
        <div className="space-y-3">
            {results.tracks.map(track => (
                <a key={track.id} href={track.trackUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <img src={track.albumArtUrl} alt={`Album art for ${track.name}`} className="w-16 h-16 rounded-md object-cover" />
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900">{track.name}</p>
                        <p className="text-sm text-gray-600">{track.artist}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">arrow_forward_ios</span>
                </a>
            ))}
        </div>
    );
};

const YouTubeResultsPanel: React.FC<{ results: { videos: YouTubeVideo[] } }> = ({ results }) => {
    if (!results || !results.videos) return null;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.videos.map(video => (
                <a key={video.id} href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="bg-gray-50 hover:bg-gray-100 rounded-lg overflow-hidden transition-colors group">
                    <div className="aspect-video bg-black relative">
                        <img src={video.thumbnailUrl} alt={`Thumbnail for ${video.title}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-5xl text-white/80">play_circle</span>
                        </div>
                    </div>
                    <div className="p-3">
                        <p className="font-semibold text-sm text-gray-900 line-clamp-2">{video.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{video.channel}</p>
                    </div>
                </a>
            ))}
        </div>
    );
};

const FinnhubResultsPanel: React.FC<{ results: FinnhubQuote }> = ({ results }) => {
    const isUp = results.status === 'up';
    const colorClass = isUp ? 'text-green-600' : (results.status === 'down' ? 'text-red-600' : 'text-gray-600');
    const bgClass = isUp ? 'bg-green-50' : (results.status === 'down' ? 'bg-red-50' : 'bg-gray-100');
    const icon = isUp ? 'arrow_upward' : (results.status === 'down' ? 'arrow_downward' : 'remove');

    return (
        <div className={`p-4 rounded-lg border ${bgClass} border-gray-200`}>
            <div className="flex justify-between items-center">
                <p className="text-2xl font-bold font-mono">{results.symbol}</p>
                <p className="text-3xl font-semibold">{results.price.toFixed(2)}</p>
            </div>
            <div className={`flex justify-end items-center space-x-2 mt-1 ${colorClass}`}>
                <span className="material-symbols-outlined">{icon}</span>
                <span className="font-semibold">{results.change.toFixed(2)} ({results.percentChange.toFixed(2)}%)</span>
            </div>
        </div>
    );
};

const StarRating: React.FC<{ rating: number; className?: string }> = ({ rating, className }) => {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return (
        <div className={`flex items-center ${className}`}>
            {[...Array(fullStars)].map((_, i) => <span key={`full-${i}`} className="material-symbols-outlined text-yellow-500 text-base">star</span>)}
            {halfStar && <span className="material-symbols-outlined text-yellow-500 text-base">star_half</span>}
            {[...Array(emptyStars)].map((_, i) => <span key={`empty-${i}`} className="material-symbols-outlined text-gray-300 text-base">star</span>)}
            <span className="ml-2 text-sm text-gray-600 font-semibold">{rating.toFixed(1)}</span>
        </div>
    );
};

const GoogleMapsResultsPanel: React.FC<{ results: { places: GoogleMapPlace[] } }> = ({ results }) => {
    if (!results || !results.places) return null;
    return (
        <div className="space-y-3">
            {results.places.map(place => (
                <a key={place.placeId} href={place.mapsUrl} target="_blank" rel="noopener noreferrer" className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <p className="font-semibold text-gray-900">{place.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{place.address}</p>
                    <StarRating rating={place.rating} className="mt-2" />
                </a>
            ))}
        </div>
    );
};

const GiphyResultsPanel: React.FC<{ results: { gifs: GiphyGif[] } }> = ({ results }) => {
    if (!results || !results.gifs) return null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {results.gifs.map(gif => (
                <a key={gif.id} href={gif.pageUrl} target="_blank" rel="noopener noreferrer" className="bg-gray-200 rounded-lg overflow-hidden group relative aspect-square">
                    <img src={gif.url} alt={gif.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-4xl text-white/80">open_in_new</span>
                    </div>
                </a>
            ))}
        </div>
    );
};

const UnsplashResultsPanel: React.FC<{ results: { photos: UnsplashPhoto[] } }> = ({ results }) => {
    if (!results || !results.photos) return null;
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {results.photos.map(photo => (
                <div key={photo.id} className="bg-gray-200 rounded-lg overflow-hidden group relative aspect-square">
                    <img src={photo.url} alt={photo.description || 'Unsplash Photo'} className="w-full h-full object-cover" />
                    <a href={photo.userProfileUrl} target="_blank" rel="noopener noreferrer" className="absolute bottom-0 left-0 right-0 bg-black/60 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <p className="font-bold truncate">{photo.description || 'Untitled'}</p>
                        <p>by {photo.photographer}</p>
                    </a>
                </div>
            ))}
        </div>
    );
};

const SoundCloudResultsPanel: React.FC<{ results: { tracks: SoundCloudTrack[] } }> = ({ results }) => {
    if (!results || !results.tracks) return null;
    return (
        <div className="space-y-3">
            {results.tracks.map(track => (
                <a key={track.id} href={track.trackUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-4 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                    <img src={track.artworkUrl} alt={`Artwork for ${track.title}`} className="w-16 h-16 rounded-md object-cover" />
                    <div className="flex-1">
                        <p className="font-semibold text-gray-900">{track.title}</p>
                        <p className="text-sm text-gray-600">{track.user}</p>
                    </div>
                    <span className="material-symbols-outlined text-gray-400">arrow_forward_ios</span>
                </a>
            ))}
        </div>
    );
};


const AppPanels: { [key: string]: React.FC<any> } = {
    pexels: PexelsResultsPanel,
    spotify: SpotifyResultsPanel,
    youtube: YouTubeResultsPanel,
    finnhub: FinnhubResultsPanel,
    'google-maps': GoogleMapsResultsPanel,
    giphy: GiphyResultsPanel,
    unsplash: UnsplashResultsPanel,
    soundcloud: SoundCloudResultsPanel,
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

    if (message.actor === 'app' && message.appId) {
        const PanelComponent = AppPanels[message.appId];
        if (PanelComponent) {
            return (
                <div className={`${baseStyle} ${appStyle}`}>
                    <p className="text-sm font-semibold mb-2 text-gray-700">Here are the results from {message.appName}:</p>
                    <PanelComponent results={message.results} />
                </div>
            );
        }
    }
    
    // Fallback for other app panels
    if (message.actor === 'app') {
        return (
             <div className={`${baseStyle} ${aiStyle}`}>
                <p className="font-bold mb-2">Data from {message.appName}</p>
                <pre className="text-xs whitespace-pre-wrap bg-gray-100 p-2 rounded">{JSON.stringify(message.results, null, 2)}</pre>
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
        if (!userApiKey && !process.env.API_KEY) {
            throw new Error("Gemini API key is not set. Please add it in Settings.");
        }
        return new GoogleGenAI({ apiKey: userApiKey || process.env.API_KEY as string });
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
                setIsLoading(false);
                return;
            }
            
            const ai = getAiClient();
            
            let response;
            let results;
            
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
                          src: { type: Type.STRING, description: "A realistic-looking image URL from 'images.pexels.com', using a width of 600, e.g., 'https://images.pexels.com/photos/12345/pexels-photo-12345.jpeg?auto=compress&cs=tinysrgb&w=600'" },
                          photographer: { type: Type.STRING },
                          alt: { type: Type.STRING }
                        },
                        required: ['id', 'src', 'photographer', 'alt']
                      }
                    }
                  },
                  required: ['images']
                };
                const prompt = `You are an AI assistant that interfaces with the Pexels API. User's request: "${trimmedInput}". Your task is to act as if you queried the Pexels API and return a JSON object with realistic-looking data that matches the user's request and the provided schema. Generate 6 image results. Your response MUST be ONLY the JSON object.`;
                response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: pexelsSchema } });
                results = JSON.parse(response.text);

            } else if (activeApp.id === 'giphy') {
                const giphySchema = {
                    type: Type.OBJECT,
                    properties: {
                        gifs: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    url: { type: Type.STRING, description: "A realistic-looking GIF URL from media.giphy.com" },
                                    pageUrl: { type: Type.STRING, description: "A realistic URL to the Giphy page" }
                                },
                                required: ['id', 'title', 'url', 'pageUrl']
                            }
                        }
                    },
                    required: ['gifs']
                };
                const prompt = `You are an AI assistant for Giphy. User's request: "${trimmedInput}". Return a JSON object of 6 realistic GIFs matching the request and schema. Response MUST be ONLY the JSON object.`;
                response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: giphySchema } });
                results = JSON.parse(response.text);

            } else if (activeApp.id === 'unsplash') {
                const unsplashSchema = {
                    type: Type.OBJECT,
                    properties: {
                        photos: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    url: { type: Type.STRING, description: "A realistic image URL from images.unsplash.com with width and quality parameters" },
                                    photographer: { type: Type.STRING },
                                    description: { type: Type.STRING, nullable: true },
                                    userProfileUrl: { type: Type.STRING, description: "A realistic URL to the photographer's profile on unsplash.com" }
                                },
                                required: ['id', 'url', 'photographer', 'description', 'userProfileUrl']
                            }
                        }
                    },
                    required: ['photos']
                };
                const prompt = `You are an AI assistant for Unsplash. User's request: "${trimmedInput}". Return a JSON object of 6 realistic photos matching the request and schema. Response MUST be ONLY the JSON object.`;
                response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: unsplashSchema } });
                results = JSON.parse(response.text);
            
            } else if (activeApp.id === 'soundcloud') {
                const soundcloudSchema = {
                    type: Type.OBJECT,
                    properties: {
                        tracks: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    title: { type: Type.STRING },
                                    user: { type: Type.STRING, description: "The artist or user who uploaded the track" },
                                    artworkUrl: { type: Type.STRING, description: "A realistic URL from i1.sndcdn.com" },
                                    trackUrl: { type: Type.STRING, description: "A realistic URL to the track page on soundcloud.com" }
                                },
                                required: ['id', 'title', 'user', 'artworkUrl', 'trackUrl']
                            }
                        }
                    },
                    required: ['tracks']
                };
                const prompt = `You are an AI assistant for SoundCloud. User's request: "${trimmedInput}". Return a JSON object of 5 realistic tracks matching the request and schema. Response MUST be ONLY the JSON object.`;
                response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: soundcloudSchema } });
                results = JSON.parse(response.text);

            } else if (activeApp.id === 'spotify') {
                const spotifySchema = { type: Type.OBJECT, properties: { tracks: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, artist: { type: Type.STRING }, albumArtUrl: { type: Type.STRING, description: "A realistic URL from i.scdn.co" }, trackUrl: { type: Type.STRING, description: "A realistic URL from open.spotify.com/track/..." } }, required: ['id', 'name', 'artist', 'albumArtUrl', 'trackUrl'] } } }, required: ['tracks'] };
                const prompt = `You are an AI assistant for Spotify. User's request: "${trimmedInput}". Return a JSON object of 5 realistic tracks matching the request and the schema. Response MUST be ONLY the JSON object.`;
                response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: spotifySchema } });
                results = JSON.parse(response.text);

            } else if (activeApp.id === 'youtube') {
                const youtubeSchema = { type: Type.OBJECT, properties: { videos: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, title: { type: Type.STRING }, channel: { type: Type.STRING }, thumbnailUrl: { type: Type.STRING, description: "A realistic URL from i.ytimg.com" }, videoUrl: { type: Type.STRING, description: "A realistic URL from youtube.com/watch?v=..." } }, required: ['id', 'title', 'channel', 'thumbnailUrl', 'videoUrl'] } } }, required: ['videos'] };
                const prompt = `You are an AI assistant for YouTube. User's request: "${trimmedInput}". Return a JSON object of 4 realistic videos matching the request and schema. Response MUST be ONLY the JSON object.`;
                response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: youtubeSchema } });
                results = JSON.parse(response.text);

            } else if (activeApp.id === 'finnhub') {
                const finnhubSchema = { type: Type.OBJECT, properties: { symbol: { type: Type.STRING }, price: { type: Type.NUMBER }, change: { type: Type.NUMBER }, percentChange: { type: Type.NUMBER }, status: { type: Type.STRING, enum: ['up', 'down', 'neutral'] } }, required: ['symbol', 'price', 'change', 'percentChange', 'status'] };
                const prompt = `You are an AI stock market assistant for Finnhub. User's request: "${trimmedInput}". Return a JSON object with a realistic stock quote for the requested symbol. Determine the 'status' based on the 'change' value. Response MUST be ONLY the JSON object.`;
                response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: finnhubSchema } });
                results = JSON.parse(response.text);

            } else if (activeApp.id === 'google-maps') {
                const mapsSchema = { type: Type.OBJECT, properties: { places: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { placeId: { type: Type.STRING }, name: { type: Type.STRING }, address: { type: Type.STRING }, rating: { type: Type.NUMBER, description: "A number between 1 and 5" }, mapsUrl: { type: Type.STRING, description: "A realistic google.com/maps URL" } }, required: ['placeId', 'name', 'address', 'rating', 'mapsUrl'] } } }, required: ['places'] };
                const prompt = `You are an AI assistant for Google Maps. User's request: "${trimmedInput}". Return a JSON object of 3 realistic places matching the request and schema. Response MUST be ONLY the JSON object.`;
                response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt, config: { responseMimeType: 'application/json', responseSchema: mapsSchema } });
                results = JSON.parse(response.text);

            } else {
                 setMessages(prev => [...prev, { actor: 'ai', text: `I'm ready to chat with ${activeApp.name}, but my developer hasn't built my special panel for it yet!` }]);
                 setIsLoading(false);
                 return;
            }

            setMessages(prev => [...prev, { actor: 'app', appId: activeApp.id, appName: activeApp.name, results }]);

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