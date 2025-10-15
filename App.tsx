
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useDebounce } from './hooks/useDebounce';
import { DEFAULT_CODE } from './constants';
import { ChatPanel } from './components/ChatPanel';
import { Workspace } from './components/Workspace';
import { FloatingNav } from './components/FloatingNav';
import { HomePage } from './components/HomePage';
import { ProjectsPage } from './components/ProjectsPage';
import { SettingsPage } from './components/SettingsPage';
import { SupabaseConnectModal } from './components/SupabaseConnectModal';
import { AuthorizedPage } from './components/AuthorizedPage';


declare const Babel: any;

interface ProjectSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (projectRef: string) => void;
  isLoading: boolean;
}

const ProjectSelectorModal: React.FC<ProjectSelectorModalProps> = ({ isOpen, onClose, onConnect, isLoading }) => {
  const [projectRef, setProjectRef] = useState('');

  if (!isOpen) return null;

  const handleConnect = () => {
    if (projectRef.trim()) {
      onConnect(projectRef.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-zinc-900 border border-gray-800 rounded-2xl p-8 w-full max-w-lg relative text-white" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold">Almost there!</h2>
          <p className="text-gray-400 mt-2">Authentication successful. Please provide your Project Reference ID to complete the connection.</p>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="supabase-ref" className="block text-sm font-medium text-gray-400 mb-2">
              Project Reference ID
            </label>
            <input
              id="supabase-ref"
              type="text"
              value={projectRef}
              onChange={(e) => setProjectRef(e.target.value)}
              placeholder="e.g., abcdefghijklmnopqrst"
              className="w-full p-3 bg-zinc-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
             <p className="text-xs text-gray-500 mt-2">
              You can find this in your Supabase project's General Settings page.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleConnect}
            disabled={!projectRef.trim() || isLoading}
            className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? 'Connecting...' : 'Connect Project'}
          </button>
        </div>
      </div>
    </div>
  );
};

// PKCE Helper Functions
const generateRandomString = (length: number): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const sha256 = async (plain: string): Promise<ArrayBuffer> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64urlencode = (a: ArrayBuffer): string => {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(a) as any))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};


export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

export interface Message {
  actor: 'user' | 'ai' | 'system';
  text: string;
  plan?: string[];
}

export interface ProjectFile {
    path: string;
    code: string;
}

export interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
  messages: Message[];
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseAccessToken?: string;
  supabaseProjectRef?: string;
  supabaseSql?: string;
}

