import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { ErrorDisplay } from './components/ErrorDisplay';
import { useDebounce } from './hooks/useDebounce';
import { DEFAULT_CODE, DEFAULT_HTML_FILES } from './constants';
import { ChatPanel } from './components/ChatPanel';
import { Workspace } from './components/Workspace';
import { TopNavBar } from './components/TopNavBar';
import { HomePage } from './components/HomePage';
import { ProfilePage } from './components/ProfilePage';
import { SettingsPage } from './components/SettingsPage';
import { AuthorizedPage } from './components/AuthorizedPage';
import DebugAssistPanel from './components/DebugAssistPanel';
import { PublishModal, PublishState } from './components/PublishModal';
import { GitHubSaveModal } from './components/GitHubSaveModal';
import { AppStorePublishModal, AppStorePublishState, AppStoreSubmissionData } from './components/AppStorePublishModal';
import { FocusTimer } from './components/FocusTimer';
import { PricingPage } from './components/PricingPage';
import { DocsPage } from './components/DocsPage';
import { ArticlePage } from './components/ArticlePage';
import { IntegrationsPage } from './components/IntegrationsPage';
import { INTEGRATION_DEFINITIONS, Integration } from './integrations';
import { MaxAgentPanel, MaxThought } from './components/MaxAgentPanel';
import { MaxCursor } from './components/MaxCursor';
import { NotificationsPanel, Notification } from './components/NotificationsPanel';
import { DeveloperPortalPage } from './components/DeveloperPortalPage';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/TermsOfServicePage';


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
export type ProjectType = 'single' | 'multi' | 'html';
export type PreviewMode = 'iframe' | 'service-worker';
export type ApiKeyHandling = 'hardcode' | 'env';

export interface Message {
  actor: 'user' | 'ai' | 'system';
  text: string;
  plan?: string[];
  files_to_generate?: string[];
  generated_files?: string[];
}

export interface ProjectFile {
    path: string;
    code: string;
}

export interface Commit {
  id: string;
  message: string;
  timestamp: number;
  files: ProjectFile[];
}

export interface AppStoreSubmission {
  status: 'Not Submitted' | 'Submitted' | 'In Review' | 'Approved' | 'Rejected';
  version: string;
  submissionDate?: number;
  url?: string;
}

export interface ApiSecret {
  key: string;
  value: string;
}

export interface UserProfile {
  name: string;
  username: string;
  profilePicture: string | null; // base64 string
}

export interface Project {
  id: string;
  name: string;
  files: ProjectFile[];
  messages: Message[];
  projectType: ProjectType;
  netlifySiteId?: string;
  netlifyUrl?: string;
  vercelProjectId?: string;
  vercelUrl?: string;
  githubRepo?: string;
  commits?: Commit[];
  appStoreSubmission?: AppStoreSubmission;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  projectRef: string;
  accessToken: string;
}

const FEATURE_NOTIFICATIONS: Omit<Notification, 'read'>[] = [
  {
    id: 'max-ai-agent-v1',
    title: 'New Feature: Max AI Agent',
    description: 'Meet Max, your autonomous AI development partner. Activate Max to have it brainstorm, write, and execute prompts for you.',
    timestamp: new Date('2025-10-15T10:00:00Z').getTime()
  },
  {
    id: 'integrations-marketplace-v1',
    title: 'New: Integrations Marketplace',
    description: "Connect to services like Pexels, OpenAI, and more directly within Silo Build. Check out the new Integrations page!",
    timestamp: new Date('2025-10-14T10:00:00Z').getTime()
  },
  {
    id: 'eas-export-v1',
    title: 'Project Export for EAS',
    description: "You can now download your projects as a zip file, pre-configured for submission to the App Store using Expo Application Services.",
    timestamp: new Date('2025-10-13T10:00:00Z').getTime()
  },
];


