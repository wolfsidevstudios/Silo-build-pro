
import React, { useState, useEffect } from 'react';
import { Preview } from './Preview';
import type { SupabaseConfig, ProjectFile, ProjectType } from '../App';

declare const supabase: any;

interface CommunityAppViewerPageProps {
    appName: string;
    supabaseConfig: SupabaseConfig | null;
}

export const CommunityAppViewerPage: React.FC<CommunityAppViewerPageProps> = ({ appName, supabaseConfig }) => {
    const [project, setProject] = useState<{ files: ProjectFile[], projectType: ProjectType } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const fetchApp = async () => {
            if (!supabaseConfig) {
                setError("Database connection is not configured. This app cannot be displayed.");
                setIsLoading(false);
                return;
            }
             if (!appName) {
                setError("No app name provided in the URL.");
                setIsLoading(false);
                return;
            }

            try {
                const supabaseClient = supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
                const { data, error: dbError } = await supabaseClient
                    .from('community_apps')
                    .select('project_files, project_type')
                    .eq('name', appName)
                    .single();

                if (dbError || !data) throw dbError || new Error('App not found.');

                setProject({ files: data.project_files, projectType: data.project_type });
            } catch (err: any) {
                setError(`Failed to load app "${appName}": ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchApp();
    }, [appName, supabaseConfig]);

    if (isLoading) {
        return (
            <div className="w-screen h-screen flex flex-col items-center justify-center text-center bg-gray-50">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-500 mt-4">Loading <span className="font-semibold">{appName}</span>...</p>
            </div>
        );
    }
    
    if (error) {
         return (
            <div className="w-screen h-screen flex flex-col items-center justify-center text-center bg-red-50 p-4">
                <span className="material-symbols-outlined text-5xl text-red-500">error</span>
                <h1 className="text-2xl font-bold mt-4 text-red-800">Could not load app</h1>
                <p className="text-red-700 mt-2">{error}</p>
                 <a href="#/community" className="mt-6 inline-block px-4 py-2 bg-black text-white rounded-full font-semibold text-sm">Back to Community</a>
            </div>
        );
    }

    if (!project) {
        return <div className="w-screen h-screen flex items-center justify-center">App not found.</div>
    }

    return (
        <div className="w-screen h-screen bg-white">
            <Preview 
                files={project.files}
                projectType={project.projectType}
                projectName={appName}
                previewMode="web" // Always use 'web' mode for community apps
                onRuntimeError={(msg) => setRuntimeError(msg)}
                iframeRef={iframeRef}
            />
            {runtimeError && (
                 <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-900/80 backdrop-blur-sm text-white p-3 rounded-lg text-xs font-mono max-w-xl shadow-lg">
                    <p>Runtime Error: {runtimeError}</p>
                 </div>
            )}
            <a href="#/community" title="Back to Community" className="absolute top-4 left-4 w-10 h-10 bg-black/50 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined">arrow_back</span>
            </a>
        </div>
    );
};