const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(window.location.hash.replace(/^#/, '') || '/home');
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash');
  const [progress, setProgress] = useState<number | null>(null);
  
  const [tempSupabaseToken, setTempSupabaseToken] = useState<string | null>(null);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isSupabaseConnectModalOpen, setIsSupabaseConnectModalOpen] = useState(false);
  
  const [projectToBuild, setProjectToBuild] = useState<{projectId: string, prompt: string} | null>(null);


  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem('silo_projects');
      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (e) {
      console.error("Failed to load projects from local storage", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('silo_projects', JSON.stringify(projects));
  }, [projects]);
  
  useEffect(() => {
    const handleHashChange = () => {
      setLocation(window.location.hash.replace(/^#/, '') || '/home');
    };
    window.addEventListener('hashchange', handleHashChange);
    
    const path = window.location.hash.replace(/^#/, '');
    const projectMatch = path.match(/^\/project\/([\w-]+)$/);
    if (projectMatch) {
        setActiveProjectId(projectMatch[1]);
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const projectMatch = location.match(/^\/project\/([\w-]+)$/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      if (projectId !== activeProjectId) {
        setActiveProjectId(projectId);
      }
    } else {
      if (activeProjectId !== null) {
        setActiveProjectId(null);
      }
    }
  }, [location, activeProjectId]);

  
  useEffect(() => {
    const exchangeCodeForToken = async (code: string) => {
      const codeVerifier = sessionStorage.getItem('supabase_code_verifier');
      if (!codeVerifier) {
          setError("Supabase Authentication Error: Could not find code verifier. Please try authenticating again.");
          return;
      }
      sessionStorage.removeItem('supabase_code_verifier');

      try {
        setIsLoading(true);
        const SUPABASE_CLIENT_ID = 'c5eb27f8-43d3-4e20-84d9-69bdd80267a7';
        const redirectUri = window.location.origin;

        const response = await fetch('https://api.supabase.com/v1/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: SUPABASE_CLIENT_ID,
            code: code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error_description || 'Failed to exchange authorization code for token.');
        }

        const { access_token } = await response.json();

        if (access_token) {
          const lastActiveId = localStorage.getItem('silo_last_active_project');
          if (!lastActiveId) {
            setError("Could not determine the active project after Supabase redirect. Please try connecting again from the project workspace.");
            return;
          }
          setActiveProjectId(lastActiveId);
          setTempSupabaseToken(access_token);
          setIsProjectSelectorOpen(true);
        } else {
          throw new Error('Access token not found in response.');
        }
      } catch (err: any) {
        setError(`Supabase Authentication Error: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error_description');

    if (errorParam) {
      setError(`Supabase Auth Error: ${errorParam}`);
      window.history.replaceState(null, document.title, window.location.pathname);
    } else if (code) {
      window.history.replaceState(null, document.title, window.location.pathname);
      exchangeCodeForToken(code);
    }
  }, []);

  useEffect(() => {
    if(activeProjectId) {
      localStorage.setItem('silo_last_active_project', activeProjectId);
    }
  }, [activeProjectId]);

  useEffect(() => {
    const savedModel = localStorage.getItem('gemini_model') as GeminiModel;
    if (savedModel && (savedModel === 'gemini-2.5-flash' || savedModel === 'gemini-2.5-pro')) {
      setModel(savedModel);
    }
  }, []);
  
  useEffect(() => {
    const build = async () => {
      if (projectToBuild) {
        const { projectId, prompt } = projectToBuild;
        setProjectToBuild(null);

        try {
          await runBuildProcess(prompt, [{ path: 'src/App.tsx', code: DEFAULT_CODE }], projectId);
        } catch (err: any) {
          const errorMessage = `AI Error: ${err.message}`;
          setError(errorMessage);
          addMessageToProject(projectId, { actor: 'system', text: `Sorry, I encountered an error starting the build. ${err.message}` });
          setIsLoading(false);
          setProgress(null);
        }
      }
    };
    build();
  }, [projectToBuild]);


  const handleRuntimeError = useCallback((message: string) => {
    setError(`Runtime Error: ${message}`);
  }, []);
  
  const getAiClient = () => {
    const userApiKey = localStorage.getItem('gemini_api_key');
    const apiKey = userApiKey || process.env.API_KEY as string;
    
    if (!apiKey) {
      throw new Error("Gemini API key is not set. Please add it in Settings.");
    }
    return new GoogleGenAI({ apiKey });
  }

  const generatePlan = async (prompt: string, selectedModel: GeminiModel): Promise<{plan: string[], sql: string}> => {
    const ai = getAiClient();
    const activeProjectForPrompt = projects.find(p => p.id === activeProjectId);
    const supabaseContext = activeProjectForPrompt?.supabaseUrl ? `The project is connected to Supabase, so for any data persistence requirements, plan to use Supabase client.` : ``;

    const planPrompt = `
      You are a senior software architect. Based on the user's request, create a concise, step-by-step plan for building the React application. 
      This plan should include a list of all the files you intend to create or modify.
      ${supabaseContext}
      If you need to use a database table, provide the SQL code to create it. If no database is needed, the "sql" field should be an empty string.

      Respond ONLY with a JSON object matching this schema:
      {
        "plan": ["A list of steps for the implementation, including file creation."],
        "sql": "The SQL code to create tables, if needed. Use 'CREATE TABLE IF NOT EXISTS' syntax."
      }
      
      User Request: "${prompt}"
    `;
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: planPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plan: { type: Type.ARRAY, items: { type: Type.STRING } },
            sql: { type: Type.STRING }
          }
        }
      }
    });

    if (!response.text || response.promptFeedback?.blockReason) {
        throw new Error(`The AI response for planning was blocked. Reason: ${response.promptFeedback?.blockReason || 'No content returned'}. Please modify your prompt.`);
    }

    try {
      const parsed = JSON.parse(response.text);
      return {
          plan: parsed.plan || [],
          sql: parsed.sql || ''
      };
    } catch (e) {
      console.error("Failed to parse plan and SQL:", e);
      return {
          plan: ["Could not generate a plan, proceeding with build.", "I will try my best to match your request."],
          sql: ""
      };
    }
  };

  const generateCode = async (prompt: string, currentFiles: ProjectFile[], plan: string[], selectedModel: GeminiModel) => {
    const ai = getAiClient();
    const activeProjectForPrompt = projects.find(p => p.id === activeProjectId);
    const supabaseIntegrationPrompt = activeProjectForPrompt?.supabaseUrl && activeProjectForPrompt?.supabaseAnonKey ? `
      **Supabase Integration:**
      - This project is connected to a Supabase backend.
      - Supabase Project URL: "${activeProjectForPrompt.supabaseUrl}"
      - Supabase Anon Key: "${activeProjectForPrompt.supabaseAnonKey}"
      - You MUST use the '@supabase/supabase-js' library. The library is already loaded in the environment. You can access it via the global \`supabase\` object.
      - Initialize the client like this: \`const supabaseClient = supabase.createClient("${activeProjectForPrompt.supabaseUrl}", "${activeProjectForPrompt.supabaseAnonKey}");\`
    ` : '';
    
    const fullPrompt = `
      You are an expert React developer. Based on the user's request, the plan, and the current file structure, generate the complete code for ALL necessary files.

      **File Generation Rules:**
      - Your output MUST be a JSON object containing a single key "files", which is an array of file objects.
      - Each file object must have two keys: "path" (e.g., "src/App.tsx", "src/components/Button.tsx") and "code" (the full file content as a string).
      - You MUST provide the full code for ALL necessary files for the application to work. Do not omit files.
      - The main application component that should be rendered MUST be the default export of "src/App.tsx".
      - Use ES Modules for imports/exports. Crucially, you MUST include the full file extension in your import paths (e.g., \`import Button from './components/Button.tsx'\`). This is required for the in-browser module resolver to work.
      - Your code should be clean, modern, and use Tailwind CSS for styling.

      ${supabaseIntegrationPrompt}
      
      **The user's request is:** "${prompt}".
      **The plan is:**
      - ${plan.join('\n- ')}
      **The current files are:**
      ${JSON.stringify(currentFiles, null, 2)}

      Your response MUST contain ONLY the JSON object, with no other text or markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: fullPrompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  files: {
                      type: Type.ARRAY,
                      items: {
                          type: Type.OBJECT,
                          properties: {
                              path: { type: Type.STRING },
                              code: { type: Type.STRING },
                          },
                          required: ['path', 'code']
                      }
                  }
              },
              required: ['files']
          },
      }
    });

    if (!response.text || response.promptFeedback?.blockReason) {
        throw new Error(`The AI response was blocked. Reason: ${response.promptFeedback?.blockReason || 'No content returned'}. Please modify your prompt and try again.`);
    }

    try {
        const parsed = JSON.parse(response.text);
        if (!parsed.files || !Array.isArray(parsed.files)) {
            throw new Error("AI response is missing the 'files' array.");
        }
        return parsed.files;
    } catch (e) {
        console.error("Failed to parse AI code response:", response.text);
        throw new Error("The AI did not return valid JSON for the file structure. Please try again.");
    }
  };
  
  const updateProjectState = (projectId: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updates } : p));
  };
  
  const addMessageToProject = (projectId: string, message: Message) => {
    setProjects(prev => prev.map(p => 
      p.id === projectId ? { ...p, messages: [...p.messages, message] } : p
    ));
  };

  const runBuildProcess = async (prompt: string, baseFiles: ProjectFile[], projectId: string) => {
    setIsLoading(true);
    setError(null);

    const { plan, sql } = await generatePlan(prompt, model);
    addMessageToProject(projectId, { actor: 'ai', text: "Here's the plan:", plan });
    
    if (sql) {
      updateProjectState(projectId, { supabaseSql: sql });
    }

    setProgress(0);
    const codePromise = generateCode(prompt, baseFiles, plan, model);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev === null) return null;
        if (prev >= 95) {
          clearInterval(interval);
          return prev;
        }
        const increment = prev < 70 ? 5 : 2;
        return Math.min(prev + increment, 95);
      });
    }, 400);

    const newFiles = await codePromise;
    clearInterval(interval);
    setProgress(100);

    updateProjectState(projectId, { files: newFiles });
    addMessageToProject(projectId, { actor: 'ai', text: 'I have created the code for you. Check it out and let me know what to do next!' });
    
    setTimeout(() => {
      setProgress(null);
      setIsLoading(false);
    }, 500);
  };

  const createNewProject = (prompt: string) => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    const newProject: Project = {
        id: Date.now().toString(),
        name: prompt.length > 40 ? prompt.substring(0, 37) + '...' : prompt,
        files: [{ path: 'src/App.tsx', code: DEFAULT_CODE }],
        messages: [{ actor: 'user', text: prompt }],
    };
    
    setProjects(prev => [...prev, newProject]);
    
    setProjectToBuild({ projectId: newProject.id, prompt });
    window.location.hash = `/project/${newProject.id}`;
  };
  
  const handleSend = async () => {
    if (!userInput.trim() || isLoading || !activeProject) return;

    const currentInput = userInput;
    addMessageToProject(activeProject.id, { actor: 'user', text: currentInput });
    setUserInput('');

    try {
      await runBuildProcess(currentInput, activeProject.files, activeProject.id);
    } catch (err: any) {
      const errorMessage = `AI Error: ${err.message}`;
      setError(errorMessage);
      addMessageToProject(activeProject.id, { actor: 'system', text: `Sorry, I encountered an error. ${err.message}` });
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleModelChange = (newModel: GeminiModel) => {
    setModel(newModel);
    localStorage.setItem('gemini_model', newModel);
  };

  const handleSelectProject = (projectId: string) => {
    window.location.hash = `/project/${projectId}`;
  };
  
  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    if (activeProjectId === projectId) {
      window.location.hash = '/home';
    }
  };

  const handleConnectSupabaseClick = async () => {
    setIsSupabaseConnectModalOpen(false);
    
    const codeVerifier = generateRandomString(128);
    sessionStorage.setItem('supabase_code_verifier', codeVerifier);
    const codeChallenge = base64urlencode(await sha256(codeVerifier));

    const SUPABASE_CLIENT_ID = 'c5eb27f8-43d3-4e20-84d9-69bdd80267a7';
    const redirectUri = window.location.origin;
    const scopes = 'project:read';
    
    const authUrl = new URL('https://api.supabase.com/v1/oauth/authorize');
    authUrl.searchParams.set('client_id', SUPABASE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    window.location.href = authUrl.toString();
  };

  const handleProjectRefSubmit = async (projectRef: string) => {
    const lastActiveProjectId = activeProjectId || localStorage.getItem('silo_last_active_project');

    if (!tempSupabaseToken || !lastActiveProjectId) {
      setError("An authentication error occurred. Please try connecting again.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/api-keys`, {
        headers: {
          'Authorization': `Bearer ${tempSupabaseToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch project details from Supabase. Status: ${response.status}`);
      }
      
      const apiKeys = await response.json();
      const anonKey = apiKeys.find((k: any) => k.name === 'anon')?.api_key;
      
      if (!anonKey) {
        throw new Error("Could not find the public anon key for your project. Please ensure you have the correct Project Reference ID and permissions.");
      }
      
      const projectUrl = `https://${projectRef}.supabase.co`;
      
      updateProjectState(lastActiveProjectId, { 
        supabaseAccessToken: tempSupabaseToken,
        supabaseProjectRef: projectRef,
        supabaseUrl: projectUrl, 
        supabaseAnonKey: anonKey 
      });
      
      addMessageToProject(lastActiveProjectId, { actor: 'system', text: 'Supabase connected successfully! I can now use it for backend features.' });
      
      sessionStorage.setItem('silo_authorized_project_id', lastActiveProjectId);
      setIsProjectSelectorOpen(false);
      setTempSupabaseToken(null);
      window.location.hash = '/authorized';
      
    } catch (err: any) {
      setError(`Supabase Connection Error: ${err.message}`);
      if (lastActiveProjectId) {
         addMessageToProject(lastActiveProjectId, { actor: 'system', text: `Failed to connect Supabase. ${err.message}`});
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSupabaseConnect = (url: string, anonKey: string) => {
    if (!activeProjectId) {
      setError("Cannot connect manually without an active project.");
      return;
    }

    try {
      new URL(url);
      if (!anonKey.startsWith('ey')) {
          throw new Error("Invalid Anon Key format. It should start with 'ey'.");
      }
    } catch (err: any) {
      setError(`Invalid Supabase details: ${err.message}`);
      return;
    }

    updateProjectState(activeProjectId, { 
      supabaseUrl: url, 
      supabaseAnonKey: anonKey 
    });
    
    addMessageToProject(activeProjectId, { actor: 'system', text: 'Supabase connected manually! I can now use it for backend features.' });
    setIsSupabaseConnectModalOpen(false);
  };

  const renderContent = () => {
    const path = location.startsWith('/') ? location : `/${location}`;

    if (path === '/home') {
      return <HomePage onStartBuild={createNewProject} isLoading={isLoading} />;
    }
    if (path === '/projects') {
      return <ProjectsPage projects={projects} onSelectProject={handleSelectProject} onDeleteProject={handleDeleteProject} />;
    }
    if (path === '/settings') {
      return <SettingsPage selectedModel={model} onModelChange={handleModelChange} />;
    }
     if (path === '/authorized') {
      return <AuthorizedPage />;
    }

    const projectMatch = path.match(/^\/project\/([\w-]+)$/);
    if (projectMatch && activeProject) {
      return (
        <>
          <main className="flex flex-1 overflow-hidden">
            <div className="w-1/3 max-w-md flex flex-col border-r border-gray-900">
              <ChatPanel
                messages={activeProject.messages}
                userInput={userInput}
                onUserInput={setUserInput}
                onSend={handleSend}
                isLoading={isLoading}
                progress={progress}
              />
            </div>
            <div className="flex-1 flex flex-col">
              <Workspace
                files={activeProject.files}
                onRuntimeError={handleRuntimeError}
                isSupabaseConnected={!!activeProject.supabaseUrl}
                onOpenSupabaseConnectModal={() => setIsSupabaseConnectModalOpen(true)}
                supabaseSql={activeProject.supabaseSql}
              />
            </div>
          </main>
          <ErrorDisplay error={error} onClose={() => setError(null)} />
        </>
      );
    }
     if (projectMatch && !activeProject && projects.length > 0) {
       return (
           <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <h1 className="text-4xl font-bold text-gray-400">Loading Project...</h1>
              <p className="text-gray-500 mt-2">If this takes too long, the project might not exist.</p>
          </div>
      );
    }

    return <HomePage onStartBuild={createNewProject} isLoading={isLoading} />;
  };


  return (
    <div className="flex h-screen bg-black text-white font-sans">
      <FloatingNav currentPath={location} />
      <div className="flex-1 flex flex-col overflow-hidden ml-20">
        {renderContent()}
      </div>
       <ProjectSelectorModal
        isOpen={isProjectSelectorOpen}
        onClose={() => setIsProjectSelectorOpen(false)}
        onConnect={handleProjectRefSubmit}
        isLoading={isLoading}
      />
      <SupabaseConnectModal
        isOpen={isSupabaseConnectModalOpen}
        onClose={() => setIsSupabaseConnectModalOpen(false)}
        onAuthorize={handleConnectSupabaseClick}
        onManualConnect={handleManualSupabaseConnect}
        isLoading={isLoading}
      />
    </div>
  );
};

export default App;
