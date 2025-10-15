
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
import { AuthorizedPage } from './components/AuthorizedPage';
import DebugAssistPanel from './components/DebugAssistPanel';
import { PublishModal, PublishState } from './components/PublishModal';


declare const Babel: any;
declare const JSZip: any;

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
export type ProjectType = 'single' | 'multi';
export type PreviewMode = 'iframe' | 'service-worker';

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
  supabaseSql?: string;
  projectType: ProjectType;
  netlifySiteId?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  projectRef: string;
  accessToken: string;
}

const App: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(window.location.hash.replace(/^#/, '') || '/home');
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash');
  const [progress, setProgress] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('iframe');
  
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null);
  const [tempSupabaseToken, setTempSupabaseToken] = useState<string | null>(null);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isDebugAssistOpen, setIsDebugAssistOpen] = useState(false);
  
  const [projectToBuild, setProjectToBuild] = useState<{projectId: string, prompt: string, projectType: ProjectType} | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });


  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem('silo_projects');
      if (savedProjects) {
        const parsedProjects: Project[] = JSON.parse(savedProjects);
        // Add default projectType if missing for backward compatibility
        const migratedProjects = parsedProjects.map(p => ({
            ...p,
            projectType: p.projectType || 'multi' 
        }));
        setProjects(migratedProjects);
      }
      const savedSupabaseConfig = localStorage.getItem('silo_supabase_config');
      if (savedSupabaseConfig) {
        setSupabaseConfig(JSON.parse(savedSupabaseConfig));
      }
      const savedPreviewMode = localStorage.getItem('silo_preview_mode') as PreviewMode;
      if (savedPreviewMode) {
        setPreviewMode(savedPreviewMode);
      }
    } catch (e) {
      console.error("Failed to load data from local storage", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('silo_projects', JSON.stringify(projects));
  }, [projects]);
  
  useEffect(() => {
    if (supabaseConfig) {
      localStorage.setItem('silo_supabase_config', JSON.stringify(supabaseConfig));
    } else {
      localStorage.removeItem('silo_supabase_config');
    }
  }, [supabaseConfig]);

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
          setErrors(prev => ["Supabase Authentication Error: Could not find code verifier. Please try authenticating again.", ...prev]);
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
          setTempSupabaseToken(access_token);
          setIsProjectSelectorOpen(true);
        } else {
          throw new Error('Access token not found in response.');
        }
      } catch (err: any) {
        setErrors(prev => [`Supabase Authentication Error: ${err.message}`, ...prev]);
      } finally {
        setIsLoading(false);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const errorParam = params.get('error_description');

    if (errorParam) {
      setErrors(prev => [`Supabase Auth Error: ${errorParam}`, ...prev]);
      window.history.replaceState(null, document.title, window.location.pathname);
    } else if (code) {
      window.history.replaceState(null, document.title, window.location.pathname);
      exchangeCodeForToken(code);
    }
  }, []);

  useEffect(() => {
    const savedModel = localStorage.getItem('gemini_model') as GeminiModel;
    if (savedModel && (savedModel === 'gemini-2.5-flash' || savedModel === 'gemini-2.5-pro')) {
      setModel(savedModel);
    }
  }, []);
  
  useEffect(() => {
    const build = async () => {
      if (projectToBuild) {
        const { projectId, prompt, projectType } = projectToBuild;
        setProjectToBuild(null);

        try {
          await runBuildProcess(prompt, [{ path: 'src/App.tsx', code: DEFAULT_CODE }], projectId, projectType);
        } catch (err: any) {
          const errorMessage = `AI Error: ${err.message}`;
          setErrors(prev => [errorMessage, ...prev]);
          addMessageToProject(projectId, { actor: 'system', text: `Sorry, I encountered an error starting the build. ${err.message}` });
          setIsLoading(false);
          setProgress(null);
        }
      }
    };
    build();
  }, [projectToBuild]);


  const handleRuntimeError = useCallback((message: string) => {
    setErrors(prev => {
      const filtered = prev.filter(e => e !== message);
      return [message, ...filtered];
    });
    setIsDebugAssistOpen(true);
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
    const supabaseContext = supabaseConfig ? `The project is connected to Supabase project "${supabaseConfig.projectRef}", so for any data persistence requirements, plan to use the Supabase client.` : ``;

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

  const generateCode = async (prompt: string, currentFiles: ProjectFile[], plan: string[], selectedModel: GeminiModel, projectType: ProjectType) => {
    const ai = getAiClient();
    const supabaseIntegrationPrompt = supabaseConfig ? `
      **Supabase Integration:**
      - This project is connected to a Supabase backend.
      - Supabase Project URL: "${supabaseConfig.url}"
      - Supabase Anon Key: "${supabaseConfig.anonKey}"
      - You MUST use the '@supabase/supabase-js' library. The library is already loaded in the environment. You can access it via the global \`supabase\` object.
      - Initialize the client like this: \`const supabaseClient = supabase.createClient("${supabaseConfig.url}", "${supabaseConfig.anonKey}");\`
    ` : '';
    
    const projectTypeInstructions = projectType === 'single'
    ? `
        **Project Type:** Single File
        **Constraint:** You MUST generate all code within a single file: 'src/App.tsx'. Do not create any other files or components. All logic, components, and styles must be contained within this one file. The final output MUST have only one file object in the "files" array.
    `
    : `
        **Project Type:** Multi-File
        **Guideline:** You MUST break down the application into logical, reusable components, each in its own file (e.g., 'src/components/Button.tsx'). Follow a clean, modular file structure. Do not put everything in a single file unless it is a very simple component.
    `;

    const fullPrompt = `
      You are an expert React developer. Based on the user's request, the plan, and the current file structure, generate the complete code for ALL necessary files.

      ${projectTypeInstructions}

      **Design System & UI Guidelines:**
      - **Overall Style:** Create modern, clean, and aesthetically pleasing interfaces.
      - **Background:** The main application background MUST be white.
      - **Buttons:** All buttons MUST be pill-shaped (fully rounded corners). Primary call-to-action buttons should be solid black with white text. Secondary buttons should be outlined with a thin border.
      - **Icons:** You MUST use icons from the Google Material Symbols library (the 'outlined' style). The library is already available. Example: \`<span className="material-symbols-outlined">icon_name</span>\`.
      - **Navigation Bars:** If a navigation bar or header is requested or necessary for the application's functionality, it should be pill-shaped, floating, and have a frosted glass effect (using Tailwind CSS for backdrop blur and semi-transparent backgrounds, e.g., \`bg-white/50 backdrop-blur-md\`). Do not add a navigation bar unless it is explicitly requested or is essential for the app's core features.
      - **Styling:** You MUST use Tailwind CSS for all styling. Do not generate a \`tailwind.config.js\` file; all necessary classes are available via the CDN.

      **File Generation Rules:**
      - Your output MUST be a JSON object containing a single key "files", which is an array of file objects.
      - Each file object must have two keys: "path" (e.g., "src/App.tsx", "src/components/Button.tsx") and "code" (the full file content as a string).
      - You MUST provide the full code for ALL necessary files for the application to work. Do not omit files.
      - The main application component that should be rendered MUST be the default export of "src/App.tsx".
      - Use ES Modules for imports/exports. Crucially, you MUST include the full file extension in your import paths (e.g., \`import Button from './components/Button.tsx'\`). This is required for the in-browser module resolver to work.

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

  const runBuildProcess = async (prompt: string, baseFiles: ProjectFile[], projectId: string, projectTypeOverride?: ProjectType) => {
    setIsLoading(true);
    setErrors([]);

    addMessageToProject(projectId, { actor: 'user', text: prompt });
    
    const project = projects.find(p => p.id === projectId);
    const projectType = projectTypeOverride || project?.projectType || 'multi';

    const { plan, sql } = await generatePlan(prompt, model);
    addMessageToProject(projectId, { actor: 'ai', text: "Here's the plan:", plan });
    
    if (sql) {
      updateProjectState(projectId, { supabaseSql: sql });
    }

    setProgress(0);
    const codePromise = generateCode(prompt, baseFiles, plan, model, projectType);

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

  const createNewProject = (prompt: string, projectType: ProjectType) => {
    if (!prompt.trim()) return;
    
    const newProject: Project = {
        id: Date.now().toString(),
        name: prompt.length > 40 ? prompt.substring(0, 37) + '...' : prompt,
        files: [{ path: 'src/App.tsx', code: DEFAULT_CODE }],
        messages: [],
        projectType,
    };
    
    setProjects(prev => [...prev, newProject]);
    
    setProjectToBuild({ projectId: newProject.id, prompt, projectType });
    window.location.hash = `/project/${newProject.id}`;
  };
  
  const handleSend = async () => {
    if (!userInput.trim() || isLoading || !activeProject) return;
    const currentInput = userInput;
    setUserInput('');
    try {
      await runBuildProcess(currentInput, activeProject.files, activeProject.id);
    } catch (err: any) {
      const errorMessage = `AI Error: ${err.message}`;
      setErrors(prev => [errorMessage, ...prev]);
      addMessageToProject(activeProject.id, { actor: 'system', text: `Sorry, I encountered an error. ${err.message}` });
      setIsLoading(false);
      setProgress(null);
    }
  };

  const handleFixError = async (errorToFix: string) => {
    if (!activeProject) return;

    setIsLoading(true);
    setProgress(0);
    
    const fixPrompt = `
      An error occurred in the application: "${errorToFix}". 
      Please analyze the existing files and fix the bug that is causing this error.
      Provide the complete, corrected code for ALL necessary files.
    `;

    try {
      const plan = [`Identify the cause of the error: "${errorToFix}"`, "Correct the code in the appropriate file(s).", "Ensure the application still meets the original requirements."];
      
      const interval = setInterval(() => {
        setProgress(prev => Math.min((prev ?? 0) + 5, 95));
      }, 400);

      const newFiles = await generateCode(fixPrompt, activeProject.files, plan, model, activeProject.projectType);
      
      clearInterval(interval);
      setProgress(100);

      updateProjectState(activeProject.id, { files: newFiles });
      setErrors(prev => prev.filter(e => e !== errorToFix)); 
      
      addMessageToProject(activeProject.id, { actor: 'system', text: `I've attempted a fix for the error: "${errorToFix.substring(0, 100)}...". Please check the preview.` });

    } catch (err: any) {
      const errorMessage = `AI Error during fix attempt: ${err.message}`;
      setErrors(prev => [errorMessage, ...prev]);
      addMessageToProject(activeProject.id, { actor: 'system', text: `Sorry, I encountered an error while trying to apply a fix.` });
    } finally {
      setTimeout(() => {
        setProgress(null);
        setIsLoading(false);
      }, 500);
    }
  };


  const handleModelChange = (newModel: GeminiModel) => {
    setModel(newModel);
    localStorage.setItem('gemini_model', newModel);
  };
  
  const handlePreviewModeChange = (mode: PreviewMode) => {
    setPreviewMode(mode);
    localStorage.setItem('silo_preview_mode', mode);
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

  const handleSupabaseAuthorize = async () => {
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
    if (!tempSupabaseToken) {
      setErrors(prev => ["An authentication error occurred. Please try connecting again.", ...prev]);
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
      
      setSupabaseConfig({
        accessToken: tempSupabaseToken,
        projectRef: projectRef,
        url: projectUrl, 
        anonKey: anonKey 
      });
      
      sessionStorage.setItem('silo_authorized_return_path', '/settings');
      setIsProjectSelectorOpen(false);
      setTempSupabaseToken(null);
      window.location.hash = '/authorized';
      
    } catch (err: any) {
      setErrors(prev => [`Supabase Connection Error: ${err.message}`, ...prev]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSupabaseConnect = (url: string, anonKey: string) => {
    try {
      const parsedUrl = new URL(url);
      if (!anonKey.startsWith('ey')) {
          throw new Error("Invalid Anon Key format. It should start with 'ey'.");
      }
      const projectRefMatch = parsedUrl.hostname.match(/^([\w-]+)\.supabase\.co$/);
      if (!projectRefMatch) {
        throw new Error("Invalid Supabase URL format. Hostname should be '<project-ref>.supabase.co'.");
      }
      const projectRef = projectRefMatch[1];
      
      setSupabaseConfig({
        url,
        anonKey,
        projectRef,
        accessToken: '', // No access token for manual connection
      });

    } catch (err: any) {
      setErrors(prev => [`Invalid Supabase details: ${err.message}`, ...prev]);
    }
  };
  
  const handleSupabaseDisconnect = () => {
    setSupabaseConfig(null);
  };
    
  const createDeploymentPackage = async (files: ProjectFile[]): Promise<Blob> => {
    const zip = new JSZip();
    
    const productionHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Silo Build App</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
          <style> body { background-color: #ffffff; } </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/App.tsx"></script>
        </body>
      </html>
    `;
    zip.file('index.html', productionHtml);

    files.forEach(file => {
      zip.file(file.path, file.code);
    });

    return zip.generateAsync({ type: 'blob' });
  };
  
  const handlePublish = async () => {
    if (!activeProject) return;

    setIsPublishModalOpen(true);
    setPublishState({ status: 'idle' });

    const token = localStorage.getItem('silo_netlify_token');
    if (!token) {
      setPublishState({ status: 'error', error: 'Netlify token not found. Please add it on the Settings page.' });
      return;
    }

    try {
      setPublishState({ status: 'packaging' });
      const zipBlob = await createDeploymentPackage(activeProject.files);

      let siteId = activeProject.netlifySiteId;

      if (!siteId) {
        setPublishState({ status: 'creating_site' });
        const siteResponse = await fetch('https://api.netlify.com/api/v1/sites', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!siteResponse.ok) {
          const errorText = await siteResponse.text();
          throw new Error(`Netlify API Error (Create Site): ${errorText}`);
        }
        const siteData = await siteResponse.json();
        siteId = siteData.id;
        updateProjectState(activeProject.id, { netlifySiteId: siteId });
      }

      setPublishState({ status: 'uploading' });
      const deployResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/zip' },
        body: zipBlob,
      });
      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        throw new Error(`Netlify Deploy Error: ${errorText}`);
      }
      const deployData = await deployResponse.json();
      const deployId = deployData.id;

      setPublishState({ status: 'building' });
      const pollDeploy = async (): Promise<string> => {
        const statusResponse = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys/${deployId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!statusResponse.ok) throw new Error('Failed to poll deploy status.');
        const statusData = await statusResponse.json();
        
        if (statusData.state === 'ready') {
          return statusData.ssl_url || statusData.url;
        } else if (statusData.state === 'error') {
          throw new Error(`Netlify build failed: ${statusData.error_message || 'Unknown error'}`);
        } else {
          await new Promise(resolve => setTimeout(resolve, 3000));
          return pollDeploy();
        }
      };

      const finalUrl = await pollDeploy();
      setPublishState({ status: 'success', url: finalUrl });
    } catch (err: any) {
      console.error("Publishing error:", err);
      setPublishState({ status: 'error', error: err.message });
    }
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
      return (
        <SettingsPage 
          selectedModel={model} 
          onModelChange={handleModelChange}
          supabaseConfig={supabaseConfig}
          onSupabaseAuthorize={handleSupabaseAuthorize}
          onSupabaseManualConnect={handleManualSupabaseConnect}
          onSupabaseDisconnect={handleSupabaseDisconnect}
          isLoading={isLoading}
          previewMode={previewMode}
          onPreviewModeChange={handlePreviewModeChange}
        />
      );
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
                isSupabaseConnected={!!supabaseConfig}
                supabaseSql={activeProject.supabaseSql}
                previewMode={previewMode}
                onPublish={() => setIsPublishModalOpen(true)}
              />
            </div>
          </main>
          <ErrorDisplay error={errors[0] || null} onClose={() => setErrors(prev => prev.slice(1))} />
           <button
            onClick={() => setIsDebugAssistOpen(true)}
            title="Open Debug Assist"
            className="fixed bottom-8 right-8 w-14 h-14 z-40 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
            >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14" height="24" width="24">
                <defs>
                <linearGradient id="paint0_linear_14402_15643_fab" x1="2.288" x2="13.596" y1="2.692" y2="8.957" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#8425cc"></stop>
                    <stop offset="1" stop-color="#2599cc"></stop>
                </linearGradient>
                </defs>
                <path fill="url(#paint0_linear_14402_15643_fab)" fill-rule="evenodd" d="M9.56049.6564C9.74797-.214503 10.9808-.220724 11.176.649356l.0252.112754c.2386 1.06349 1.0796 1.87059 2.1254 2.0556.8979.15883.8979 1.45575 0 1.61458-1.0458.18501-1.8868.99211-2.1254 2.0556l-.0252.11276c-.1952.87008-1.42803.86385-1.61551-.00705l-.02083-.09675c-.22983-1.06762-1.06995-1.88082-2.1176-2.06615-.89608-.15853-.89608-1.45287 0-1.61139 1.04765-.18534 1.88777-.99854 2.1176-2.066158L9.56049.6564ZM11.5 8.18049V12.25c0 .1381-.1119.25-.25.25h-9.5c-.13807 0-.25-.1119-.25-.25V6h6.38531c-.19048-.17448-.42601-.2933-.681-.33841C5.30951 5.32639 4.99463 2.99769 6.25976 2H1.75C.783502 2 0 2.7835 0 3.75v8.5C0 13.2165.783501 14 1.75 14h9.5c.9665 0 1.75-.7835 1.75-1.75V5.88959c-.2829.19769-.4962.50254-.5791.87189l-.0253.11275c-.1354.60388-.4711 1.03901-.8956 1.30626Zm-7.54414-.66174c-.24408-.24408-.63981-.24408-.88389 0-.24407.24408-.24407.63981 0 .88389l1.05806 1.05805-1.05806 1.05811c-.24407.244-.24407.6398 0 .8838.24408.2441.63981.2441.88389 0l1.5-1.49996c.24408-.24408.24408-.63981 0-.88389l-1.5-1.5Zm2.55806 2.81695c-.34518 0-.625.2798-.625.625s.27982.625.625.625h1.5c.34517 0 .625-.2798.625-.625s-.27983-.625-.625-.625h-1.5Z" clip-rule="evenodd"></path>
            </svg>
            </button>

            <DebugAssistPanel
                isOpen={isDebugAssistOpen}
                onClose={() => setIsDebugAssistOpen(false)}
                errors={errors}
                onFixError={handleFixError}
                isLoading={isLoading}
            />
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
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublish={handlePublish}
        publishState={publishState}
        projectName={activeProject?.name || ''}
      />
    </div>
  );
};

export default App;