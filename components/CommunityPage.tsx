import React, { useState, useEffect } from 'react';
import type { SupabaseConfig } from '../App';

declare const supabase: any;

interface CommunityApp {
    id: number;
    name: string;
    description: string;
    created_at: string;
}

interface CommunityPageProps {
    supabaseConfig: SupabaseConfig | null;
}

export const CommunityPage: React.FC<CommunityPageProps> = ({ supabaseConfig }) => {
    const [apps, setApps] = useState<CommunityApp[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchApps = async () => {
            if (!supabaseConfig) {
                setError("Database connection is not configured. Please set up Supabase in Settings to view the community page.");
                setIsLoading(false);
                return;
            }

            try {
                const supabaseClient = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
                const { data, error: dbError } = await supabaseClient
                    .from('community_apps')
                    .select('id, name, description, created_at')
                    .order('created_at', { ascending: false });

                if (dbError) throw dbError;

                setApps(data || []);
            } catch (err: any) {
                setError(`Failed to fetch community apps: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchApps();
    }, [supabaseConfig]);

    return (
        <div className="flex flex-col h-full p-8 pt-28 overflow-y-auto">
            <div className="w-full max-w-5xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-bold text-black mb-2">Community Showcase</h1>
                    <p className="text-lg text-gray-600">Discover and explore apps built by the Silo Build community.</p>
                </header>

                {isLoading && (
                    <div className="text-center py-16">
                        <div className="w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-gray-500 mt-4">Loading apps...</p>
                    </div>
                )}
                
                {error && (
                    <div className="text-center py-16 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-700">{error}</p>
                        <a href="#/settings" className="mt-4 inline-block px-4 py-2 bg-black text-white rounded-full font-semibold text-sm">Go to Settings</a>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {apps.map(app => (
                            <a 
                                key={app.id} 
                                href={`#/community/${app.name}`}
                                className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col justify-between aspect-[4/3] transition-all duration-300 hover:shadow-xl hover:border-blue-300 hover:-translate-y-1"
                            >
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{app.name}</h3>
                                    <p className="text-sm text-gray-500 leading-snug line-clamp-3">{app.description || 'No description provided.'}</p>
                                </div>
                                <div className="flex justify-end items-center mt-4">
                                    <p className="text-xs text-gray-400">
                                        {new Date(app.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
                 {!isLoading && !error && apps.length === 0 && (
                     <div className="text-center py-16 text-gray-500">
                        <p>No community apps have been published yet.</p>
                        <p>Be the first to share your creation!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