const generateAvatar = (name: string): string => {
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return '';

    const gradient = context.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#4f46e5');
    gradient.addColorStop(1, '#0ea5e9');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    if (!initials) return canvas.toDataURL('image/png');

    context.fillStyle = 'white';
    context.font = `bold ${size / 2.5}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(initials, size / 2, size / 2);

    return canvas.toDataURL('image/png');
};

const App: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(window.location.hash.replace(/^#/, '') || '/home');
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash');
  const [defaultStack, setDefaultStack] = useState<ProjectType>('multi');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('service-worker');
  const [apiKeyHandling, setApiKeyHandling] = useState<ApiKeyHandling>('hardcode');
  
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null);
  const [tempSupabaseToken, setTempSupabaseToken] = useState<string | null>(null);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isDebugAssistOpen, setIsDebugAssistOpen] = useState(false);
  
  const [projectToBuild, setProjectToBuild] = useState<{projectId: string, prompt: string, projectType: ProjectType, screenshot: string | null, integration: Integration | null} | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishState, setPublishState] = useState<PublishState>({ status: 'idle' });
  const [isGitHubSaveModalOpen, setIsGitHubSaveModalOpen] = useState(false);
  const [isAppStorePublishModalOpen, setIsAppStorePublishModalOpen] = useState(false);
  const [appStorePublishState, setAppStorePublishState] = useState<AppStorePublishState>({ status: 'idle' });
  const [apiSecrets, setApiSecrets] = useState<ApiSecret[]>([]);
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Your Name',
    username: 'your_username',
    profilePicture: null,
  });

  // Max Agent State
  const [isMaxAgentPanelOpen, setIsMaxAgentPanelOpen] = useState(false);
  const [isMaxAgentRunning, setIsMaxAgentRunning] = useState(false);
  const [maxThoughts, setMaxThoughts] = useState<MaxThought[]>([]);
  const [maxCursorPosition, setMaxCursorPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMaxCursorClicking, setIsMaxCursorClicking] = useState(false);
  const agentTaskQueue = React.useRef<(() => Promise<void>)[]>([]);
  const isAgentProcessing = React.useRef(false);

  // Notifications State
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const addMaxThought = (text: string) => {
    setMaxThoughts(prev => [...prev, { text, timestamp: Date.now() }]);
  };

  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem('silo_projects');
      if (savedProjects) {
        const parsedProjects: (Project & { supabaseSql?: string })[] = JSON.parse(savedProjects);
        const migratedProjects = parsedProjects.map(p => {
            const newFiles = [...p.files];
            // Migration for old supabaseSql property to app.sql file
            if (p.supabaseSql && !p.files.some(f => f.path === 'app.sql')) {
                newFiles.push({ path: 'app.sql', code: p.supabaseSql });
            }

            const migratedProject: Project = {
                id: p.id,
                name: p.name,
                files: newFiles,
                messages: p.messages,
                projectType: p.projectType || 'multi',
                netlifySiteId: p.netlifySiteId,
                netlifyUrl: p.netlifyUrl,
                vercelProjectId: p.vercelProjectId,
                vercelUrl: p.vercelUrl,
                githubRepo: p.githubRepo,
                commits: p.commits || [],
                appStoreSubmission: p.appStoreSubmission || undefined,
            };
            return migratedProject;
        });
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
      const savedApiKeyHandling = localStorage.getItem('silo_api_key_handling') as ApiKeyHandling;
      if (savedApiKeyHandling) {
        setApiKeyHandling(savedApiKeyHandling);
      }
      const savedApiSecrets = localStorage.getItem('silo_api_secrets');
      if (savedApiSecrets) {
        setApiSecrets(JSON.parse(savedApiSecrets));
      }
      const savedUserProfile = localStorage.getItem('silo_user_profile');
      if (savedUserProfile) {
        const profile = JSON.parse(savedUserProfile);
        if (profile.name && !profile.profilePicture) {
            profile.profilePicture = generateAvatar(profile.name);
        }
        setUserProfile(profile);
      }
       const savedDefaultStack = localStorage.getItem('silo_default_stack') as ProjectType;
      if (savedDefaultStack) {
        setDefaultStack(savedDefaultStack);
      }
    } catch (e) {
      console.error("Failed to load data from local storage", e);
    }
  }, []);

  useEffect(() => {
    try {
      const readStatusesRaw = localStorage.getItem('silo_read_notifications');
      const readStatuses = readStatusesRaw ? JSON.parse(readStatusesRaw) : {};
      
      const enrichedNotifications = FEATURE_NOTIFICATIONS.map(n => ({
        ...n,
        read: !!readStatuses[n.id]
      })).sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(enrichedNotifications);

    } catch (e) {
      console.error("Failed to load notifications", e);
      setNotifications(FEATURE_NOTIFICATIONS.map(n => ({...n, read: false})).sort((a, b) => b.timestamp - a.timestamp));
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
      localStorage.setItem('silo_api_secrets', JSON.stringify(apiSecrets));
  }, [apiSecrets]);

  useEffect(() => {
    localStorage.setItem('silo_user_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  const handleSetDefaultStack = (stack: ProjectType) => {
    setDefaultStack(stack);
    localStorage.setItem('silo_default_stack', stack);
  };
  
  const handleApiKeyHandlingChange = (mode: ApiKeyHandling) => {
    setApiKeyHandling(mode);
    localStorage.setItem('silo_api_key_handling', mode);
  };

  const handleProfileUpdate = (newProfile: UserProfile) => {
    const oldProfile = userProfile;
    let finalProfile = { ...newProfile };

    const pictureWasJustUploaded = newProfile.profilePicture !== oldProfile.profilePicture;

    if (pictureWasJustUploaded) {
        // If the user uploaded a picture, just use it.
        setUserProfile(finalProfile);
        return;
    }

    // If the name was added and there wasn't one before
    if (newProfile.name && !oldProfile.name) {
        finalProfile.profilePicture = generateAvatar(newProfile.name);
    } 
    // If the name was cleared
    else if (!newProfile.name && oldProfile.name) {
        finalProfile.profilePicture = null;
    } 
    // If the name changed (and a picture wasn't just uploaded)
    else if (newProfile.name !== oldProfile.name && newProfile.name) {
        finalProfile.profilePicture = generateAvatar(newProfile.name);
    }
    
    setUserProfile(finalProfile);
  };

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
        const { projectId, prompt, projectType, screenshot, integration } = projectToBuild;
        setProjectToBuild(null);

        try {
          await runBuildProcess(prompt, [], projectId, projectType, true, screenshot, integration);
        } catch (err: any) {
          const errorMessage = `AI Error: ${err.message}`;
          setErrors(prev => [errorMessage, ...prev]);
          addMessageToProject(projectId, { actor: 'system', text: `Sorry, I encountered an error starting the build. ${err.message}` });
          setIsLoading(false);
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

  const generatePlan = async (prompt: string, selectedModel: GeminiModel, projectType: ProjectType, screenshotBase64: string | null): Promise<{plan: string[], sql: string, files_to_generate: string[]}> => {
    const ai = getAiClient();

    let projectConstraints = '';
    if (projectType === 'single') {
        projectConstraints = `\n**CRITICAL CONSTRAINT:** This is a single-file React project. You MUST only generate one file: 'src/App.tsx'. The "files_to_generate" array in your response MUST contain only this single path.`;
    } else if (projectType === 'html') {
        projectConstraints = `\n**CRITICAL CONSTRAINT:** This is a vanilla HTML/CSS/JS project. You MUST generate three files: 'index.html', 'style.css', and 'script.js'. The "files_to_generate" array in your response MUST contain exactly these three paths. Do not generate any other files. No SQL database is needed.`;
    }
    
    let imagePrompt = '';
    if (screenshotBase64) {
      imagePrompt = `\n**IMPORTANT:** An image has been provided as context. Analyze the image and incorporate its design, layout, and content into your plan. The user's request is likely related to this image.`;
    }

    const planPrompt = `
      You are a senior software architect. Your task is to create a plan to build a web application based on the user's request.
      ${imagePrompt}

      **Instructions:**
      1.  Create a concise, step-by-step plan for the implementation.
      2.  List all the file paths you intend to create or modify. This list should be comprehensive.
      3.  If the application requires data persistence, you MUST provide the complete PostgreSQL schema for the database. Assume it is for a Neon serverless Postgres database unless Supabase is connected.
      4.  If the project is connected to Supabase (${!!supabaseConfig}), ensure the PostgreSQL schema is compatible with Supabase's environment.
      5.  If no database is needed, the "sql" field in your response must be an empty string.
      ${projectConstraints}

      **Output Format:**
      You MUST respond with ONLY a JSON object that matches this exact schema. Do not include any other text or markdown.
      {
        "plan": ["A list of steps for the implementation."],
        "sql": "The complete SQL code for the database schema, if needed. Use 'CREATE TABLE IF NOT EXISTS' syntax.",
        "files_to_generate": ["A list of file paths you will create or modify, e.g., 'src/App.tsx', 'src/components/Header.tsx'."]
      }
      
      **User Request:** "${prompt}"
    `;
    
    const contents: any = [planPrompt];
    if (screenshotBase64) {
      contents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: screenshotBase64.split(',')[1]
        }
      });
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: { parts: contents.map(c => typeof c === 'string' ? { text: c } : c) },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            plan: { type: Type.ARRAY, items: { type: Type.STRING } },
            sql: { type: Type.STRING },
            files_to_generate: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ['plan', 'sql', 'files_to_generate']
        }
      }
    });

    if (!response.text || response.promptFeedback?.blockReason) {
        throw new Error(`The AI response for planning was blocked. Reason: ${response.promptFeedback?.blockReason || 'No content returned'}. Please modify your prompt.`);
    }

    try {
      const parsed = JSON.parse(response.text);

      if (projectType === 'single') {
        parsed.files_to_generate = ['src/App.tsx'];
      } else if (projectType === 'html') {
          parsed.files_to_generate = ['index.html', 'style.css', 'script.js'];
          parsed.sql = ''; // Force no SQL for HTML projects
      }

      return {
          plan: parsed.plan || [],
          sql: parsed.sql || '',
          files_to_generate: parsed.files_to_generate || []
      };
    } catch (e) {
      console.error("Failed to parse plan and SQL:", e);
      return {
          plan: ["Could not generate a plan, proceeding with build.", "I will try my best to match your request."],
          sql: "",
          files_to_generate: projectType === 'single' ? ['src/App.tsx'] : (projectType === 'html' ? ['index.html', 'style.css', 'script.js'] : [])
      };
    }
  };

    const generateCodeForFileStream = async (
    prompt: string,
    currentFiles: ProjectFile[],
    plan: string[],
    fileToGenerate: string,
    selectedModel: GeminiModel,
    projectType: ProjectType,
    screenshotBase64: string | null
  ) => {
    const ai = getAiClient();
    
    // START: Dynamic Integrations Prompt Generation
    let integrationsPrompt = '';
    const integrationsList: string[] = [];
    let isNeonConnected = false;
    
    for (const integration of INTEGRATION_DEFINITIONS) {
        if (integration.id === 'neon' && localStorage.getItem(integration.storageKey as string)) {
            isNeonConnected = true;
        }
        const storedKeysRaw = localStorage.getItem(integration.storageKey as string);
        if (storedKeysRaw) {
            try {
                const storedKeys = JSON.parse(storedKeysRaw);
                let integrationDetails = `\n- **${integration.name} Integration:**`;
                let hasAllKeys = true;
                
                integration.keys?.forEach(keyInfo => {
                    const keyValue = storedKeys[keyInfo.name];
                    if (keyValue) {
                        integrationDetails += `\n  - ${keyInfo.label}: "${keyValue}"`;
                    } else {
                        hasAllKeys = false;
                    }
                });

                if (hasAllKeys) {
                    if (integration.usageInstructions) {
                        let instructions = integration.usageInstructions;
                        integration.keys?.forEach(keyInfo => {
                            const placeholder = `{{${keyInfo.name}}}`;
                            instructions = instructions.replace(new RegExp(placeholder, 'g'), storedKeys[keyInfo.name]);
                        });
                        integrationDetails += `\n  - **Usage:** ${instructions}`;
                    }
                    integrationsList.push(integrationDetails);
                }
            } catch (e) {
                console.warn(`Could not parse keys for integration: ${integration.name}`);
            }
        }
    }

    if (integrationsList.length > 0) {
        integrationsPrompt = `
**API Integrations:**
The user has connected the following APIs. If the user's request involves any of these services, you MUST use the provided keys and instructions to integrate them into the application.
${integrationsList.join('\n')}
`;
    }
    // END: Dynamic Integrations Prompt Generation

    const supabaseIntegrationPrompt = supabaseConfig ? `
      **Supabase Integration:**
      - This project is connected to a Supabase backend.
      - Supabase Project URL: "${supabaseConfig.url}"
      - Supabase Anon Key: "${supabaseConfig.anonKey}"
      - You MUST use the '@supabase/supabase-js' library. The library is already loaded in the environment. You can access it via the global \`supabase\` object.
      - Initialize the client like this: \`const supabaseClient = supabase.createClient("${supabaseConfig.url}", "${supabaseConfig.anonKey}");\`
    ` : '';

    const neonIntegrationPrompt = isNeonConnected && !supabaseConfig ? `
      **Neon Database Integration:**
      - This project is connected to a Neon serverless PostgreSQL database.
      - You MUST assume a backend API exists that can interact with this database. Your task is to write frontend code that makes \`fetch\` requests to hypothetical API endpoints that would logically correspond to the schema in \`app.sql\` (e.g., \`/api/users\`, \`/api/items\`).
      - You MUST NOT implement the backend server itself. Focus only on the frontend React code that consumes these imagined APIs.
    ` : '';
    
    const customSqlPrompt = currentFiles.some(f => f.path === 'app.sql') && !supabaseConfig && !isNeonConnected ? `
      **Custom Backend:**
      - An \`app.sql\` file exists, which defines the database schema for the application.
      - You MUST assume a backend API exists that can interact with this database.
      - Your task is to write frontend code that makes \`fetch\` requests to hypothetical API endpoints that would logically correspond to the schema (e.g., \`/api/users\`, \`/api/items\`).
      - You MUST NOT implement the backend server itself. Focus only on the frontend React code that consumes these imagined APIs.
    ` : '';

    let apiSecretsPrompt = '';
    if (apiSecrets.length > 0) {
      if (apiKeyHandling === 'env') {
        apiSecretsPrompt = `
          **API Secrets:**
          - The user has provided API secrets. You MUST reference them using \`process.env.SECRET_NAME\` and MUST NOT hardcode the values in the code.
          - If secrets are used, you MUST also generate a '.env.local' file containing the key-value pairs in the format \`SECRET_NAME="secret_value"\`.
          - Available secret names: ${apiSecrets.map(s => s.key).join(', ')}
        `;
      } else { // 'hardcode'
        apiSecretsPrompt = `
          **API Secrets:**
          - The user has provided the following API secrets. You MUST use these in the code when an external API key is required (e.g., for another AI service, a database, etc.).
          - IMPORTANT: Do not display these secrets directly in the UI. When initializing clients or making API calls, use the provided value for the corresponding key.
          - Available secrets:
    ${apiSecrets.map(s => `      - ${s.key}: "${s.value}"`).join('\n')}
        `;
      }
    }
    
    let projectTypeInstructions = '';
    switch (projectType) {
        case 'single':
            projectTypeInstructions = `
                **Project Type:** Single File (React)
                **Constraint:** You MUST generate all code within a single file: 'src/App.tsx'. Do not create any other files or components. All logic, components, and styles must be contained within this one file.
            `;
            break;
        case 'multi':
            projectTypeInstructions = `
                **Project Type:** Multi-File (React)
                **Guideline:** You SHOULD break down the application into logical, reusable components, each in its own file (e.g., 'src/components/Button.tsx'). Follow a clean, modular file structure.
            `;
            break;
        case 'html':
            projectTypeInstructions = `
                **Project Type:** Vanilla HTML/CSS/JS
                **Constraint:** You MUST generate a standard, static web project with three files: 'index.html', 'style.css', and 'script.js'.
                - If you are generating 'index.html': It MUST contain the full HTML structure and link to the other two files correctly: \`<link rel="stylesheet" href="style.css">\` in the <head>, and \`<script src="script.js" defer></script>\` before the closing </body> tag.
                - If you are generating 'style.css': It MUST contain all the CSS styles.
                - If you are generating 'script.js': It MUST contain all the JavaScript logic.
                **Design System & UI Guidelines:**
                - **Overall Style:** Modern, clean, and aesthetically pleasing. Main background MUST be white.
                - **Buttons:** MUST be pill-shaped (fully rounded). Primary buttons are solid black with white text. Secondary buttons are outlined with a thin black border.
                - **Icons:** MUST use Google Material Symbols (outlined style), e.g., \`<span class="material-symbols-outlined">icon_name</span>\`.
                - **Nav Bars:** If needed, should be pill-shaped, floating, with a frosted glass effect (\`backdrop-filter: blur(10px);\`).
                **CRITICAL RULE:** DO NOT use React, JSX, TSX, or any frameworks. Write plain HTML, CSS, and JavaScript. DO NOT use Tailwind CSS.
            `;
            break;
    }

    const reactStylingGuidelines = `
      **Design System & UI Guidelines (for React Projects):**
      - **Overall Style:** Modern, clean, and aesthetically pleasing. Main background MUST be white.
      - **Buttons:** MUST be pill-shaped (fully rounded). Primary buttons are solid black with white text. Secondary buttons are outlined.
      - **Icons:** MUST use Google Material Symbols (outlined style), e.g., \`<span className="material-symbols-outlined">icon_name</span>\`.
      - **Nav Bars:** If needed, should be pill-shaped, floating, with a frosted glass effect (\`bg-white/50 backdrop-blur-md\`).
      - **Styling:** You MUST use Tailwind CSS for all styling. DO NOT generate any CSS files or use CSS imports.
    `;

     const reactFileRules = `
      **File Generation Rules (for React Projects):**
      - The main application component MUST be the default export of "src/App.tsx".
      - Do NOT generate an \`index.html\`, \`main.tsx\`, or other entry-point files.
      - Use ES Modules for imports/exports. Crucially, you MUST include the full file extension in your import paths (e.g., \`import Button from './components/Button.tsx'\`).
     `;

    const fullPrompt = `
      You are an expert web developer. Your task is to generate the complete code for a single specified file.
      ${screenshotBase64 ? '\n**CONTEXT:** An image has been provided. You MUST analyze it and use it as a primary reference for the UI, layout, and content of the application you generate.' : ''}

      **CRITICAL INSTRUCTION:** You MUST generate the complete, raw code for ONLY the following file: \`${fileToGenerate}\`.
      Your output must contain ONLY the code for this file. Do not include JSON, markdown, file paths, or any other explanatory text.

      ${projectTypeInstructions}
      ${projectType !== 'html' ? reactStylingGuidelines : ''}
      ${projectType !== 'html' ? reactFileRules : ''}

      ${supabaseIntegrationPrompt}
      ${neonIntegrationPrompt}
      ${customSqlPrompt}
      ${integrationsPrompt}
      ${apiSecretsPrompt}
      
      **The user's request is:** "${prompt}".
      **The plan is:**
      - ${plan.join('\n- ')}
      **The current project files are:**
      ${JSON.stringify(currentFiles, null, 2)}

      Again, your entire response should be only the raw code for \`${fileToGenerate}\`.
    `;
    
    const contentParts: any[] = [{ text: fullPrompt }];
    if (screenshotBase64) {
      contentParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: screenshotBase64.split(',')[1]
        }
      });
    }

    try {
        const response = await ai.models.generateContentStream({
          model: selectedModel,
          contents: { parts: contentParts },
        });
        return response;
    } catch (e: any) {
        console.error("Error starting stream for file generation:", e);
        throw new Error(`The AI failed to start generating code for ${fileToGenerate}. Error: ${e.message}`);
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

  const runBuildProcess = async (prompt: string, baseFiles: ProjectFile[], projectId: string, projectTypeOverride?: ProjectType, isInitialBuild: boolean = false, screenshotBase64: string | null = null, integration: Integration | null = null) => {
    setIsLoading(true);
    setErrors([]);

    const finalPrompt = integration 
      ? `The user wants to build an application using the "${integration.name}" integration. Fulfill the following request using this context: "${prompt}"`
      : prompt;

    addMessageToProject(projectId, { actor: 'user', text: prompt });
    if (integration) {
        addMessageToProject(projectId, { actor: 'system', text: `Using ${integration.name} integration context.` });
    }
    
    const project = projects.find(p => p.id === projectId);
    const projectType = projectTypeOverride || project?.projectType || 'multi';

    const { plan, sql, files_to_generate } = await generatePlan(finalPrompt, model, projectType, screenshotBase64);
    
    if (projectType !== 'html' && !files_to_generate.some(f => f === 'src/App.tsx')) {
        files_to_generate.unshift('src/App.tsx');
    }

    addMessageToProject(projectId, { 
        actor: 'ai', 
        text: "Here's the plan:", 
        plan,
        files_to_generate,
        generated_files: []
    });
    
    let projectForGeneration = projects.find(p => p.id === projectId)!;

    if (isInitialBuild) {
        const initialFiles: ProjectFile[] = sql ? [{ path: 'app.sql', code: sql }] : [];
        updateProjectState(projectId, { files: initialFiles });
        projectForGeneration = { ...projectForGeneration, files: initialFiles };
    } else {
        if (sql) {
            const sqlFileIndex = projectForGeneration.files.findIndex(f => f.path === 'app.sql');
            if (sqlFileIndex > -1) {
                projectForGeneration.files[sqlFileIndex] = { ...projectForGeneration.files[sqlFileIndex], code: sql };
            } else {
                projectForGeneration.files.push({ path: 'app.sql', code: sql });
            }
        } else {
            projectForGeneration.files = projectForGeneration.files.filter(f => f.path !== 'app.sql');
        }
        updateProjectState(projectId, { files: projectForGeneration.files });
    }

    for (const filePath of files_to_generate) {
        setProjects(prev => prev.map(p => {
            if (p.id === projectId) {
                const files = [...p.files];
                const existingIndex = files.findIndex(f => f.path === filePath);
                if (existingIndex > -1) {
                    files[existingIndex] = { path: filePath, code: '' };
                } else {
                    files.push({ path: filePath, code: '' });
                }
                return { ...p, files };
            }
            return p;
        }));

        const stream = await generateCodeForFileStream(
            finalPrompt,
            [...projectForGeneration.files],
            plan,
            filePath,
            model,
            projectType,
            screenshotBase64
        );

        let newFileContent = '';
        for await (const chunk of stream) {
            const chunkText = chunk.text;
            if (chunkText) {
                newFileContent += chunkText;
                setProjects(prev => prev.map(p => {
                    if (p.id === projectId) {
                        const files = [...p.files];
                        const fileIndex = files.findIndex(f => f.path === filePath);
                        if (fileIndex !== -1) {
                            files[fileIndex].code += chunkText;
                            return { ...p, files: [...files] };
                        }
                    }
                    return p;
                }));
            }
        }

        const fileIdx = projectForGeneration.files.findIndex(f => f.path === filePath);
        if (fileIdx > -1) {
            projectForGeneration.files[fileIdx].code = newFileContent;
        } else {
            projectForGeneration.files.push({ path: filePath, code: newFileContent });
        }

        setProjects(prev => prev.map(p => {
            if (p.id === projectId) {
                const messages = [...p.messages];
                const lastMessage = messages[messages.length - 1];
                if (lastMessage?.actor === 'ai' && lastMessage.files_to_generate) {
                    const updatedGeneratedFiles = Array.from(new Set([...(lastMessage.generated_files || []), filePath]));
                    messages[messages.length - 1] = { ...lastMessage, generated_files: updatedGeneratedFiles };
                    return { ...p, messages };
                }
            }
            return p;
        }));
    }

    addMessageToProject(projectId, { actor: 'ai', text: 'I have finished generating the code. Let me know what to do next!' });
    
    setIsLoading(false);
  };

  const createNewProject = (prompt: string, projectType: ProjectType, screenshot: string | null, integration: Integration | null) => {
    if (!prompt.trim()) return;
    
    const initialFiles = projectType === 'html'
      ? DEFAULT_HTML_FILES
      : [{ path: 'src/App.tsx', code: DEFAULT_CODE }];
    
    const newProject: Project = {
        id: Date.now().toString(),
        name: prompt.length > 40 ? prompt.substring(0, 37) + '...' : prompt,
        files: initialFiles,
        messages: [],
        projectType,
        commits: [],
    };
    
    setProjects(prev => [...prev, newProject]);
    
    setProjectToBuild({ projectId: newProject.id, prompt, projectType, screenshot, integration });
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
    }
  };

  const pushFilesToGitHub = async (token: string, repo: string, files: ProjectFile[], message: string, branch: string = 'main', isInitialCommit: boolean = false) => {
    const apiBase = 'https://api.github.com';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
    };

    let parentCommitSha: string | undefined;
    let baseTreeSha: string | undefined;

    if (!isInitialCommit) {
        const branchRes = await fetch(`${apiBase}/repos/${repo}/branches/${branch}`, { headers });
        if (!branchRes.ok) {
            if (branchRes.status === 404) {
                 throw new Error(`Branch '${branch}' not found in repository. Initial commit may not have been pushed correctly.`);
            }
            throw new Error(`Failed to get branch info (Status: ${branchRes.status}).`);
        }
        const branchData = await branchRes.json();
        parentCommitSha = branchData.commit.sha;
        baseTreeSha = branchData.commit.commit.tree.sha;
    }

    const filesWithReadme = [
        ...files,
        { path: 'README.md', code: `# ${activeProject?.name || 'Silo Build Project'}\n\nBuilt with Silo Build.`},
        { path: '.gitignore', code: 'node_modules\ndist\n.DS_Store' }
    ];

    const blobCreationPromises = filesWithReadme.map(async file => {
        const blobRes = await fetch(`${apiBase}/repos/${repo}/git/blobs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: file.code, encoding: 'utf-8' }),
        });
        if (!blobRes.ok) throw new Error(`Failed to create blob for ${file.path}`);
        const blobData = await blobRes.json();
        return { path: file.path, mode: '100644', type: 'blob', sha: blobData.sha };
    });

    const tree = await Promise.all(blobCreationPromises);

    const treePayload: { tree: any[], base_tree?: string } = { tree };
    if (baseTreeSha) {
        treePayload.base_tree = baseTreeSha;
    }

    const treeRes = await fetch(`${apiBase}/repos/${repo}/git/trees`, {
        method: 'POST',
        headers,
        body: JSON.stringify(treePayload),
    });
    if (!treeRes.ok) throw new Error('Failed to create git tree.');
    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;

    const commitPayload: { message: string, tree: string, parents?: string[] } = {
        message,
        tree: newTreeSha,
    };
    if (parentCommitSha) {
        commitPayload.parents = [parentCommitSha];
    }

    const commitRes = await fetch(`${apiBase}/repos/${repo}/git/commits`, {
        method: 'POST',
        headers,
        body: JSON.stringify(commitPayload),
    });
    if (!commitRes.ok) throw new Error('Failed to create commit.');
    const commitData = await commitRes.json();
    const newCommitSha = commitData.sha;

    if (isInitialCommit) {
        const refRes = await fetch(`${apiBase}/repos/${repo}/git/refs`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: newCommitSha }),
        });
        if (!refRes.ok) throw new Error('Failed to create new branch reference.');
    } else {
        const refRes = await fetch(`${apiBase}/repos/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: newCommitSha }),
        });
        if (!refRes.ok) throw new Error('Failed to update branch reference.');
    }
  };

  const handleCommit = async (commitMessage: string) => {
    if (!activeProject || !commitMessage.trim()) return;

    setIsLoading(true);
    
    // 1. Save commit to local state
    const newCommit: Commit = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        message: commitMessage.trim(),
        timestamp: Date.now(),
        files: JSON.parse(JSON.stringify(activeProject.files)), // Deep copy
    };
    const updatedCommits = [...(activeProject.commits || []), newCommit];
    updateProjectState(activeProject.id, { commits: updatedCommits });

    // 2. If linked to GitHub, push changes
    if (activeProject.githubRepo) {
        const token = localStorage.getItem('silo_github_token');
        if (!token) {
            setErrors(prev => ['GitHub token not found. Please add it in Settings.', ...prev]);
            setIsLoading(false);
            return;
        }
        
        try {
            await pushFilesToGitHub(token, activeProject.githubRepo, activeProject.files, commitMessage);
            addMessageToProject(activeProject.id, { actor: 'system', text: `Successfully pushed changes to ${activeProject.githubRepo}.` });
        } catch (err: any) {
            const errorMessage = `GitHub Push Error: ${err.message}`;
            setErrors(prev => [errorMessage, ...prev]);
            addMessageToProject(activeProject.id, { actor: 'system', text: `Failed to push changes to GitHub. ${err.message}` });
        }
    }
    setIsLoading(false);
  };

  const handleCreateRepoAndPush = async (repoName: string, description: string, isPrivate: boolean) => {
    if (!activeProject) return;
    const token = localStorage.getItem('silo_github_token');
    if (!token) {
        setErrors(prev => ['GitHub token not found. Please add it in Settings.', ...prev]);
        setIsGitHubSaveModalOpen(false);
        return;
    }

    setIsLoading(true);
    
    try {
        const headers = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' };
        
        const userResponse = await fetch('https://api.github.com/user', { headers });
        if (!userResponse.ok) throw new Error(`Failed to get GitHub user. Status: ${userResponse.status}`);
        const { login } = await userResponse.json();

        const repoResponse = await fetch('https://api.github.com/user/repos', {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: repoName, description, private: isPrivate }),
        });
        if (!repoResponse.ok) {
             const errorData = await repoResponse.json();
             throw new Error(`Failed to create repository. ${errorData.message}`);
        }
        const repoData = await repoResponse.json();
        const repoFullName = repoData.full_name;

        await pushFilesToGitHub(token, repoFullName, activeProject.files, 'Initial commit from Silo Build', 'main', true);

        updateProjectState(activeProject.id, { githubRepo: repoFullName });
        addMessageToProject(activeProject.id, { actor: 'system', text: `Successfully created and connected to GitHub repository: ${repoFullName}` });
        setIsGitHubSaveModalOpen(false);
        
        // Make the first local commit match the initial push
        handleCommit('Initial commit');

    } catch (err: any) {
        const errorMessage = `GitHub Error: ${err.message}`;
        setErrors(prev => [errorMessage, ...prev]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleFixError = async (errorToFix: string) => {
    if (!activeProject) return;

    setIsLoading(true);
    
    const fixPrompt = `
      An error occurred in the application: "${errorToFix}". 
      Please analyze the existing files and fix the bug that is causing this error.
      You must return the complete, corrected code for ALL existing files.
    `;

    try {
      const plan = [`Identify the cause of the error: "${errorToFix}"`, "Correct the code in the appropriate file(s).", "Ensure the application still meets the original requirements."];
      
      const filesToModify = activeProject.files.map(f => f.path);
      // This is a placeholder for where a streaming version of `generateCode` would go.
      // For now, we'll keep the non-streaming fix.
      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{text: fixPrompt}, ...activeProject.files.map(f => ({text: `File: ${f.path}\n\`\`\`\n${f.code}\n\`\`\``}))] },
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
      const parsed = JSON.parse(response.text);
      const newFiles = parsed.files;

      updateProjectState(activeProject.id, { files: newFiles });
      setErrors(prev => prev.filter(e => e !== errorToFix)); 
      
      addMessageToProject(activeProject.id, { actor: 'system', text: `I've attempted a fix for the error: "${errorToFix.substring(0, 100)}...". Please check the preview.` });

    } catch (err: any) {
      const errorMessage = `AI Error during fix attempt: ${err.message}`;
      setErrors(prev => [errorMessage, ...prev]);
      addMessageToProject(activeProject.id, { actor: 'system', text: `Sorry, I encountered an error while trying to apply a fix.` });
    } finally {
        setIsLoading(false);
    }
  };

  const handleFixAllErrors = async () => {
    if (!activeProject || errors.length === 0) return;

    setIsLoading(true);

    const combinedErrors = errors.join('\n- ');
    const fixPrompt = `
      Multiple errors occurred in the application:
      - ${combinedErrors}
      
      Please analyze the existing files and fix all the bugs causing these errors.
      You must return the complete, corrected code for ALL existing files that need to be changed.
    `;

    try {
      const plan = ["Analyze all reported errors.", "Identify the root causes in the codebase.", "Correct the code in all affected files.", "Ensure the fixes do not introduce new issues."];
      
      const filesToModify = activeProject.files.map(f => f.path);
       const ai = getAiClient();
      const response = await ai.models.generateContent({
        model,
        contents: { parts: [{text: fixPrompt}, ...activeProject.files.map(f => ({text: `File: ${f.path}\n\`\`\`\n${f.code}\n\`\`\``}))] },
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
      const parsed = JSON.parse(response.text);
      const newFiles = parsed.files;
      
      updateProjectState(activeProject.id, { files: newFiles });
      setErrors([]); // Clear all errors on success
      
      addMessageToProject(activeProject.id, { actor: 'system', text: `I've attempted to fix all outstanding errors. Please check the preview.` });
    } catch (err: any) {
      const errorMessage = `AI Error during batch fix attempt: ${err.message}`;
      setErrors(prev => [errorMessage, ...prev]);
      addMessageToProject(activeProject.id, { actor: 'system', text: `Sorry, I encountered an error while trying to fix the errors.` });
    } finally {
        setIsLoading(false);
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
    
  const createNetlifyDeploymentPackage = async (files: ProjectFile[]): Promise<Blob> => {
    const zip = new JSZip();

    // Transpile TSX/JS files to JS with ES modules and update import paths
    const transpiledFiles: ProjectFile[] = [];
    for (const file of files) {
      if (file.path.match(/\.(tsx|ts|jsx|js)$/)) {
        try {
          // Keep ES modules, don't transform to commonjs
          const transformedCode = Babel.transform(file.code, {
            presets: ['typescript', ['react', { runtime: 'classic' }]],
            filename: file.path,
          }).code;

          // Replace .tsx, .ts, .jsx extensions in relative imports with .js
          const codeWithJsImports = transformedCode.replace(
            /(from\s+['"]\..+)\.(tsx|ts|jsx)(['"])/g,
            '$1.js$3'
          );
          
          transpiledFiles.push({
            path: file.path.replace(/\.(tsx|ts|jsx)$/, '.js'),
            code: codeWithJsImports,
          });

        } catch (e: any) {
          console.error(`Babel compilation failed for ${file.path}:`, e);
          throw new Error(`Failed to transpile ${file.path}. Error: ${e.message}. Please check for syntax errors in your code.`);
        }
      } else {
        // Add other files (like CSS, images, etc.) to the package as-is
        transpiledFiles.push(file);
      }
    }

    const productionHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Silo Build App</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
          <style> body { background-color: #ffffff; } </style>
          <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@18.2.0",
              "react-dom/client": "https://esm.sh/react-dom@18.2.0/client"
            }
          }
          </script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/App.js"></script>
        </body>
      </html>
    `;
    zip.file('index.html', productionHtml);

    transpiledFiles.forEach(file => {
      zip.file(file.path, file.code);
    });

    return zip.generateAsync({ type: 'blob' });
  };

  const createVercelDeploymentPackage = (projectName: string, files: ProjectFile[]): { file: string, data: string }[] => {
    const deploymentFiles: { file: string, data: string }[] = [];

    // 1. Add user's source files
    files.forEach(file => {
        deploymentFiles.push({ file: file.path, data: file.code });
    });

    // 2. Add package.json
    const packageJson = {
      name: projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      version: "1.0.0",
      private: true,
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0"
      },
      devDependencies: {
        "@babel/cli": "^7.24.1",
        "@babel/core": "^7.24.4",
        "@babel/preset-env": "^7.24.4",
        "@babel/preset-react": "^7.24.1",
        "@babel/preset-typescript": "^7.24.1",
        "babel-plugin-add-import-extension": "^1.6.0"
      },
      scripts: {
        "build": "babel src --out-dir dist/src --extensions '.ts,.tsx,.js,.jsx' --copy-files && cp index.html dist/index.html"
      }
    };
    deploymentFiles.push({ file: 'package.json', data: JSON.stringify(packageJson, null, 2) });
    
    // 3. Add .babelrc.json
    const babelrc = {
        "presets": [
            "@babel/preset-env",
            ["@babel/preset-react", { "runtime": "classic" }],
            "@babel/preset-typescript"
        ],
        "plugins": [
            ["babel-plugin-add-import-extension", { "extension": "js" }]
        ]
    };
    deploymentFiles.push({ file: '.babelrc.json', data: JSON.stringify(babelrc, null, 2) });

    // 4. Add vercel.json
    const vercelConfig = {
      "builds": [
        {
          "src": "package.json",
          "use": "@vercel/static-build",
          "config": { "distDir": "dist" }
        }
      ],
      "routes": [{ "src": "/(.*)", "dest": "/index.html" }]
    };
    deploymentFiles.push({ file: 'vercel.json', data: JSON.stringify(vercelConfig, null, 2) });

    // 5. Add index.html (the build target)
    const productionHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${projectName}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
          <style> body { background-color: #ffffff; } </style>
          <script type="importmap">
          {
            "imports": {
              "react": "https://esm.sh/react@18.2.0",
              "react-dom/client": "https://esm.sh/react-dom@18.2.0/client"
            }
          }
          </script>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/App.js"></script>
        </body>
      </html>
    `;
    deploymentFiles.push({ file: 'index.html', data: productionHtml });

    return deploymentFiles;
};
  
  const handleNetlifyPublish = async () => {
    if (!activeProject) return;

    const token = localStorage.getItem('silo_netlify_token');
    if (!token) {
      setPublishState({ status: 'error', error: 'Netlify token not found. Please add it on the Settings page.' });
      return;
    }

    try {
      setPublishState({ status: 'packaging', platform: 'netlify' });
      const zipBlob = await createNetlifyDeploymentPackage(activeProject.files);

      let siteId = activeProject.netlifySiteId;

      if (!siteId) {
        setPublishState({ status: 'creating_site', platform: 'netlify' });
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

      setPublishState({ status: 'uploading', platform: 'netlify' });
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

      setPublishState({ status: 'building', platform: 'netlify' });
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
      setPublishState({ status: 'success', url: finalUrl, platform: 'netlify' });
      updateProjectState(activeProject.id, { netlifyUrl: finalUrl });
    } catch (err: any) {
      console.error("Publishing error:", err);
      setPublishState({ status: 'error', error: err.message, platform: 'netlify' });
    }
  };

  const handleVercelPublish = async () => {
    if (!activeProject) return;
    const token = localStorage.getItem('silo_vercel_token');
    if (!token) {
        setPublishState({ status: 'error', error: 'Vercel token not found. Please add it on the Settings page.', platform: 'vercel' });
        return;
    }

    try {
        setPublishState({ status: 'packaging', platform: 'vercel' });
        const deploymentFiles = createVercelDeploymentPackage(activeProject.name, activeProject.files);

        const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
        const deployPayload: any = {
            name: activeProject.name.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').substring(0, 100),
            files: deploymentFiles,
            target: 'production',
            projectId: activeProject.vercelProjectId,
        };

        setPublishState({ status: 'uploading', platform: 'vercel' });
        
        let apiUrl = 'https://api.vercel.com/v13/deployments';
        // If it's a new project (no projectId yet), add the query parameter to skip auto-detection confirmation.
        if (!activeProject.vercelProjectId) {
            apiUrl += '?skipAutoDetectionConfirmation=1';
        }
        
        const deployResponse = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(deployPayload),
        });

        if (!deployResponse.ok) {
            const errorData = await deployResponse.json();
            throw new Error(`Vercel API Error: ${errorData.error.message}`);
        }
        const deployData = await deployResponse.json();

        if (!activeProject.vercelProjectId && deployData.projectId) {
            updateProjectState(activeProject.id, { vercelProjectId: deployData.projectId });
        }

        setPublishState({ status: 'building', platform: 'vercel' });
        const pollDeploy = async (): Promise<string> => {
            const statusResponse = await fetch(`https://api.vercel.com/v13/deployments/${deployData.id}`, { headers });
            if (!statusResponse.ok) throw new Error('Failed to poll Vercel deploy status.');
            const statusData = await statusResponse.json();

            if (statusData.readyState === 'READY') return `https://${statusData.url}`;
            if (['ERROR', 'CANCELED'].includes(statusData.readyState)) throw new Error(`Vercel build failed: ${statusData.errorMessage || 'Unknown error'}`);
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            return pollDeploy();
        };

        const finalUrl = await pollDeploy();
        setPublishState({ status: 'success', url: finalUrl, platform: 'vercel' });
        updateProjectState(activeProject.id, { vercelUrl: finalUrl });
    } catch (err: any) {
        console.error("Vercel publishing error:", err);
        setPublishState({ status: 'error', error: err.message, platform: 'vercel' });
    }
  };

  const handlePublish = (platform: 'netlify' | 'vercel') => {
      if (platform === 'netlify') {
        handleNetlifyPublish();
      } else {
        handleVercelPublish();
      }
  };

  const handleAppStoreSubmit = (data: AppStoreSubmissionData) => {
    if (!activeProject) return;
    console.log("Simulating App Store Submission with data:", data);

    setAppStorePublishState({ status: 'building' });

    // Simulate a more realistic, multi-step process
    setTimeout(() => {
      setAppStorePublishState({ status: 'uploading' });
      setTimeout(() => {
        setAppStorePublishState({ status: 'submitting' });
        setTimeout(() => {
          const newSubmission: AppStoreSubmission = {
            status: 'Submitted',
            version: data.version,
            submissionDate: Date.now(),
            url: 'https://appstoreconnect.apple.com/apps' // Dummy URL
          };
          updateProjectState(activeProject.id, { appStoreSubmission: newSubmission });
          setAppStorePublishState({ status: 'success', url: newSubmission.url });
        }, 2500);
      }, 2500);
    }, 2500);
  };

  const handleExportProject = async () => {
    if (!activeProject) return;

    try {
        const zip = new JSZip();
        const projectName = activeProject.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        // 1. Add user's source files
        activeProject.files.forEach(file => {
            zip.file(file.path, file.code);
        });
        
        // 2. Add package.json
        const packageJson = {
            name: projectName,
            version: "1.0.0",
            main: "index.js",
            scripts: {
                "start": "expo start",
                "android": "expo start --android",
                "ios": "expo start --ios",
                "web": "expo start --web",
                "submit": "eas submit -p ios"
            },
            dependencies: {
                "expo": "~51.0.8",
                "expo-status-bar": "~1.12.1",
                "react": "18.2.0",
                "react-native": "0.74.1"
            },
            devDependencies: {
                "@babel/core": "^7.20.0"
            },
            private: true
        };
        zip.file('package.json', JSON.stringify(packageJson, null, 2));
        
        // 3. Add app.json (Expo Config)
        const appJson = {
            "expo": {
                "name": activeProject.name,
                "slug": projectName,
                "version": "1.0.0",
                "orientation": "portrait",
                "icon": "./assets/icon.png",
                "userInterfaceStyle": "light",
                "splash": {
                    "image": "./assets/splash.png",
                    "resizeMode": "contain",
                    "backgroundColor": "#ffffff"
                },
                "ios": {
                    "supportsTablet": true
                },
                "android": {
                    "adaptiveIcon": {
                        "foregroundImage": "./assets/adaptive-icon.png",
                        "backgroundColor": "#ffffff"
                    }
                },
                "web": {
                    "favicon": "./assets/favicon.png"
                }
            }
        };
        zip.file('app.json', JSON.stringify(appJson, null, 2));

        // 4. Add README.md with instructions
        const readmeContent = `
# ${activeProject.name}

This project was generated by Silo Build. It's a React Native application configured for submission to the App Store using Expo Application Services (EAS).

## How to Submit to the App Store

Follow these steps to build your app and submit it for review.

### Prerequisites

1.  **Node.js & npm:** Make sure you have Node.js (LTS version) and npm installed. [Download here](https://nodejs.org/).
2.  **EAS CLI:** Install the Expo Application Services command-line tool.
    \`\`\`bash
    npm install -g eas-cli
    \`\`\`
3.  **Apple Developer Account:** You need an active membership in the [Apple Developer Program](https://developer.apple.com/programs/enroll/).
4.  **Expo Account:** Create a free account at [expo.dev](https://expo.dev/).

### Setup & Submission

1.  **Unzip & Install Dependencies:**
    Unzip this project folder and navigate into it with your terminal. Then, install the required packages.
    \`\`\`bash
    cd ${projectName}
    npm install
    \`\`\`

2.  **Log in to your accounts:**
    Log in to your Expo account and your Apple Developer account.
    \`\`\`bash
    eas login
    # You will be prompted for your Expo username/password.
    
    eas device:create
    # Follow prompts to register your physical device if needed for testing.
    \`\`\`

3.  **Start the Submission Process:**
    Run the EAS submit command. This will build your app on Expo's servers, and then guide you through the submission to App Store Connect.
    \`\`\`bash
    eas submit -p ios
    \`\`\`
    The CLI will ask for your Apple ID and password. It may also ask if you want EAS to handle creating certificates and provisioning profiles. It's recommended to let EAS manage this for you.

4.  **Wait for the Build:**
    The build process can take some time. You can monitor its progress in the link provided in your terminal.

5.  **Complete Submission in App Store Connect:**
    Once the build is complete, EAS will upload it to App Store Connect. You may need to visit the [App Store Connect website](https://appstoreconnect.apple.com/) to add screenshots, descriptions, and other metadata before you can finally "Submit for Review".

Good luck!
`;
        zip.file('README.md', readmeContent);

        // 5. Generate and download the zip
        const blob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${projectName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blob);
    } catch (err: any) {
        console.error("Failed to export project:", err);
        setErrors(prev => [`Failed to create project ZIP. ${err.message}`, ...prev]);
    }
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleToggleNotifications = () => {
      setIsNotificationsOpen(prev => {
          const newIsOpen = !prev;
          // If we are opening the panel, mark all as read
          if (newIsOpen) {
              setNotifications(prevNotifications => {
                  const allRead = prevNotifications.map(n => ({ ...n, read: true }));
                  const newReadStatuses: Record<string, boolean> = {};
                  allRead.forEach(n => {
                      newReadStatuses[n.id] = true;
                  });
                  localStorage.setItem('silo_read_notifications', JSON.stringify(newReadStatuses));
                  return allRead;
              });
          }
          return newIsOpen;
      });
  };

  // --- MAX AGENT LOGIC ---

  const moveCursorToElement = (selector: string) => new Promise<void>((resolve) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) {
      console.warn(`Max agent couldn't find element: ${selector}`);
      return resolve();
    }
    const rect = element.getBoundingClientRect();
    const target = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    
    // A simple animation loop
    const start = maxCursorPosition || { x: window.innerWidth - 160, y: 80 };
    const duration = 500;
    let startTime: number | null = null;

    const animate = (time: number) => {
      if (startTime === null) startTime = time;
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const newX = start.x + (target.x - start.x) * progress;
      const newY = start.y + (target.y - start.y) * progress;

      setMaxCursorPosition({ x: newX, y: newY });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(animate);
  });
  
  const typePrompt = (text: string) => new Promise<void>((resolve) => {
    let i = 0;
    setUserInput('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setUserInput(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(interval);
        resolve();
      }
    }, 50); // Typing speed
  });

  const clickWithCursor = (selector: string) => new Promise<void>((resolve) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return resolve();

    setIsMaxCursorClicking(true);
    setTimeout(() => {
        setIsMaxCursorClicking(false);
        element.click(); // This will trigger handleSend
        resolve();
    }, 200);
  });

  const generateNextAgentPrompt = async (): Promise<string> => {
      if (!activeProject) return "Make a simple counter app";
      const ai = getAiClient();
      const currentFiles = activeProject.files || [];
      const currentMessages = activeProject.messages || [];
      
      const systemInstruction = `You are an autonomous AI agent building a web application. Your goal is to iteratively add features. Based on the current project files and conversation history, propose the next single, logical feature to add. Formulate your response as a concise, actionable instruction for another AI developer. Respond with only the prompt text, no extra formatting or explanation. Be creative and aim for a functional, impressive application.`;
      
      const promptToGemini = `
          Current Files (abbreviated):
          ${JSON.stringify(currentFiles.map(f => ({ path: f.path, code: f.code.substring(0, 200) + '...' })), null, 2)}

          Conversation History (last 5 messages):
          ${JSON.stringify(currentMessages.slice(-5), null, 2)}

          What is the next logical prompt to continue building this app?
      `;

      try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: promptToGemini,
            config: {
              systemInstruction: systemInstruction,
            }
          });
          return response.text.trim();
      } catch (err: any) {
          console.error("Max Agent failed to generate a prompt:", err);
          addMaxThought(`I encountered an error thinking: ${err.message}. Deactivating.`);
          setIsMaxAgentRunning(false);
          return "Create a simple counter component."; // Fallback
      }
  };
  
  const runAgentCycle = useCallback(async () => {
    addMaxThought("Brainstorming next steps...");
    const newPrompt = await generateNextAgentPrompt();
    addMaxThought(`New idea: ${newPrompt}`);
    await new Promise(r => setTimeout(r, 500));
    
    await moveCursorToElement('#prompt-input');
    await typePrompt(newPrompt);
    await new Promise(r => setTimeout(r, 300));

    await moveCursorToElement('#send-button');
    await clickWithCursor('#send-button');
    addMaxThought("Prompt sent. Waiting for the build to complete...");
  }, [activeProject]);

  useEffect(() => {
    const processAgentQueue = async () => {
        if (isAgentProcessing.current || !isMaxAgentRunning || agentTaskQueue.current.length === 0) {
            return;
        }
        isAgentProcessing.current = true;
        const nextTask = agentTaskQueue.current.shift();
        if (nextTask) {
            await nextTask();
        }
        isAgentProcessing.current = false;
    };

    const intervalId = setInterval(processAgentQueue, 200);

    return () => clearInterval(intervalId);
  }, [isMaxAgentRunning]);
  
  useEffect(() => {
    // This effect triggers the agent's next cycle after a build is complete.
    if (isMaxAgentRunning && !isLoading && !isAgentProcessing.current && agentTaskQueue.current.length === 0) {
        addMaxThought("Build complete. Analyzing the results...");
        agentTaskQueue.current.push(runAgentCycle);
    }
  }, [isMaxAgentRunning, isLoading, runAgentCycle]);

  const startAgent = () => {
      setMaxThoughts([]);
      addMaxThought("Max is activated. Let's build something amazing.");
      setIsMaxAgentRunning(true);
      setMaxCursorPosition({ x: window.innerWidth - 160, y: 80 });
      agentTaskQueue.current.push(runAgentCycle);
  };
  
  const stopAgent = () => {
      setIsMaxAgentRunning(false);
      addMaxThought("Max has been deactivated.");
      agentTaskQueue.current = [];
      setMaxCursorPosition(null);
  };

  // --- END MAX AGENT LOGIC ---

  const renderContent = () => {
    const path = location.startsWith('/') ? location : `/${location}`;

    if (path === '/home' || path === '/') {
      return <HomePage onStartBuild={createNewProject} isLoading={isLoading} defaultStack={defaultStack} />;
    }
    if (path === '/profile') {
      return <ProfilePage 
        projects={projects} 
        onSelectProject={handleSelectProject} 
        onDeleteProject={handleDeleteProject}
        userProfile={userProfile}
        onProfileUpdate={handleProfileUpdate}
      />;
    }
    if (path === '/settings') {
      return (
        <SettingsPage 
          selectedModel={model} 
          onModelChange={handleModelChange}
          defaultStack={defaultStack}
          onDefaultStackChange={handleSetDefaultStack}
          supabaseConfig={supabaseConfig}
          onSupabaseAuthorize={handleSupabaseAuthorize}
          onSupabaseManualConnect={handleManualSupabaseConnect}
          onSupabaseDisconnect={handleSupabaseDisconnect}
          isLoading={isLoading}
          previewMode={previewMode}
          onPreviewModeChange={handlePreviewModeChange}
          apiKeyHandling={apiKeyHandling}
          onApiKeyHandlingChange={handleApiKeyHandlingChange}
          apiSecrets={apiSecrets}
          onApiSecretsChange={setApiSecrets}
        />
      );
    }
    if (path === '/pricing') {
      return <PricingPage />;
    }
    if (path === '/docs') {
      return <DocsPage />;
    }
    if (path === '/news/real-time-code-gen') {
        return <ArticlePage />;
    }
     if (path === '/integrations') {
      return <IntegrationsPage />;
    }
    if (path === '/developer-portal') {
      return <DeveloperPortalPage />;
    }
    if (path === '/privacy') {
        return <PrivacyPolicyPage />;
    }
    if (path === '/terms') {
        return <TermsOfServicePage />;
    }
     if (path === '/authorized') {
      return <AuthorizedPage />;
    }

    const projectMatch = path.match(/^\/project\/([\w-]+)$/);
    if (projectMatch && activeProject) {
      return (
        <>
          <main className="flex flex-1 overflow-hidden pt-20">
            <div className="w-1/3 max-w-md flex-col border-r border-gray-200 hidden md:flex">
              <ChatPanel
                messages={activeProject.messages}
                userInput={userInput}
                onUserInput={setUserInput}
                onSend={handleSend}
                isLoading={isLoading}
                onToggleMaxAgent={() => setIsMaxAgentPanelOpen(p => !p)}
              />
            </div>
            <div className="flex-1 flex flex-col">
              <Workspace
                project={activeProject}
                onRuntimeError={handleRuntimeError}
                isSupabaseConnected={!!supabaseConfig}
                previewMode={previewMode}
                onPublish={() => {
                    setPublishState({ status: 'idle' });
                    setIsPublishModalOpen(true)
                }}
                onCommit={handleCommit}
                onInitiateGitHubSave={() => setIsGitHubSaveModalOpen(true)}
                onExportProject={handleExportProject}
                isLoading={isLoading}
              />
            </div>
             {isMaxAgentPanelOpen && (
              <div className="hidden md:block">
                <MaxAgentPanel
                  thoughts={maxThoughts}
                  isRunning={isMaxAgentRunning}
                  onStart={startAgent}
                  onStop={stopAgent}
                />
              </div>
            )}
          </main>
          <ErrorDisplay error={errors[0] || null} onClose={() => setErrors(prev => prev.slice(1))} />
            <DebugAssistPanel
                isOpen={isDebugAssistOpen}
                onClose={() => setIsDebugAssistOpen(false)}
                errors={errors}
                onFixError={handleFixError}
                onFixAllErrors={handleFixAllErrors}
                isLoading={isLoading}
            />
        </>
      );
    }
     if (projectMatch && !activeProject && projects.length > 0) {
       return (
           <div className="flex flex-col items-center justify-center h-full p-8 text-center pt-20 text-gray-800">
              <h1 className="text-4xl font-bold text-gray-700">Loading Project...</h1>
              <p className="text-gray-500 mt-2">If this takes too long, the project might not exist.</p>
          </div>
      );
    }

    return <HomePage onStartBuild={createNewProject} isLoading={isLoading} defaultStack={defaultStack} />;
  };

  const isNetlifyConfigured = !!(typeof window !== 'undefined' && localStorage.getItem('silo_netlify_token'));
  const isVercelConfigured = !!(typeof window !== 'undefined' && localStorage.getItem('silo_vercel_token'));

  const path = location.startsWith('/') ? location : `/${location}`;
  const isDarkPage = path === '/profile';

  return (
    <div className="flex h-screen text-black font-sans">
      <TopNavBar 
        userProfile={userProfile}
        theme={isDarkPage ? 'dark' : 'light'}
        unreadCount={unreadCount}
        onToggleNotifications={handleToggleNotifications}
      />
      <NotificationsPanel
        isOpen={isNotificationsOpen}
        notifications={notifications}
        onClose={() => setIsNotificationsOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
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
        onPublishToWeb={handlePublish}
        onInitiateAppStorePublish={() => {
            setIsPublishModalOpen(false);
            setAppStorePublishState({ status: 'idle' });
            setIsAppStorePublishModalOpen(true);
        }}
        publishState={publishState}
        projectName={activeProject?.name || ''}
        isRedeploy={!!activeProject?.netlifySiteId || !!activeProject?.vercelProjectId}
        isNetlifyConfigured={isNetlifyConfigured}
        isVercelConfigured={isVercelConfigured}
        projectUrls={{
            netlify: activeProject?.netlifyUrl,
            vercel: activeProject?.vercelUrl,
        }}
        appStoreStatus={activeProject?.appStoreSubmission?.status}
      />
      <GitHubSaveModal
        isOpen={isGitHubSaveModalOpen}
        onClose={() => setIsGitHubSaveModalOpen(false)}
        onSave={handleCreateRepoAndPush}
        isLoading={isLoading}
        projectName={activeProject?.name || ''}
      />
      {activeProject && (
        <AppStorePublishModal
            isOpen={isAppStorePublishModalOpen}
            onClose={() => setIsAppStorePublishModalOpen(false)}
            onSubmit={handleAppStoreSubmit}
            publishState={appStorePublishState}
            projectName={activeProject.name}
        />
      )}
      <FocusTimer isOpen={isFocusTimerOpen} onClose={() => setIsFocusTimerOpen(false)} />
      <MaxCursor position={maxCursorPosition} isClicking={isMaxCursorClicking} />
      <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end space-y-4">
        {activeProject && (
          <>
            <button
                onClick={() => setIsFocusTimerOpen(true)}
                title="Open Focus Timer"
                className="w-14 h-14 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-gray-200"
            >
                <span className="material-symbols-outlined">timer</span>
            </button>
            <button
                onClick={() => setIsDebugAssistOpen(true)}
                title="Open Debug Assist"
                className="w-14 h-14 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center border border-gray-200"
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
          </>
        )}
      </div>
    </div>
  );
};

export default App;