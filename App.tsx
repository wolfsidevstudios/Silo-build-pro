
import React, { useState, useEffect, useCallback } from 'react';
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

const App: React.FC = () => {
  const [errors, setErrors] = useState<string[]>([]);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [location, setLocation] = useState(window.location.hash.replace(/^#/, '') || '/home');
  const [model, setModel] = useState<GeminiModel>('gemini-2.5-flash');
  const [defaultStack, setDefaultStack] = useState<ProjectType>('multi');
  const [progress, setProgress] = useState<number | null>(null);
  // Default to service-worker mode for better reliability and performance.
  const [previewMode, setPreviewMode] = useState<PreviewMode>('service-worker');
  
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig | null>(null);
  const [tempSupabaseToken, setTempSupabaseToken] = useState<string | null>(null);
  const [isProjectSelectorOpen, setIsProjectSelectorOpen] = useState(false);
  const [isDebugAssistOpen, setIsDebugAssistOpen] = useState(false);
  
  const [projectToBuild, setProjectToBuild] = useState<{projectId: string, prompt: string, projectType: ProjectType} | null>(null);
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


  const activeProject = projects.find(p => p.id === activeProjectId);

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
      const savedApiSecrets = localStorage.getItem('silo_api_secrets');
      if (savedApiSecrets) {
        setApiSecrets(JSON.parse(savedApiSecrets));
      }
      const savedUserProfile = localStorage.getItem('silo_user_profile');
      if (savedUserProfile) {
        setUserProfile(JSON.parse(savedUserProfile));
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
          await runBuildProcess(prompt, [], projectId, projectType, true);
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

  const generatePlan = async (prompt: string, selectedModel: GeminiModel, projectType: ProjectType): Promise<{plan: string[], sql: string, files_to_generate: string[]}> => {
    const ai = getAiClient();

    let projectConstraints = '';
    if (projectType === 'single') {
        projectConstraints = `\n**CRITICAL CONSTRAINT:** This is a single-file React project. You MUST only generate one file: 'src/App.tsx'. The "files_to_generate" array in your response MUST contain only this single path.`;
    } else if (projectType === 'html') {
        projectConstraints = `\n**CRITICAL CONSTRAINT:** This is a vanilla HTML/CSS/JS project. You MUST generate three files: 'index.html', 'style.css', and 'script.js'. The "files_to_generate" array in your response MUST contain exactly these three paths. Do not generate any other files. No SQL database is needed.`;
    }

    const planPrompt = `
      You are a senior software architect. Your task is to create a plan to build a web application based on the user's request.

      **Instructions:**
      1.  Create a concise, step-by-step plan for the implementation.
      2.  List all the file paths you intend to create or modify. This list should be comprehensive.
      3.  If the application requires data persistence (and is a React project), you MUST provide the complete SQL schema for the database. This schema should be standard SQL.
      4.  If the project is connected to Supabase (${!!supabaseConfig}), generate SQL that is compatible with PostgreSQL.
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
    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: planPrompt,
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

  const generateCode = async (prompt: string, currentFiles: ProjectFile[], plan: string[], filesToGenerate: string[], selectedModel: GeminiModel, projectType: ProjectType) => {
    const ai = getAiClient();
    const supabaseIntegrationPrompt = supabaseConfig ? `
      **Supabase Integration:**
      - This project is connected to a Supabase backend.
      - Supabase Project URL: "${supabaseConfig.url}"
      - Supabase Anon Key: "${supabaseConfig.anonKey}"
      - You MUST use the '@supabase/supabase-js' library. The library is already loaded in the environment. You can access it via the global \`supabase\` object.
      - Initialize the client like this: \`const supabaseClient = supabase.createClient("${supabaseConfig.url}", "${supabaseConfig.anonKey}");\`
    ` : '';
    
    const customSqlPrompt = currentFiles.some(f => f.path === 'app.sql') && !supabaseConfig ? `
      **Custom Backend:**
      - An \`app.sql\` file exists, which defines the database schema for the application.
      - You MUST assume a backend API exists that can interact with this database.
      - Your task is to write frontend code that makes \`fetch\` requests to hypothetical API endpoints that would logically correspond to the schema (e.g., \`/api/users\`, \`/api/items\`).
      - You MUST NOT implement the backend server itself. Focus only on the frontend React code that consumes these imagined APIs.
    ` : '';

    const apiSecretsPrompt = apiSecrets.length > 0 ? `
      **API Secrets:**
      - The user has provided the following API secrets. You MUST use these in the code when an external API key is required (e.g., for another AI service, a database, etc.).
      - IMPORTANT: Do not display these secrets directly in the UI. When initializing clients or making API calls, use the provided value for the corresponding key.
      - Available secrets:
${apiSecrets.map(s => `      - ${s.key}: "${s.value}"`).join('\n')}
    ` : '';
    
    const productHuntToken = localStorage.getItem('silo_product_hunt_token');
    const productHuntApiPrompt = productHuntToken ? `
      **Product Hunt API Integration:**
      - The user has provided a Product Hunt Developer Token. If the user's request involves fetching data from Product Hunt (e.g., "show latest products"), you MUST use this API.
      - Developer Token: "${productHuntToken}"
      - You MUST use this token to interact with the Product Hunt API v2 (GraphQL).
      - The API endpoint is: \`https://api.producthunt.com/v2/api/graphql\`.
      - When making requests, include the token in the 'Authorization' header like this: \`Authorization: Bearer ${productHuntToken}\`.
      - Example GraphQL query using fetch to get the top 10 posts:
        \`\`\`javascript
        const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ${productHuntToken}',
          },
          body: JSON.stringify({
            query: \`
              query GetLatestPosts {
                posts(first: 10) {
                  edges {
                    node {
                      id
                      name
                      tagline
                      url
                      thumbnail {
                        url
                      }
                      votesCount
                    }
                  }
                }
              }
            \`
          }),
        });
        const productHuntData = await response.json();
        // Now you can use productHuntData.data.posts.edges to display the products
        \`\`\`
    ` : '';
    
    let projectTypeInstructions = '';
    switch (projectType) {
        case 'single':
            projectTypeInstructions = `
                **Project Type:** Single File (React)
                **Constraint:** You MUST generate all code within a single file: 'src/App.tsx'. Do not create any other files or components. All logic, components, and styles must be contained within this one file. The final output MUST have only one file object in the "files" array.
            `;
            break;
        case 'multi':
            projectTypeInstructions = `
                **Project Type:** Multi-File (React)
                **Guideline:** You MUST break down the application into logical, reusable components, each in its own file (e.g., 'src/components/Button.tsx'). Follow a clean, modular file structure. Do not put everything in a single file unless it is a very simple component.
            `;
            break;
        case 'html':
            projectTypeInstructions = `
                **Project Type:** Vanilla HTML/CSS/JS
                **Constraint:** You MUST generate a standard, static web project with three files: 'index.html', 'style.css', and 'script.js'.
                - **index.html:** Must contain the full HTML structure. It MUST link to the other two files correctly, like this: \`<link rel="stylesheet" href="style.css">\` in the <head>, and \`<script src="script.js" defer></script>\` before the closing </body> tag. It MUST also include the Google Material Symbols font stylesheet in the <head>: \`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />\`.
                - **style.css:** Must contain all the CSS styles.
                - **script.js:** Must contain all the JavaScript logic.
                **Design System & UI Guidelines:**
                - **Overall Style:** Create modern, clean, and aesthetically pleasing interfaces.
                - **Background:** The main application background MUST be white. You should set this on the 'body' element in 'style.css'.
                - **Buttons:** All buttons MUST be pill-shaped (fully rounded corners, e.g., \`border-radius: 9999px;\`). Primary call-to-action buttons should be solid black with white text. Secondary buttons should be outlined with a thin black border.
                - **Icons:** You MUST use icons from the Google Material Symbols library (the 'outlined' style). The font is already linked in the HTML. Example usage in HTML: \`<span class="material-symbols-outlined">icon_name</span>\`.
                - **Navigation Bars:** If a navigation bar is needed, it should be pill-shaped, floating, and have a frosted glass effect (e.g., using \`background-color: rgba(255, 255, 255, 0.5);\` and \`backdrop-filter: blur(10px);\`).
                **CRITICAL RULE:** DO NOT use React, JSX, TSX, or any frameworks. Write plain HTML, CSS, and JavaScript. DO NOT use Tailwind CSS; write standard CSS rules. The final output MUST have exactly three file objects in the "files" array for these files.
            `;
            break;
    }

    const reactStylingGuidelines = `
      **Design System & UI Guidelines (for React Projects):**
      - **Overall Style:** Create modern, clean, and aesthetically pleasing interfaces.
      - **Background:** The main application background MUST be white.
      - **Buttons:** All buttons MUST be pill-shaped (fully rounded corners). Primary call-to-action buttons should be solid black with white text. Secondary buttons should be outlined with a thin border.
      - **Icons:** You MUST use icons from the Google Material Symbols library (the 'outlined' style). The library is already available. Example: \`<span className="material-symbols-outlined">icon_name</span>\`.
      - **Navigation Bars:** If a navigation bar or header is requested or necessary for the application's functionality, it should be pill-shaped, floating, and have a frosted glass effect (using Tailwind CSS for backdrop blur and semi-transparent backgrounds, e.g., \`bg-white/50 backdrop-blur-md\`). Do not add a navigation bar unless it is explicitly requested or is essential for the app's core features.
      - **Styling:** You MUST use Tailwind CSS for all styling. Do not generate a \`tailwind.config.js\` file; all necessary classes are available via the CDN.
      - **CRITICAL STYLING RULE:** You MUST NOT generate any CSS files (e.g., 'App.css', 'index.css'). You MUST NOT include any CSS import statements in your TSX/JS files (e.g., \`import './App.css'\`). All styling MUST be done exclusively with Tailwind CSS classes applied directly to the JSX elements.
    `;

     const reactFileRules = `
      **File Generation Rules (for React Projects):**
      - Your output MUST be a JSON object containing a single key "files", which is an array of file objects.
      - Each file object must have two keys: "path" (e.g., "src/App.tsx", "src/components/Button.tsx") and "code" (the full file content as a string).
      - You MUST provide the full code for ALL files specified in the "Files to Generate" section above. Do not omit files.
      - The main application component that should be rendered MUST be the default export of "src/App.tsx".
      - Do NOT generate an \`index.html\`, \`public/index.html\`, \`main.tsx\`, or any other entry-point HTML or JS file. The preview environment handles this automatically. Focus only on creating React components and related modules inside the \`src/\` directory.
      - Use ES Modules for imports/exports. Crucially, you MUST include the full file extension in your import paths (e.g., \`import Button from './components/Button.tsx'\`). This is required for the in-browser module resolver to work.
     `;

    const fullPrompt = `
      You are an expert web developer. Your task is to generate the complete code for a set of specified files based on the user's request, a plan, and the current file structure.

      **CRITICAL INSTRUCTION:** You MUST generate code for EVERY file listed below. Do not add, omit, or rename any files from this list. The "files" array in your JSON response must contain an entry for each and every one of these paths.
      
      **Files to Generate:**
      ${JSON.stringify(filesToGenerate)}

      ${projectTypeInstructions}

      ${projectType !== 'html' ? reactStylingGuidelines : ''}
      
      ${projectType !== 'html' ? reactFileRules : ''}

      ${supabaseIntegrationPrompt}
      ${customSqlPrompt}
      ${productHuntApiPrompt}
      ${apiSecretsPrompt}
      
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

  const runBuildProcess = async (prompt: string, baseFiles: ProjectFile[], projectId: string, projectTypeOverride?: ProjectType, isInitialBuild: boolean = false) => {
    setIsLoading(true);
    setErrors([]);

    addMessageToProject(projectId, { actor: 'user', text: prompt });
    
    const project = projects.find(p => p.id === projectId);
    const projectType = projectTypeOverride || project?.projectType || 'multi';

    const { plan, sql, files_to_generate } = await generatePlan(prompt, model, projectType);
    
    // FIX: Ensure src/App.tsx is always in the list for React projects.
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
    
    let filesForCodeGeneration = project?.files ? [...project.files] : [...baseFiles];
    if (sql) {
      const sqlFileIndex = filesForCodeGeneration.findIndex(f => f.path === 'app.sql');
      if (sqlFileIndex > -1) {
        filesForCodeGeneration[sqlFileIndex] = { ...filesForCodeGeneration[sqlFileIndex], code: sql };
      } else {
        filesForCodeGeneration.push({ path: 'app.sql', code: sql });
      }
    } else {
      // If no SQL is returned, remove any existing app.sql
      filesForCodeGeneration = filesForCodeGeneration.filter(f => f.path !== 'app.sql');
    }
    // Update the project state immediately so the change is reflected and passed to generateCode
    updateProjectState(projectId, { files: filesForCodeGeneration });

    setProgress(0);
    const codePromise = generateCode(prompt, filesForCodeGeneration, plan, files_to_generate, model, projectType);

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

    const newFiles: ProjectFile[] = await codePromise;
    clearInterval(interval);
    setProgress(null); // Hide progress bar; checklist will show progress now.

    if (projectType === 'html') {
        const expectedFiles = ['index.html', 'style.css', 'script.js'];
        const receivedFiles = newFiles.map(f => f.path);
        if (expectedFiles.some(f => !receivedFiles.includes(f)) || receivedFiles.length !== expectedFiles.length) {
            throw new Error(`The AI failed to generate the required HTML/CSS/JS files. Expected: ${expectedFiles.join(', ')}. Received: ${receivedFiles.join(', ')}. Please try again.`);
        }
    }

    if (isInitialBuild) {
        if (projectType !== 'html' && (!newFiles || !newFiles.some(f => f.path === 'src/App.tsx'))) {
            throw new Error("The AI failed to generate the main 'src/App.tsx' file. The project build has been cancelled to prevent errors. Please try rephrasing your request.");
        }

        const sqlFile = filesForCodeGeneration.find(f => f.path === 'app.sql');
        
        // Start with a clean slate, keeping only the SQL file if it exists
        updateProjectState(projectId, { files: sqlFile ? [sqlFile] : [] });
        await new Promise(resolve => setTimeout(resolve, 50)); // ensure state update propagates

        for (const file of newFiles) {
            setProjects(prev => prev.map(p => {
                if (p.id === projectId) {
                    // Add the new file
                    const updatedFiles = [...p.files, file];

                    // Update the message checklist
                    const messages = [...p.messages];
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage.actor === 'ai' && lastMessage.files_to_generate) {
                        const updatedGeneratedFiles = Array.from(new Set([...(lastMessage.generated_files || []), file.path]));
                        messages[messages.length - 1] = { ...lastMessage, generated_files: updatedGeneratedFiles };
                    }
                    
                    return { ...p, files: updatedFiles, messages };
                }
                return p;
            }));
            await new Promise(resolve => setTimeout(resolve, 150));
        }
    } else {
        for (const file of newFiles) {
            setProjects(prev => prev.map(p => {
                if (p.id === projectId) {
                    // 1. Update project files
                    const existingFileIndex = p.files.findIndex(f => f.path === file.path);
                    const updatedFiles = [...p.files];
                    if (existingFileIndex > -1) {
                        updatedFiles[existingFileIndex] = file;
                    } else {
                        updatedFiles.push(file);
                    }

                    // 2. Update message to mark file as generated
                    const messages = [...p.messages];
                    const lastMessage = messages[messages.length - 1];
                    if (lastMessage.actor === 'ai' && lastMessage.files_to_generate) {
                        const updatedGeneratedFiles = Array.from(new Set([...(lastMessage.generated_files || []), file.path]));
                        messages[messages.length - 1] = { ...lastMessage, generated_files: updatedGeneratedFiles };
                    }
                    
                    return { ...p, files: updatedFiles, messages };
                }
                return p;
            }));
            await new Promise(resolve => setTimeout(resolve, 150)); // small delay for visual effect
        }
    }


    addMessageToProject(projectId, { actor: 'ai', text: 'I have created the code for you. Check it out and let me know what to do next!' });
    
    setIsLoading(false);
  };

  const createNewProject = (prompt: string, projectType: ProjectType) => {
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
    setProgress(0);
    
    const fixPrompt = `
      An error occurred in the application: "${errorToFix}". 
      Please analyze the existing files and fix the bug that is causing this error.
      You must return the complete, corrected code for ALL existing files.
    `;

    try {
      const plan = [`Identify the cause of the error: "${errorToFix}"`, "Correct the code in the appropriate file(s).", "Ensure the application still meets the original requirements."];
      
      const interval = setInterval(() => {
        setProgress(prev => Math.min((prev ?? 0) + 5, 95));
      }, 400);

      const filesToModify = activeProject.files.map(f => f.path);
      const newFiles = await generateCode(fixPrompt, activeProject.files, plan, filesToModify, model, activeProject.projectType);
      
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
        onProfileUpdate={setUserProfile}
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
          apiSecrets={apiSecrets}
          onApiSecretsChange={setApiSecrets}
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
          <main className="flex flex-1 overflow-hidden pt-24">
            <div className="w-1/3 max-w-md flex flex-col border-r border-gray-900 bg-black/50">
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
              />
            </div>
          </main>
          <ErrorDisplay error={errors[0] || null} onClose={() => setErrors(prev => prev.slice(1))} />
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
           <div className="flex flex-col items-center justify-center h-full p-8 text-center pt-20">
              <h1 className="text-4xl font-bold text-gray-400">Loading Project...</h1>
              <p className="text-gray-500 mt-2">If this takes too long, the project might not exist.</p>
          </div>
      );
    }

    return <HomePage onStartBuild={createNewProject} isLoading={isLoading} defaultStack={defaultStack} />;
  };

  const isNetlifyConfigured = !!(typeof window !== 'undefined' && localStorage.getItem('silo_netlify_token'));
  const isVercelConfigured = !!(typeof window !== 'undefined' && localStorage.getItem('silo_vercel_token'));


  return (
    <div className="flex h-screen text-white font-sans bg-cover bg-center" style={{ backgroundImage: 'url(https://iili.io/KvdfcdP.md.png)'}}>
      <TopNavBar currentPath={location} />
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
      <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end space-y-4">
        {activeProject && (
          <>
            <button
                onClick={() => setIsFocusTimerOpen(true)}
                title="Open Focus Timer"
                className="w-14 h-14 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
            >
                <span className="material-symbols-outlined">timer</span>
            </button>
            <button
                onClick={() => setIsDebugAssistOpen(true)}
                title="Open Debug Assist"
                className="w-14 h-14 bg-white text-black rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
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
